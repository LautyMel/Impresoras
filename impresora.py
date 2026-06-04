import subprocess
import json
import os
import time
import sys
from datetime import datetime
from github import Github  # Librería PyGithub

# ==================== CONFIGURACIÓN ====================

CARPETA_PROYECTO = os.path.dirname(os.path.abspath(__file__))

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
    y calcula de forma inteligente el porcentaje de los tóners (Negro y Color si aplica).
    """
    ps_command = f"""
    $sys = New-Object -ComObject OlePrn.OleSNMP
    try {{
        $sys.Open("{printer}", "public", 2, 161)
        
        # 1. Obtener Contador
        try {{ $contador = $sys.Get(".1.3.6.1.2.1.43.10.2.1.4.1.1") }} catch {{ $contador = "ERROR" }}
        
        # Diccionario para mapear índices encontrados
        $indices = @{{ "black" = 0; "cyan" = 0; "magenta" = 0; "yellow" = 0 }}

        # 2. Mapeo dinámico de índices de tóners (revisando los primeros 12 consumibles habituales)
        for ($i = 1; $i -le 12; $i++) {{
            try {{
                $desc = $sys.Get(".1.3.6.1.2.1.43.11.1.1.6.1.$i").ToLower()
                if ($desc -like "*black*" -or $desc -like "*negro*") {{ $indices["black"] = $i }}
                elseif ($desc -like "*cyan*" -or $desc -like "*cian*") {{ $indices["cyan"] = $i }}
                elseif ($desc -like "*magenta*") {{ $indices["magenta"] = $i }}
                elseif ($desc -like "*yellow*" -or $desc -like "*amarillo*") {{ $indices["yellow"] = $i }}
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

        # Calcular Negro siempre
        $tBlack = Calcular-Toner($indices["black"])

        # Calcular colores solo si el script de Python lo requiere explicitamente
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
    
    # Devolver formato limpio estructurado para procesar en Python
    Write-Output "$contador|$tBlack|$tCyan|$tMagenta|$tYellow"
    """
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=10, # Incrementado ligeramente por el barrido de colores
            creationflags=0x08000000  
        )
        if result.returncode == 0 and result.stdout.strip():
            partes = result.stdout.strip().split('|')
            if len(partes) == 5:
                return partes[0], partes[1], partes[2], partes[3], partes[4]
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"
    except:
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"

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
            
        # CONDICIÓN: Si es la Impresora 6 pasamos True para extraer los colores
        es_color = (nombre_imp == "Impresora 6")
        
        # Llamada por red via SNMP modificada
        contador, t_black, t_cyan, t_magenta, t_yellow = consultar_impresora_avanzado(ip_imp, es_color)
        
        # Guardar Contador
        if contador.isdigit():
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
        else:
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"
            
        # Guardar Valores de Tóners organizados
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = t_black
        
        # Solo añadimos los nodos de color si es la impresora designada o si ya tenían datos previos
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
