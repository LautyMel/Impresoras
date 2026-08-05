"""
===== MONITOR INTELIGENTE DE IMPRESORAS v2.0 =====
Punto de entrada principal del sistema.
Orquesta: carga de secretos → escaneo SNMP → alertas → persistencia → GitHub.
Ejecuta en bucle infinito cada 10 minutos.
"""

import os
import time

from printer_monitor.config import (
    CARPETA_PROYECTO, GITHUB_REPO, GITHUB_FILE_PATH,
    TIEMPO_REPETICION, IMPRESORAS, IMPRESORAS_COLOR
)
from printer_monitor.secrets_loader import cargar_secretos
from printer_monitor.printer_scanner import consultar_impresora
from printer_monitor.alert_system import (
    configurar_alertas,
    procesar_alertas
)
from printer_monitor.github_sync import sincronizar
from printer_monitor.data_manager import (
    cargar_historial,
    guardar_historial,
    preparar_mes_actual,
    guardar_datos_impresora
)


def ejecutar_escaneo(secrets):
    """
    Ejecuta un ciclo completo de escaneo:
    1. Prepara estructura del mes
    2. Escanea cada impresora vía SNMP
    3. Procesa alertas por email
    4. Guarda en historial local
    5. Sube a GitHub
    """
    # 1. Cargar o preparar historial
    historial = cargar_historial()
    mes_clave, fecha_str = preparar_mes_actual(historial)

    # 2. Escanear cada impresora
    for nombre_imp, ip_imp in IMPRESORAS.items():
        ubicacion = secrets["ubicaciones"].get(ip_imp, "No configurada")
        es_color = nombre_imp in IMPRESORAS_COLOR

        print(f"🔍 Escaneando {nombre_imp} ({ip_imp})...")

        # Consulta SNMP
        contador, t_black, t_cyan, t_magenta, t_yellow = consultar_impresora(ip_imp, es_color)

        # Alertas por email
        procesar_alertas(
            nombre_imp, ip_imp, ubicacion,
            contador, t_black, t_cyan, t_magenta, t_yellow, es_color
        )

        # Persistir datos
        guardar_datos_impresora(
            historial, mes_clave, nombre_imp, ip_imp,
            contador, t_black, t_cyan, t_magenta, t_yellow
        )

    # 3. Guardar localmente y subir a GitHub
    json_final = guardar_historial(historial)
    print(f"[{fecha_str}] ✅ Historial guardado localmente.")

    sincronizar(json_final, secrets["github_token"], GITHUB_REPO, GITHUB_FILE_PATH)
    print("─" * 50)


if __name__ == "__main__":
    print("=" * 50)
    print("🤖 MONITOR INTELIGENTE DE IMPRESORAS v2.0")
    print("=" * 50)

    # Crear carpeta del proyecto si no existe
    os.makedirs(CARPETA_PROYECTO, exist_ok=True)

    # Cargar credenciales una sola vez
    secrets = cargar_secretos()
    configurar_alertas(secrets)

    print("✅ Monitor iniciado. Escaneando cada 10 minutos...\n")

    # Bucle infinito principal
    while True:
        ejecutar_escaneo(secrets)
        print(f"⏳ Próximo escaneo en {TIEMPO_REPETICION // 60} minutos...\n")
        time.sleep(TIEMPO_REPETICION)

