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

# OIDs fijos para las consultas individuales
OIDS_A_PROBAR = {
    "Contador General": "1.3.6.1.2.1.43.10.2.1.4.1.1",
    "Nivel de Tóner": "1.3.6.1.2.1.43.11.1.1.9.1.1"  # <--- CORREGIDO: Se quitó el espacio y se agregó el índice .1.1 al final
}


archivo_datos_local = os.path.join(CARPETA_PROYECTO, "historial_impresoras.json")

def consultar_oid_ps(printer, oid):
    try:
        clean_oid = oid.lstrip('.')
        ps_command = f"""
        $sys = New-Object -ComObject OlePrn.OleSNMP
        $sys.Open("{printer}", "public", 2, 161)
        $sys.Get(".{clean_oid}")
        """
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=4,
            creationflags=0x08000000  
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        return "ERROR"
    except:
        return "ERROR"

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
                message="Actualización automática de contadores y tóner [Script Local]",
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

    for nombre_imp, ip_imp in IMPRESORAS.items():
        if nombre_imp not in historial[mes_clave]["datos"]:
            historial[mes_clave]["datos"][nombre_imp] = {"ip": ip_imp}
            
        # 1. Consultar Contador General
        res_contador = consultar_oid_ps(ip_imp, OID_CONTADOR)
        if res_contador.isdigit():
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(res_contador)
        else:
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"

        # 2. Consultar y calcular Porcentaje de Tóner Negro
        res_actual = consultar_oid_ps(ip_imp, OID_TONER_ACTUAL)
        res_maximo = consultar_oid_ps(ip_imp, OID_TONER_MAXIMO)

        if res_actual.isdigit() and res_maximo.isdigit():
            val_actual = int(res_actual)
            val_maximo = int(res_maximo)
            
            if val_maximo > 0:
                # Calcula el porcentaje entero aproximado
                porcentaje_toner = round((val_actual / val_maximo) * 100)
                historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = f"{porcentaje_toner}%"
            else:
                historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = "ERROR_CAPACIDAD"
        else:
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = "ERROR"

    json_final = json.dumps(historial, indent=4, ensure_ascii=False)

    with open(archivo_datos_local, "w", encoding="utf-8") as f:
        f.write(json_final)
    print(f"[{fecha_str}] Historial guardado localmente.")

    subir_a_github(json_final)

if __name__ == "__main__":
    if not os.path.exists(CARPETA_PROYECTO):
        os.makedirs(CARPETA_PROYECTO)

    print("Monitor de impresoras iniciado con protección de credenciales...")
    
    while True:
        ejecutar_escaneo()
        time.sleep(TIEMPO_REPETICION)
