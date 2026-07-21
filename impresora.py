import subprocess
import json
import os
import time
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from github import Github  # Librería PyGithub

# ==================== CONFIGURACIÓN DE RUTAS ====================
CARPETA_PROYECTO = os.path.dirname(os.path.abspath(__file__))

# Configuración del Repositorio de GitHub
GITHUB_REPO = "LautyMel/Impresoras"      
GITHUB_FILE_PATH = "historial_impresoras.json" 

# Tiempo de espera entre escaneos (600 segundos = 10 minutos)
TIEMPO_REPETICION = 600

# ==================== CARGA DE CREDENCIALES Y DATOS PRIVADOS ====================
ruta_secretos = os.path.join(CARPETA_PROYECTO, "secretos.json")
try:
    with open(ruta_secretos, "r", encoding="utf-8") as f:
        secretos = json.load(f)
        GITHUB_TOKEN = secretos.get("github_token", "")
        CORREO_REMITENTE = secretos.get("correo_remitente", "")
        CLAVE_APLICACION = secretos.get("clave_correo", "")
        CORREOS_DESTINO = secretos.get("correos_destino", [])
        UBICACIONES = secretos.get("ubicaciones", {})
except FileNotFoundError:
    print(f"❌ ERROR: No se encontró el archivo 'secretos.json' en {CARPETA_PROYECTO}")
    print("Por favor, crea el archivo secretos.json con tus claves y ubicaciones antes de continuar.")
    GITHUB_TOKEN = ""
    CORREO_REMITENTE = ""
    CLAVE_APLICACION = ""
    CORREOS_DESTINO = []
    UBICACIONES = {}

# Memoria local para evitar spam de correos
estado_alertas = {}

# Diccionario Público de Impresoras
IMPRESORAS = {
    "Impresora 1": "10.25.5.19",
    "Impresora 2": "10.25.5.20",
    "Impresora 3": "10.25.5.21",
    "Impresora 4": "10.25.5.22",
    "Impresora 5": "10.25.5.23",
    "Impresora 6": "10.25.5.24",  # Impresora Color
    "Impresora 7": "10.209.34.69",
    "Impresora 8": "10.209.87.29",  
    "Impresora 9": "10.209.87.142"
}

# ==================== SISTEMA DE ALERTAS POR EMAIL ====================
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
    Incluye la ubicación física obtenida de forma segura desde secretos.json.
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


# ==================== CONSULTA POWERSHELL / SNMP ====================
def consultar_impresora_avanzado(printer, es_color=False):
    """
    Ejecuta un script de PowerShell optimizado que extrae el contador general
    y calcula de forma inteligente el porcentaje de los tóners.
    """
    ps_command = f"""
    $sys = New-Object -ComObject OlePrn.OleSNMP
    try {{
        $sys.Open("{printer}", "public", 2, 161)
        
        # 1. Obtener Contador
        try {{ $contador = $sys.Get(".1.3.6.1.2.1.43.10.2.1.4.1.1") }} catch {{ $contador = "ERROR" }}
        
        # Diccionario para mapear índices encontrados
        $indices = @{{ "black" = 0; "cyan" = 0; "magenta" = 0; "yellow" = 0 }}

        # 2. Mapeo dinámico de índices de tóners
        for ($i = 1; $i -le 12; $i++) {{
            try {{
                $desc = $sys.Get(".1.3.6.1.2.1.43.11.1.1.6.1.$i").ToLower()
                if ($desc -like "*black*" -or $desc -like "*negro*") {{ $indices["black"] = $i }}
                if ($desc -like "*cyan*" -or $desc -like "*cian*") {{ $indices["cyan"] = $i }}
                if ($desc -like "*magenta*") {{ $indices["magenta"] = $i }}
                if ($desc -like "*yellow*" -or $desc -like "*amarillo*") {{ $indices["yellow"] = $i }}
            }} catch {{}}
        }}

        # Función interna para calcular porcentaje por color
        function Calcular-Toner($idx) {{
            if ($idx -eq 0) {{ return "ERROR" }}
            try {{
                $actual = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.9.1.$idx")
                $maximo = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.8.1.$idx")
                if ($actual -gt 0 -and $maximo -gt 0) {{
                    return "$([Math]::Round(($actual / $maximo) * 100))%"
                }} elseif ($actual -eq -3) {{
                    return "OK"
                }} else {{
                    return "ERROR"
                }}
            }} catch {{ return "ERROR" }}
        }}

        $tBlack = Calcular-Toner($indices["black"])

        if ("{es_color}" -eq "True") {{
            $tCyan = Calcular-Toner($indices["cyan"])
            $tMagenta = Calcular-Toner($indices["magenta"])
            $tYellow = Calcular-Toner($indices["yellow"])
        }} else {{
            $tCyan = "N/A"
            $tMagenta = "N/A"
            $tYellow = "N/A"
        }}

    }} catch {{
        $contador = "ERROR"
        $tBlack = "ERROR"; $tCyan = "ERROR"; $tMagenta = "ERROR"; $tYellow = "ERROR"
    }}
    
    Write-Output "$contador|$tBlack|$tCyan|$tMagenta|$tYellow"
    """
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=10, 
            creationflags=0x08000000  
        )
        if result.returncode == 0 and result.stdout.strip():
            partes = result.stdout.strip().split('|')
            if len(partes) == 5:
                return partes[0], partes[1], partes[2], partes[3], partes[4]
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"
    except:
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"


# ==================== SINCRONIZACIÓN NUBE ====================
def subir_a_github(contenido_json):
    if not GITHUB_TOKEN:
        print(" -> [GitHub] Sincronización cancelada: Falta el Token de seguridad.")
        return
    try:
        g = Github(GITHUB_TOKEN)
        repo = g.get_repo(GITHUB_REPO)
        try:
            contents = repo.get_contents(GITHUB_FILE_PATH)
            repo.update_file(
                path=GITHUB_FILE_PATH,
                message="Actualización automática de registros de impresoras",
                content=contenido_json,
                sha=contents.sha
            )
            print(" -> [GitHub] Sincronizado exitosamente en la nube.")
        except Exception:
            repo.create_file(
                path=GITHUB_FILE_PATH,
                message="Primer registro automático de historial",
                content=contenido_json
            )
            print(" -> [GitHub] Archivo creado por primera vez en la nube.")
    except Exception as e:
        print(f" -> [GitHub] ERROR al subir los datos: {e}")


# ==================== ESCANEO Y BUCLE PRINCIPAL ====================
def ejecutar_escaneo():
    ahora = datetime.now()
    fecha_str = ahora.strftime("%Y-%m-%d %H:%M:%S")
    mes_clave = ahora.strftime("%Y-%m")

    archivo_datos_local = os.path.join(CARPETA_PROYECTO, "historial_impresoras.json")

    if os.path.exists(archivo_datos_local):
        with open(archivo_datos_local, "r", encoding="utf-8") as f:
            try:
                historial = json.load(f)
            except json.JSONDecodeError:
                historial = {}
    else:
        historial = {}

    if mes_clave not in historial:
        historial[mes_clave] = {"ultima_actualizacion": fecha_str, "datos": {}}

    historial[mes_clave]["ultima_actualizacion"] = fecha_str

    impresoras_en_json = list(historial[mes_clave]["datos"].keys())
    for nombre_guardado in impresoras_en_json:
        if nombre_guardado not in IMPRESORAS:
            del historial[mes_clave]["datos"][nombre_guardado]

    for nombre_imp, ip_imp in IMPRESORAS.items():
        # Busca la ubicación asociada a la IP en tu secretos.json privado
        ubicacion_imp = UBICACIONES.get(ip_imp, "Ubicación Privada / No configurada")

        print(f"Escaneando {nombre_imp} ({ip_imp})...")
        
        if nombre_imp not in historial[mes_clave]["datos"]:
            historial[mes_clave]["datos"][nombre_imp] = {}
        
        historial[mes_clave]["datos"][nombre_imp]["ip"] = ip_imp
            
        es_color = (nombre_imp == "Impresora 6")
        
        contador, t_black, t_cyan, t_magenta, t_yellow = consultar_impresora_avanzado(ip_imp, es_color)
        
        # Evaluar alertas en tiempo real pasando la ubicación privada
        procesar_alertas(nombre_imp, ip_imp, ubicacion_imp, contador, t_black, t_cyan, t_magenta, t_yellow, es_color)
        
        if str(contador).isdigit():
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
        else:
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"
            
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = t_black
        
        if es_color:
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Cian"] = t_cyan
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Magenta"] = t_magenta
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Amarillo"] = t_yellow

    json_final = json.dumps(historial, indent=4, ensure_ascii=False)

    with open(archivo_datos_local, "w", encoding="utf-8") as f:
        f.write(json_final)
    print(f"[{fecha_str}] Historial guardado localmente.")

    subir_a_github(json_final)


if __name__ == "__main__":
    if not os.path.exists(CARPETA_PROYECTO):
        os.makedirs(CARPETA_PROYECTO)

    print("Monitor inteligente de impresoras iniciado...")
    
    while True:
        ejecutar_escaneo()
        time.sleep(TIEMPO_REPETICION)
