import subprocess
import json
import os
import time
import sys
from datetime import datetime
from github import Github  # Librería PyGithub

# ==================== CONFIGURACIÓN ====================
CARPETA_PROYECTO = r"C:\Users\20453243215\Desktop\pp\impresora"

# Configuración del Repositorio de GitHub
GITHUB_REPO = "LautyMel/Impresoras"       
GITHUB_FILE_PATH = "historial_impresoras.json" 

# Tiempo de espera entre escaneos (600 segundos = 10 minutos)
TIEMPO_REPETICION = 600
# =======================================================

ruta_token = os.path.join(CARPETA_PROYECTO, "config.txt")
try:
    with open(ruta_token, "r", encoding="utf-8") as f:
        GITHUB_TOKEN = f.read().strip()
except FileNotFoundError:
    print(f"❌ ERROR: No se encontró el archivo 'config.txt' en {CARPETA_PROYECTO}")
    print("Por favor, crea el archivo config.txt y pega tu token de GitHub adentro.")
    GITHUB_TOKEN = ""

IMPRESORAS = {
    "Impresora 1": "10.25.5.27",
    "Impresora 2": "10.25.5.20",
    "Impresora 3": "10.25.5.22",
    "Impresora 4": "10.25.5.28",
    "Impresora 5": "10.25.5.24",
    "Impresora 6": "10.25.5.29",
    "Impresora 7": "10.25.5.23",
    "Impresora 8": "10.25.5.25",
    "Impresora 9": "10.25.5.21"
}

def consultar_impresora_avanzado(printer):
    """
    Ejecuta un script de PowerShell optimizado que extrae el contador general
    y calcula de forma inteligente el porcentaje del tóner negro analizando los índices.
    """
    ps_command = f"""
    $sys = New-Object -ComObject OlePrn.OleSNMP
    try {{
        $sys.Open("{printer}", "public", 2, 161)
        
        # 1. Obtener Contador
        try {{ $contador = $sys.Get(".1.3.6.1.2.1.43.10.2.1.4.1.1") }} catch {{ $contador = "ERROR" }}
        
        # 2. Buscar índice del Tóner Negro (revisando los primeros 6 índices de descripción)
        $idxToner = 1
        for ($i = 1; $i -le 6; $i++) {{
            try {{
                $desc = $sys.Get(".1.3.6.1.2.1.43.11.1.1.6.1.$i").ToLower()
                if ($desc -like "*black*" -or $desc -like "*negro*") {{
                    $idxToner = $i
                    break
                }}
            }} catch {{}}
        }}

        # 3. Obtener niveles con el índice detectado
        try {{ $actual = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.9.1.$idxToner") }} catch {{ $actual = -1 }}
        try {{ $maximo = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.8.1.$idxToner") }} catch {{ $maximo = -1 }}

        # 4. Calcular porcentaje real
        if ($actual -gt 0 -and $maximo -gt 0) {{
            $porcentaje = [Math]::Round(($actual / $maximo) * 100)
            $tonerResultado = "$porcentaje%"
        }} elseif ($actual -eq -3) {{
            $tonerResultado = "OK"
        }} else {{
            $tonerResultado = "ERROR"
        }}
    }} catch {{
        $contador = "ERROR"
        $tonerResultado = "ERROR"
    }}
    
    # Devolver formato limpio para procesar en Python
    Write-Output "$contador|$tonerResultado"
    """
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=6,
            creationflags=0x08000000  
        )
        if result.returncode == 0 and result.stdout.strip():
            partes = result.stdout.strip().split('|')
            if len(partes) == 2:
                return partes[0], partes[1]
        return "ERROR", "ERROR"
    except:
        return "ERROR", "ERROR"

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

def obtener_color_y_estado(toner_str):
    """
    Analiza el string del tóner (ej: '85%') y determina el color de texto
    para el JSON y el código ANSI de color para la consola de Python.
    """
    if toner_str == "ERROR":
        return "Desconocido", "\033[90m"  # Gris
    if toner_str == "OK":
        return "Verde", "\033[92m"       # Verde

    try:
        # Quitamos el '%' y pasamos a número entero
        porcentaje = int(toner_str.replace("%", "").strip())
        
        if 50 <= porcentaje <= 100:
            return "Verde", "\033[92m"       # Verde
        elif 20 <= porcentaje < 50:
            return "Amarillo", "\033[93m"    # Amarillo
        elif 0 <= porcentaje < 20:
            return "Rojo", "\033[91m"        # Rojo
        else:
            return "Desconocido", "\033[90m"
    except ValueError:
        return "Desconocido", "\033[90m"

def ejecutar_escaneo():
    ahora = datetime.now()
    fecha_str = ahora.strftime("%Y-%m-%d %H:%M:%S")
    mes_clave = ahora.strftime("%Y-%m")

    # Archivo local de historial
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

    # Códigos ANSI para resetear el color en consola
    RESET_COLOR = "\033[0m"

    for nombre_imp, ip_imp in IMPRESORAS.items():
        print(f"Escaneando {nombre_imp} ({ip_imp})...")
        
        if nombre_imp not in historial[mes_clave]["datos"]:
            historial[mes_clave]["datos"][nombre_imp] = {}
        
        historial[mes_clave]["datos"][nombre_imp]["ip"] = ip_imp
            
        # Llamada por red via SNMP
        contador, toner = consultar_impresora_avanzado(ip_imp)
        
        # Guardar Contador
        if contador.isdigit():
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
        else:
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"
            
        # Procesar rangos de color
        color_texto, color_ansi = obtener_color_y_estado(toner)

        # Guardar en el JSON (Tóner y su estado)
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = toner
        historial[mes_clave]["datos"][nombre_imp]["Estado Tóner"] = color_texto

        # Mostrar en consola de forma vistosa y con color
        print(f" -> {nombre_imp}: {color_ansi}Tóner al {toner} ({color_texto}){RESET_COLOR}")

    json_final = json.dumps(historial, indent=4, ensure_ascii=False)

    with open(archivo_datos_local, "w", encoding="utf-8") as f:
        f.write(json_final)
    print(f"\n[{fecha_str}] Historial guardado localmente.")

    subir_a_github(json_final)

if __name__ == "__main__":
    if not os.path.exists(CARPETA_PROYECTO):
        os.makedirs(CARPETA_PROYECTO)

    # Forzar a Windows a aceptar códigos de color ANSI en la terminal estándar
    if sys.platform == "win32":
        os.system("")

    print("Monitor inteligente de impresoras iniciado...")
    
    while True:
        ejecutar_escaneo()
        time.sleep(TIEMPO_REPETICION)
