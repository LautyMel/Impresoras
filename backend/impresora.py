import os
import time
import json
from datetime import datetime

from config import ARCHIVO_DATOS_LOCAL, TIEMPO_REPETICION, IMPRESORAS, UBICACIONES, CARPETA_PROYECTO
from scanner import consultar_impresora_avanzado
from notificaciones import procesar_alertas
from sincronizacion import subir_a_github

def ejecutar_escaneo():
    ahora = datetime.now()
    fecha_str = ahora.strftime("%Y-%m-%d %H:%M:%S")
    mes_clave = ahora.strftime("%Y-%m")

    if os.path.exists(ARCHIVO_DATOS_LOCAL):
        with open(ARCHIVO_DATOS_LOCAL, "r", encoding="utf-8") as f:
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
        ubicacion_imp = UBICACIONES.get(ip_imp, "Ubicación Privada / No configurada")

        print(f"Escaneando {nombre_imp} ({ip_imp})...")
        
        if nombre_imp not in historial[mes_clave]["datos"]:
            historial[mes_clave]["datos"][nombre_imp] = {}
        
        historial[mes_clave]["datos"][nombre_imp]["ip"] = ip_imp
            
        es_color = (nombre_imp == "Impresora 6")
        
        contador, t_black, t_cyan, t_magenta, t_yellow = consultar_impresora_avanzado(ip_imp, es_color)
        
        procesar_alertas(nombre_imp, ip_imp, ubicacion_imp, contador, t_black, t_cyan, t_magenta, t_yellow, es_color)
        
        if str(contador).isdigit():
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
        else:
            historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"
            
        historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = t_black
        
        if es_color:
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Cian"] = t_cyan
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Magenta"] = t_magenta
            historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Amarillo"] = t_yellow

    json_final = json.dumps(historial, indent=4, ensure_ascii=False)

    with open(ARCHIVO_DATOS_LOCAL, "w", encoding="utf-8") as f:
        f.write(json_final)
    print(f"[{fecha_str}] Historial guardado localmente en la raíz.")

    subir_a_github(json_final)

if __name__ == "__main__":
    print("Monitor inteligente de impresoras iniciado...")
    while True:
        ejecutar_escaneo()
        time.sleep(TIEMPO_REPETICION)
