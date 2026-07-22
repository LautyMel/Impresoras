import os
import json

CARPETA_PROYECTO = os.path.dirname(os.path.abspath(__file__))
RUTA_SECRETOS = os.path.join(CARPETA_PROYECTO, "secretos.json")

# El JSON vive en la raíz, igual que en tu versión original que funcionaba
ARCHIVO_DATOS_LOCAL = os.path.join(CARPETA_PROYECTO, "historial_impresoras.json")

GITHUB_REPO = "LautyMel/Impresoras"      
GITHUB_FILE_PATH = "historial_impresoras.json" # Directo a la raíz en GitHub
TIEMPO_REPETICION = 600

IMPRESORAS = {
    "Impresora 1": "10.25.5.19",
    "Impresora 2": "10.25.5.20",
    "Impresora 3": "10.25.5.21",
    "Impresora 4": "10.25.5.22",
    "Impresora 5": "10.25.5.23",
    "Impresora 6": "10.25.5.24",
    "Impresora 7": "10.209.34.69",
    "Impresora 8": "10.209.87.29",  
    "Impresora 9": "10.209.87.142"
}

GITHUB_TOKEN = ""
CORREO_REMITENTE = ""
CLAVE_APLICACION = ""
CORREOS_DESTINO = []
UBICACIONES = {}

try:
    with open(RUTA_SECRETOS, "r", encoding="utf-8") as f:
        secretos = json.load(f)
        GITHUB_TOKEN = secretos.get("github_token", "")
        CORREO_REMITENTE = secretos.get("correo_remitente", "")
        CLAVE_APLICACION = secretos.get("clave_correo", "")
        CORREOS_DESTINO = secretos.get("correos_destino", [])
        UBICACIONES = secretos.get("ubicaciones", {})
except FileNotFoundError:
    print(f"❌ ERROR: No se encontró el archivo 'secretos.json' en {CARPETA_PROYECTO}")
