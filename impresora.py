import subprocess
import json
import os
import time
import sys
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from github import Github  # Librería PyGithub

# ==================== CONFIGURACIÓN ====================
CARPETA_PROYECTO = os.path.dirname(os.path.abspath(__file__))

# Configuración del Repositorio de GitHub
GITHUB_REPO = "LautyMel/Impresoras"      
GITHUB_FILE_PATH = "historial_impresoras.json" 

# Tiempo de espera entre escaneos (600 segundos = 10 minutos)
TIEMPO_REPETICION = 600

# Servidor SMTP para Gmail
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
# =======================================================

# Carga segura de credenciales desde config.txt
ruta_config = os.path.join(CARPETA_PROYECTO, "config.txt")
try:
    with open(ruta_config, "r", encoding="utf-8") as f:
        lineas = f.read().splitlines()
        GITHUB_TOKEN = lineas[0].strip() if len(lineas) > 0 else ""
        SMTP_PASSWORD = lineas[1].strip() if len(lineas) > 1 else ""
        SMTP_USER = lineas[2].strip() if len(lineas) > 2 else ""
        EMAIL_DESTINATARIO = lineas[3].strip() if len(lineas) > 3 else ""
except FileNotFoundError:
    print(f"❌ ERROR: No se encontró el archivo 'config.txt' en {CARPETA_PROYECTO}")
    print("Por favor, crea el archivo con el formato: Token, ContraseñaMail, MailEmisor, MailDestinatario.")
    sys.exit(1)

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
                elseif ($desc -like "*cyan*" -or $desc -like "*cian*") {{ $indices["cyan"] = $i }}
                elseif ($desc -like "*magenta*") {{ $indices["magenta"] = $i }}
                elseif ($desc -like "*yellow*" -or $desc -like "*amarillo*") {{ $indices["yellow"] = $i }}
            }} catch {{}}
         dodge
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


def enviar_alerta_toner(nombre_impresora, ip, alertas_toner):
    """
    Envía una alerta formal por correo en formato HTML al equipo de soporte IT.
    """
    if not SMTP_USER or not EMAIL_DESTINATARIO or not SMTP_PASSWORD:
        print(f" -> [Alerta] Envío cancelado para {nombre_impresora}: Faltan credenciales en config.txt.")
        return

    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = EMAIL_DESTINATARIO
    msg['Subject'] = f"⚠️ ALERTA: Tóner bajo en {nombre_impresora}"

    # Construcción de las filas con los colores afectados
    filas_toner = "".join([f"<li><strong>{color}:</strong> <span style='color:#e74c3c; font-weight:bold;'>{porcentaje}%</span></li>" for color, porcentaje in alertas_toner])

    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #e74c3c; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">⚠️ Reemplazo de Tóner Requerido</h2>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
                <p>Hola Soporte IT,</p>
                <p>El Monitor de Impresoras ha detectado que los siguientes insumos están por debajo del umbral mínimo del 15%:</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 8px;"><strong>Impresora:</strong> {nombre_impresora}</li>
                    <li style="margin-bottom: 8px;"><strong>Dirección IP:</strong> <a href="http://{ip}" target="_blank">{ip}</a></li>
                </ul>
                <h3 style="color: #c0392b; margin-top: 20px;">Tóners Críticos:</h3>
                <ul>
                    {filas_toner}
                </ul>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 0.8em; color: #7f8c8d; text-align: center;">Mensaje automático generado por el sistema de monitoreo EMUI.</p>
            </div>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(cuerpo_html, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, EMAIL_DESTINATARIO, msg.as_string())
        server.quit()
        print(f" -> [Alerta] Correo de alerta enviado exitosamente para {nombre_impresora}.")
    except Exception as e:
        print(f" -> [Alerta] ERROR al intentar enviar correo para {nombre_impresora}: {e}")


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
        print(f"Escaneando {nombre_imp} ({ip_imp})...")
        
        if nombre_imp not in historial[mes_clave]["datos"]:
            historial[mes_clave]["datos"][nombre_imp] = {}
        
        historial[mes_clave]["datos"][nombre_imp]["ip"] = ip_imp
            
        es_color = (nombre_imp == "Impresora 6")
        
        contador, t_black, t_cyan, t_magenta, t_yellow = consultar_impresora_avanzado(ip_imp, es_color)
        
        if str(contador).isdigit():
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
        else:
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"
            
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = t_black
        
        if es_color:
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Cian"] = t_cyan
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Magenta"] = t_magenta
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Amarillo"] = t_yellow

        # --- VALIDACIÓN DE ALERTAS DE TÓNER BAJO (< 15%) ---
        alertas_a_enviar = []
        campos_toner = {
            "Negro": t_black,
            "Cian": t_cyan,
            "Magenta": t_magenta,
            "Amarillo": t_yellow
        }
        
        for color, valor in campos_toner.items():
            if valor and valor != "N/A" and valor != "ERROR":
                try:
                    porcentaje_num = int(valor.replace("%", "").strip())
                    if porcentaje_num < 15:
                        alertas_a_enviar.append((color, porcentaje_num))
                except ValueError:
                    pass

        if alertas_a_enviar:
            print(f" ⚠️ Detectado nivel crítico en {nombre_imp}. Procesando correo...")
            enviar_alerta_toner(nombre_imp, ip_imp, alertas_a_enviar)

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
