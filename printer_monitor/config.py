"""
Módulo de Configuración Central
================================
Define todas las constantes, rutas y el diccionario de impresoras.
"""

import os

# ==================== RUTAS DEL PROYECTO ====================
CARPETA_PROYECTO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ==================== REPOSITORIO GITHUB ====================
GITHUB_REPO = "LautyMel/Impresoras"
GITHUB_FILE_PATH = "historial_impresoras.json"

# ==================== TIEMPOS ====================
TIEMPO_REPETICION = 600  # 10 minutos entre escaneos
TIMEOUT_SNMP = 10        # Timeout para consultas SNMP (segundos)

# ==================== ARCHIVOS LOCALES ====================
ARCHIVO_SECRETOS = os.path.join(CARPETA_PROYECTO, "secretos.json")
ARCHIVO_HISTORIAL = os.path.join(CARPETA_PROYECTO, "historial_impresoras.json")

# ==================== CATÁLOGO DE IMPRESORAS ====================
IMPRESORAS = {
    "Impresora 1": "10.25.5.19",
    "Impresora 2": "10.25.5.20",
    "Impresora 3": "10.25.5.21",
    "Impresora 4": "10.25.5.22",
    "Impresora 5": "10.25.5.23",
    "Impresora 6": "10.25.5.24",   # Impresora Color
    "Impresora 7": "10.209.34.69",
    "Impresora 8": "10.209.87.29",
    "Impresora 9": "10.209.87.142"
}

# Impresoras a color (por nombre)
IMPRESORAS_COLOR = {"Impresora 6"}

# ==================== CONFIGURACIÓN SMTP ====================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

