"""
Módulo de Carga de Secretos
============================
Carga credenciales, ubicaciones y configuración sensible desde secretos.json.
"""

import json
import os
from .config import ARCHIVO_SECRETOS


def cargar_secretos():
    """
    Lee el archivo secretos.json y retorna un diccionario con:
      - github_token: str
      - correo_remitente: str
      - clave_correo: str
      - correos_destino: list[str]
      - ubicaciones: dict[str, str]  (IP -> Ubicación física)
    
    Si el archivo no existe, retorna valores por defecto vacíos.
    """
    if not os.path.exists(ARCHIVO_SECRETOS):
        print(f"❌ ERROR: No se encontró '{ARCHIVO_SECRETOS}'")
        print("Crea el archivo con: github_token, correo_remitente, clave_correo, correos_destino, ubicaciones")
        return {
            "github_token": "",
            "correo_remitente": "",
            "clave_correo": "",
            "correos_destino": [],
            "ubicaciones": {}
        }

    try:
        with open(ARCHIVO_SECRETOS, "r", encoding="utf-8") as f:
            secretos = json.load(f)
            return {
                "github_token": secretos.get("github_token", ""),
                "correo_remitente": secretos.get("correo_remitente", ""),
                "clave_correo": secretos.get("clave_correo", ""),
                "correos_destino": secretos.get("correos_destino", []),
                "ubicaciones": secretos.get("ubicaciones", {})
            }
    except (json.JSONDecodeError, IOError) as e:
        print(f"❌ ERROR al leer '{ARCHIVO_SECRETOS}': {e}")
        return {
            "github_token": "",
            "correo_remitente": "",
            "clave_correo": "",
            "correos_destino": [],
            "ubicaciones": {}
        }

