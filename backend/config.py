import os
import json

# ==================== RUTAS DEL SISTEMA ====================

CARPETA_BACKEND = os.path.dirname(os.path.abspath(__file__))
CARPETA_PROYECTO = os.path.dirname(CARPETA_BACKEND)

RUTA_SECRETOS = os.path.join(CARPETA_PROYECTO, "secretos.json")

ARCHIVO_DATOS_LOCAL = os.path.join(CARPETA_BACKEND, "historial_impresoras.json")

# ==================== CONFIGURACIÓN GENERAL ====================
GITHUB_REPO = "LautyMel/Impresoras"      
GITHUB_FILE_PATH = "backend/historial_impresoras.json" # Ruta corregida para GitHub
TIEMPO_REPETICION = 600 # Segundos (10 minutos)

# ==================== DICCIONARIO PÚBLICO DE IMPRESORAS ====================
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

# ==================== CARGA DE CREDENCIALES PRIVADAS ====================
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
    print("Por favor, créalo antes de ejecutar el programa.")
