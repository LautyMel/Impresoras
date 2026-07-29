"""
Módulo de Sistema de Alertas por Email
=======================================
Evalúa niveles de tóner y estado offline, y envía alertas escalonadas.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import SMTP_SERVER, SMTP_PORT

# Memoria global para evitar spam de correos
# Formato: { clave_identificadora: bool | int | None }
_estado_alertas = {}


def configurar_alertas(secrets):
    """
    Configura el módulo con las credenciales cargadas.
    Las credenciales se pasan desde el orquestador.
    """
    global _correo_remitente, _clave_correo, _correos_destino
    _correo_remitente = secrets.get("correo_remitente", "")
    _clave_correo = secrets.get("clave_correo", "")
    _correos_destino = secrets.get("correos_destino", [])


def _enviar_correo(asunto, mensaje):
    """Envía un correo SMTP usando Gmail."""
    if not _correo_remitente or not _clave_correo or not _correos_destino:
        print(" -> [Email] Credenciales insuficientes. Correo no enviado.")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = _correo_remitente
        msg['To'] = ", ".join(_correos_destino)
        msg['Subject'] = asunto
        msg.attach(MIMEText(mensaje, 'plain', 'utf-8'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(_correo_remitente, _clave_correo)
        server.sendmail(_correo_remitente, _correos_destino, msg.as_string())
        server.quit()

        print(f" 📧 [EMAIL ENVIADO] {asunto}")
    except Exception as e:
        print(f" ❌ [Email Error] No se pudo enviar correo: {e}")


def procesar_alertas(nombre_imp, ip_imp, ubicacion_imp,
                     contador, t_black, t_cyan, t_magenta, t_yellow, es_color):
    """
    Evalúa los estados y envía correos en umbrales escalonados:
    - 15% → Aviso preventivo
    - 10% → Alerta media
    - 5%  → Alerta crítica
    - 0%  → Agotado / Reemplazo inmediato

    Args:
        nombre_imp: Nombre de la impresora
        ip_imp: Dirección IP
        ubicacion_imp: Ubicación física
        contador: "ERROR" si offline, o string numérico
        t_black, t_cyan, t_magenta, t_yellow: Niveles de tóner
        es_color: True si la impresora es a color
    """
    # --- 1. Evaluar estado OFFLINE ---
    clave_offline = f"{nombre_imp}_offline"

    if contador == "ERROR":
        if not _estado_alertas.get(clave_offline, False):
            asunto = f"🚨 ALERTA CRÍTICA: {nombre_imp} - Fuera de Línea"
            mensaje = (
                f"La {nombre_imp} no responde al escaneo SNMP.\n\n"
                f"Detalles del equipo:\n"
                f"- Impresora: {nombre_imp}\n"
                f"- Ubicación: {ubicacion_imp}\n"
                f"- IP: {ip_imp}\n"
                f"- Estado: Fuera de línea / Sin respuesta\n\n"
                f"Por favor acudir a '{ubicacion_imp}' para revisar."
            )
            print(f" ⚠️ ALERTA: {nombre_imp} offline. Enviando mail...")
            _enviar_correo(asunto, mensaje)
            _estado_alertas[clave_offline] = True
        return  # Si está offline, no evaluamos tóners

    # Si vuelve a estar online
    if _estado_alertas.get(clave_offline, False):
        print(f" ✅ {nombre_imp} volvió a estar en línea.")
        _estado_alertas[clave_offline] = False

    # --- 2. Evaluar tóners escalonados ---
    toners = [("Negro", t_black)]
    if es_color:
        toners.extend([
            ("Cian", t_cyan),
            ("Magenta", t_magenta),
            ("Amarillo", t_yellow)
        ])

    for color, nivel in toners:
        clave_toner = f"{nombre_imp}_toner_{color}"
        valor_num = _extraer_porcentaje(nivel)

        if valor_num is None:
            continue

        ultimo_umbral = _estado_alertas.get(clave_toner, None)
        umbral_actual = _determinar_umbral(valor_num)

        if umbral_actual is not None:
            if ultimo_umbral is None or umbral_actual < ultimo_umbral:
                asunto, prioridad = _generar_alerta_toner(nombre_imp, color, valor_num, umbral_actual)
                mensaje = (
                    f"Notificación de nivel de insumo.\n\n"
                    f"Detalles del equipo:\n"
                    f"- Impresora: {nombre_imp}\n"
                    f"- Ubicación: {ubicacion_imp}\n"
                    f"- IP: {ip_imp}\n"
                    f"- Color: {color}\n"
                    f"- Nivel Actual: {valor_num}%\n"
                    f"- Estado: {prioridad}\n"
                )
                print(f" ⚠️ ALERTA ({umbral_actual}%): {nombre_imp} - Tóner {color} al {valor_num}%. Enviando mail...")
                _enviar_correo(asunto, mensaje)
                _estado_alertas[clave_toner] = umbral_actual
        else:
            # Nivel por encima de 15% → ya no hay alerta
            if ultimo_umbral is not None:
                print(f" ✅ Tóner {color} de {nombre_imp} reabastecido/cambiado (ahora {valor_num}%).")
                _estado_alertas[clave_toner] = None


def _extraer_porcentaje(nivel):
    """Convierte un nivel de tóner a número entero porcentual."""
    if nivel is None:
        return None
    if isinstance(nivel, str):
        if nivel.endswith("%"):
            try:
                return int(nivel.replace("%", ""))
            except ValueError:
                return None
        if nivel in ("AGOTADO", "0%"):
            return 0
    return None


def _determinar_umbral(valor_num):
    """Retorna el umbral de alerta correspondiente al valor."""
    if valor_num == 0:
        return 0
    elif valor_num <= 5:
        return 5
    elif valor_num <= 10:
        return 10
    elif valor_num <= 15:
        return 15
    return None  # Sin alerta


def _generar_alerta_toner(nombre_imp, color, valor_num, umbral):
    """Genera el asunto y prioridad según el umbral."""
    if umbral == 0:
        asunto = f"🚨 TÓNER AGOTADO: {nombre_imp} ({color} al 0%)"
        prioridad = "REEMPLAZO INMEDIATO NECESARIO"
    elif umbral == 5:
        asunto = f"🔴 TÓNER MUY BAJO (5%): {nombre_imp} ({color})"
        prioridad = "Urgencia alta - Quedan muy pocas impresiones"
    elif umbral == 10:
        asunto = f"🟠 TÓNER BAJO (10%): {nombre_imp} ({color})"
        prioridad = "Urgencia media - Preparar insumo"
    else:  # 15%
        asunto = f"🟡 AVISO TÓNER (15%): {nombre_imp} ({color})"
        prioridad = "Aviso preventivo"
    return asunto, prioridad

