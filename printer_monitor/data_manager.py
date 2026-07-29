"""
Módulo de Gestión de Datos (Historial JSON)
=============================================
Maneja la lectura, escritura y estructuración del historial mensual de impresoras.
"""

import json
import os
from datetime import datetime
from .config import ARCHIVO_HISTORIAL, IMPRESORAS, IMPRESORAS_COLOR


def cargar_historial():
    """
    Carga el archivo historial_impresoras.json desde disco.
    Si no existe o está corrupto, retorna un diccionario vacío.
    """
    if not os.path.exists(ARCHIVO_HISTORIAL):
        return {}

    try:
        with open(ARCHIVO_HISTORIAL, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f" ⚠️ Error al leer historial: {e}. Se creará uno nuevo.")
        return {}


def guardar_historial(historial):
    """
    Guarda el diccionario de historial en el archivo JSON local.
    Retorna el string JSON para enviar a GitHub.
    """
    json_final = json.dumps(historial, indent=4, ensure_ascii=False)
    with open(ARCHIVO_HISTORIAL, "w", encoding="utf-8") as f:
        f.write(json_final)
    return json_final


def preparar_mes_actual(historial):
    """
    Asegura que exista la estructura del mes actual en el historial.
    Retorna (mes_clave, fecha_str).
    """
    ahora = datetime.now()
    fecha_str = ahora.strftime("%Y-%m-%d %H:%M:%S")
    mes_clave = ahora.strftime("%Y-%m")

    if mes_clave not in historial:
        historial[mes_clave] = {"ultima_actualizacion": fecha_str, "datos": {}}

    historial[mes_clave]["ultima_actualizacion"] = fecha_str

    # Limpiar impresoras que ya no existen en el catálogo
    impresoras_guardadas = list(historial[mes_clave]["datos"].keys())
    for nombre in impresoras_guardadas:
        if nombre not in IMPRESORAS:
            del historial[mes_clave]["datos"][nombre]

    return mes_clave, fecha_str


def guardar_datos_impresora(historial, mes_clave, nombre_imp, ip_imp,
                            contador, t_black, t_cyan, t_magenta, t_yellow):
    """
    Almacena los datos escaneados de una impresora en el historial mensual.
    """
    if nombre_imp not in historial[mes_clave]["datos"]:
        historial[mes_clave]["datos"][nombre_imp] = {}

    historial[mes_clave]["datos"][nombre_imp]["ip"] = ip_imp

    # Contador General
    if str(contador).isdigit():
        historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
    else:
        historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"

    # Tóner Negro
    historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = t_black

    # Tóners de color si aplica
    es_color = nombre_imp in IMPRESORAS_COLOR
    if es_color:
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Cian"] = t_cyan
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Magenta"] = t_magenta
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Amarillo"] = t_yellow

