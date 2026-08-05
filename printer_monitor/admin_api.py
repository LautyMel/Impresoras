"""
Módulo de API de Administración
================================
Maneja la lógica de autenticación y lectura del catálogo de impresoras.
Separado de printer_api.py para mantener el código modular.
"""

import json
import os
import re


def validar_login(email, password, ruta_secretos, ruta_config_js):
    """
    Valida email contra correos_destino y contraseña contra la clave XOR.
    Retorna (exito, mensaje, impresoras).
    """
    # 1. Validar email contra secretos.json
    if not os.path.exists(ruta_secretos):
        return False, "Archivo de secretos no encontrado", []

    with open(ruta_secretos, "r", encoding="utf-8") as f:
        secretos = json.load(f)

    correos_destino = [c.strip().lower() for c in secretos.get("correos_destino", [])]
    if email not in correos_destino:
        return False, "Email no autorizado", []

    # 2. Validar contraseña intentando descifrar DATOS_PROTEGIDOS_HEX
    if not os.path.exists(ruta_config_js):
        return False, "Archivo config.js no encontrado", []

    with open(ruta_config_js, "r", encoding="utf-8") as f:
        config_js = f.read()

    match = re.search(r'DATOS_PROTEGIDOS_HEX\s*=\s*"([^"]+)"', config_js)
    if not match:
        return False, "Hash cifrado no encontrado en config.js", []

    hex_data = match.group(1)

    try:
        str_descifrado = ""
        for i in range(0, len(hex_data), 2):
            byte = int(hex_data[i:i+2], 16)
            char_clave = ord(password[(i // 2) % len(password)])
            str_descifrado += chr(byte ^ char_clave)
        json.loads(str_descifrado)
    except Exception:
        return False, "Contraseña incorrecta", []

    # 3. Login exitoso → obtener catálogo
    impresoras = obtener_catalogo(ruta_config_py=os.path.join(
        os.path.dirname(ruta_config_js), "..", "printer_monitor", "config.py"
    ), ruta_secretos=ruta_secretos)

    return True, "Autenticación exitosa", impresoras


def obtener_catalogo(ruta_config_py, ruta_secretos):
    """
    Lee config.py y devuelve la lista actual de impresoras con sus datos.
    """
    impresoras = []
    try:
        if not os.path.exists(ruta_config_py):
            return impresoras

        with open(ruta_config_py, "r", encoding="utf-8") as f:
            contenido = f.read()

        # Extraer IMPRESORAS
        match_imp = re.search(r'IMPRESORAS\s*=\s*\{(.*?)\}', contenido, re.DOTALL)
        if not match_imp:
            return impresoras

        # Extraer pares nombre: ip
        for match in re.finditer(r'"([^"]+)"\s*:\s*"([^"]+)"', match_imp.group(1)):
            nombre = match.group(1)
            ip = match.group(2)
            impresoras.append({"nombre": nombre, "ip": ip, "ubicacion": "", "es_color": False})

        # Extraer IMPRESORAS_COLOR (soporta "set()" y "{...}")
        match_color = re.search(
            r'IMPRESORAS_COLOR\s*=\s*(?:set\(\)|\{(.*?)\})', contenido, re.DOTALL
        )
        if match_color:
            for n in re.findall(r'"([^"]+)"', match_color.group(1) or ""):
                for imp in impresoras:
                    if imp["nombre"] == n:
                        imp["es_color"] = True

        # Agregar ubicaciones desde secretos.json
        if os.path.exists(ruta_secretos):
            with open(ruta_secretos, "r", encoding="utf-8") as f:
                secretos = json.load(f)
            ubicaciones = secretos.get("ubicaciones", {})
            for imp in impresoras:
                if imp["ip"] in ubicaciones:
                    imp["ubicacion"] = ubicaciones[imp["ip"]]

    except Exception as e:
        print(f"⚠️ Error leyendo catálogo: {e}")

    return impresoras
