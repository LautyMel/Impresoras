import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import CORREO_REMITENTE, CLAVE_APLICACION, CORREOS_DESTINO

# Memoria local para evitar spam de correos
estado_alertas = {}

def enviar_alerta_correo(asunto, mensaje):
    """Envia un correo SMTP utilizando las credenciales cargadas de secretos.json"""
    if not CORREO_REMITENTE or not CLAVE_APLICACION or not CORREOS_DESTINO:
        print(" -> [Email] Omite el envío de correo: Faltan credenciales en secretos.json.")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = CORREO_REMITENTE
        msg['To'] = ", ".join(CORREOS_DESTINO)
        msg['Subject'] = asunto
        
        msg.attach(MIMEText(mensaje, 'plain', 'utf-8'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(CORREO_REMITENTE, CLAVE_APLICACION)
        
        server.sendmail(CORREO_REMITENTE, CORREOS_DESTINO, msg.as_string())
        server.quit()
        
        print(f" 📧 [EMAIL ENVIADO] {asunto}")
    except Exception as e:
        print(f" ❌ [Email Error] No se pudo enviar el correo: {e}")

def procesar_alertas(nombre_imp, ip_imp, ubicacion_imp, contador, t_black, t_cyan, t_magenta, t_yellow, es_color):
    """
    Evalúa los estados y envía correos en umbrales escalonados:
    - 15% (Aviso preventivo)
    - 10% (Alerta media)
    - 5%  (Alerta crítica)
    - 0%  (Agotado / Reemplazo inmediato)
    """
    global estado_alertas
    
    # ---------------- 1. EVALUAR ESTADO OFFLINE ----------------
    clave_offline = f"{nombre_imp}_offline"
    
    if contador == "ERROR":
        if not estado_alertas.get(clave_offline, False):
            asunto = f"🚨 ALERTA CRÍTICA: {nombre_imp} Fuera de Línea"
            mensaje = (f"La {nombre_imp} no responde al escaneo SNMP.\n\n"
                       f"Detalles del equipo:\n"
                       f"- Impresora: {nombre_imp}\n"
                       f"- Ubicación: {ubicacion_imp}\n"
                       f"- IP: {ip_imp}\n"
                       f"- Estado: Fuera de línea / Sin respuesta\n\n"
                       f"Por favor acudir a '{ubicacion_imp}' para revisar si el equipo está apagado o sin red.")
            print(f" ⚠️ ALERTA: {nombre_imp} offline. Enviando mail...")
            enviar_alerta_correo(asunto, mensaje)
            estado_alertas[clave_offline] = True
        return  # Si está offline no evaluamos tóners
    else:
        if estado_alertas.get(clave_offline, False):
            print(f" ✅ La {nombre_imp} volvió a estar en línea.")
            estado_alertas[clave_offline] = False

    # ---------------- 2. EVALUAR TÓNERS ESCALONADOS ----------------
    toners = [("Negro", t_black)]
    if es_color:
        toners.extend([("Cian", t_cyan), ("Magenta", t_magenta), ("Amarillo", t_yellow)])

    for color, nivel in toners:
        clave_toner = f"{nombre_imp}_toner_{color}"
        
        valor_num = None
        if isinstance(nivel, str) and nivel.endswith("%"):
            try:
                valor_num = int(nivel.replace("%", ""))
            except ValueError:
                pass
        elif nivel == "AGOTADO" or nivel == "0%":
            valor_num = 0

        if valor_num is not None:
            ultimo_umbral_notificado = estado_alertas.get(clave_toner, None)

            umbral_actual = None
            if valor_num == 0:
                umbral_actual = 0
            elif valor_num <= 5:
                umbral_actual = 5
            elif valor_num <= 10:
                umbral_actual = 10
            elif valor_num <= 15:
                umbral_actual = 15

            if umbral_actual is not None:
                if ultimo_umbral_notificado is None or umbral_actual < ultimo_umbral_notificado:
                    
                    if umbral_actual == 0:
                        asunto = f"🚨 TÓNER AGOTADO: {nombre_imp} ({color} al 0%)"
                        prioridad = "REEMPLAZO INMEDIATO NECESARIO"
                    elif umbral_actual == 5:
                        asunto = f"🔴 TÓNER MUY BAJO (5%): {nombre_imp} ({color})"
                        prioridad = "Urgencia alta - Quedan muy pocas impresiones"
                    elif umbral_actual == 10:
                        asunto = f"🟠 TÓNER BAJO (10%): {nombre_imp} ({color})"
                        prioridad = "Urgencia media - Preparar insumo"
                    else:  # 15%
                        asunto = f"🟡 AVISO TÓNER (15%): {nombre_imp} ({color})"
                        prioridad = "Aviso preventivo"

                    mensaje = (f"Notificación de nivel de insumo.\n\n"
                               f"Detalles del equipo:\n"
                               f"- Impresora: {nombre_imp}\n"
                               f"- Ubicación: {ubicacion_imp}\n"
                               f"- IP: {ip_imp}\n"
                               f"- Color: {color}\n"
                               f"- Nivel Actual: {valor_num}%\n"
                               f"- Estado: {prioridad}\n")
                    
                    print(f" ⚠️ ALERTA ({umbral_actual}%): {nombre_imp} - Tóner {color} al {valor_num}%. Enviando mail...")
                    enviar_alerta_correo(asunto, mensaje)
                    estado_alertas[clave_toner] = umbral_actual

            else:
                if ultimo_umbral_notificado is not None:
                    print(f" ✅ Tóner {color} de {nombre_imp} reabastecido/cambiado.")
                    estado_alertas[clave_toner] = None