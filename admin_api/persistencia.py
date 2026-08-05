# -*- coding: utf-8 -*-
"""
Módulo de Persistencia del Catálogo de Impresoras
====================================================
Encapsula la escritura de config.py, secretos.json, config.js e historial.
Cada función es independiente y lanza excepciones para que el llamador
pueda decidir cómo tratar el error.
"""
import json
import os
import re

# ==================== RUTAS ====================
CARPETA_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUTA_CONFIG_PY = os.path.join(CARPETA_BASE, "printer_monitor", "config.py")
RUTA_CONFIG_JS = os.path.join(CARPETA_BASE, "js", "config.js")
RUTA_SECRETOS = os.path.join(CARPETA_BASE, "secretos.json")
RUTA_HISTORIAL = os.path.join(CARPETA_BASE, "historial_impresoras.json")

_PATRON_IMPRESORAS = r'IMPRESORAS\s*=\s*\{[^}]*\}'
# Soporta tanto "IMPRESORAS_COLOR = {...}" como "IMPRESORAS_COLOR = set()"
_PATRON_COLOR = r'IMPRESORAS_COLOR\s*=\s*(?:set\(\)|\{[^}]*\})'


def actualizar_config_py(impresoras):
    """Reescribe los bloques IMPRESORAS e IMPRESORAS_COLOR en config.py."""
    with open(RUTA_CONFIG_PY, "r", encoding="utf-8") as f:
        contenido = f.read()

    # Bloque IMPRESORAS
    lineas = "IMPRESORAS = {\n" + "".join(
        f'    "{i["nombre"]}": "{i["ip"]}",\n' for i in impresoras
    ) + "}\n"
    contenido = re.sub(_PATRON_IMPRESORAS, lineas.rstrip(), contenido, flags=re.DOTALL)

    # Bloque IMPRESORAS_COLOR
    colores = sorted({imp["nombre"] for imp in impresoras if imp.get("es_color")})
    if colores:
        lineas_c = f"IMPRESORAS_COLOR = {{{', '.join(f'\"{n}\"' for n in colores)}}}\n"
    else:
        lineas_c = "IMPRESORAS_COLOR = set()\n"
    contenido = re.sub(_PATRON_COLOR, lineas_c.rstrip(), contenido, flags=re.DOTALL)

    with open(RUTA_CONFIG_PY, "w", encoding="utf-8") as f:
        f.write(contenido)


def actualizar_secretos(impresoras):
    """Actualiza el mapa de ubicaciones (IP -> Ubicación) en secretos.json."""
    if os.path.exists(RUTA_SECRETOS):
        with open(RUTA_SECRETOS, "r", encoding="utf-8") as f:
            secretos = json.load(f)
    else:
        secretos = {
            "github_token": "", "correo_remitente": "", "clave_correo": "",
            "correos_destino": [], "ubicaciones": {}
        }

    secretos["ubicaciones"] = {
        imp["ip"]: imp["ubicacion"].strip()
        for imp in impresoras if imp.get("ubicacion", "").strip()
    }

    with open(RUTA_SECRETOS, "w", encoding="utf-8") as f:
        json.dump(secretos, f, indent=4, ensure_ascii=False)


def actualizar_config_js(hash_cifrado):
    """Actualiza DATOS_PROTEGIDOS_HEX en js/config.js."""
    with open(RUTA_CONFIG_JS, "r", encoding="utf-8") as f:
        contenido = f.read()

    contenido = re.sub(
        r'(DATOS_PROTEGIDOS_HEX\s*=\s*")[^"]*(")',
        rf'\g<1>{hash_cifrado}\g<2>',
        contenido
    )

    with open(RUTA_CONFIG_JS, "w", encoding="utf-8") as f:
        f.write(contenido)


def actualizar_historial(impresoras):
    """Agrega/elimina impresoras del historial mensual y normaliza nombres."""
    historial = {}
    if os.path.exists(RUTA_HISTORIAL):
        with open(RUTA_HISTORIAL, "r", encoding="utf-8") as f:
            historial = json.load(f)

    nuevas = {imp["nombre"]: imp["ip"] for imp in impresoras}
    nuevos_nombres = set(nuevas.keys())

    for mes, data in historial.items():
        datos_mes = data.get("datos", {})
        for nombre in list(datos_mes.keys()):
            if nombre not in nuevos_nombres:
                del datos_mes[nombre]
        for nombre, ip in nuevas.items():
            if nombre not in datos_mes:
                datos_mes[nombre] = {"ip": ip, "Contador General": 0, "Porcentaje Tóner Negro": "N/A"}

    with open(RUTA_HISTORIAL, "w", encoding="utf-8") as f:
        json.dump(historial, f, indent=4, ensure_ascii=False)
