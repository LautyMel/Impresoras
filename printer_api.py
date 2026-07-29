# -*- coding: utf-8 -*-
"""
===== API LOCAL PARA ADMINISTRACIÓN DE IMPRESORAS =====
Sirve como puente entre el frontend (panel admin) y los archivos del sistema.
Permite guardar los cambios del catálogo de impresoras sin editar archivos manualmente.

Endpoints:
  POST /api/actualizar-impresoras → Recibe la lista de impresoras y persiste los cambios

Uso:
  python printer_api.py
  (corre en http://localhost:8001)
"""

import json
import os
import re
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# ==================== RUTAS ====================
CARPETA_BASE = os.path.dirname(os.path.abspath(__file__))
RUTA_CONFIG_PY = os.path.join(CARPETA_BASE, "printer_monitor", "config.py")
RUTA_CONFIG_JS = os.path.join(CARPETA_BASE, "js", "config.js")
RUTA_SECRETOS = os.path.join(CARPETA_BASE, "secretos.json")
RUTA_HISTORIAL = os.path.join(CARPETA_BASE, "historial_impresoras.json")


class APIHandler(BaseHTTPRequestHandler):
    """Manejador HTTP para la API de administración."""

    def do_OPTIONS(self):
        """CORS preflight."""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/actualizar-impresoras":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            self._procesar_actualizacion(body)
        else:
            self._responder_error(404, "Endpoint no encontrado")

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _responder_json(self, codigo, datos):
        self.send_response(codigo)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(datos, ensure_ascii=False).encode("utf-8"))

    def _responder_error(self, codigo, mensaje):
        self._responder_json(codigo, {"success": False, "error": mensaje})

    # ==================== PROCESAR ACTUALIZACIÓN ====================

    def _procesar_actualizacion(self, body):
        try:
            datos = json.loads(body)
        except json.JSONDecodeError:
            self._responder_error(400, "JSON inválido")
            return

        impresoras = datos.get("impresoras", [])
        hash_cifrado = datos.get("hash", "")

        if not impresoras:
            self._responder_error(400, "La lista de impresoras está vacía")
            return

        errores = []

        # 1. Actualizar printer_monitor/config.py
        try:
            self._actualizar_config_py(impresoras)
            print("✅ config.py actualizado")
        except Exception as e:
            errores.append(f"config.py: {e}")
            print(f"❌ config.py: {e}")

        # 2. Actualizar secretos.json
        try:
            self._actualizar_secretos(impresoras)
            print("✅ secretos.json actualizado")
        except Exception as e:
            errores.append(f"secretos.json: {e}")
            print(f"❌ secretos.json: {e}")

        # 3. Actualizar js/config.js (hash cifrado)
        if hash_cifrado:
            try:
                self._actualizar_config_js(hash_cifrado)
                print("✅ config.js actualizado")
            except Exception as e:
                errores.append(f"config.js: {e}")
                print(f"❌ config.js: {e}")

        # 4. Actualizar historial_impresoras.json (agregar/quitar impresoras)
        try:
            self._actualizar_historial(impresoras)
            print("✅ historial_impresoras.json actualizado")
        except Exception as e:
            errores.append(f"historial: {e}")
            print(f"❌ historial_impresoras.json: {e}")

        # 5. Subir a GitHub (usando la lógica existente)
        try:
            self._sincronizar_github()
            print("✅ Sincronizado con GitHub")
        except Exception as e:
            errores.append(f"github: {e}")
            print(f"❌ GitHub sync: {e}")

        if errores:
            self._responder_json(200, {
                "success": True,
                "warnings": errores,
                "message": "Cambios guardados con algunas advertencias."
            })
        else:
            self._responder_json(200, {
                "success": True,
                "message": "Catálogo de impresoras actualizado correctamente."
            })

    # ==================== ACTUALIZAR config.py ====================

    def _actualizar_config_py(self, impresoras):
        if not os.path.exists(RUTA_CONFIG_PY):
            raise FileNotFoundError(f"No se encontró {RUTA_CONFIG_PY}")

        with open(RUTA_CONFIG_PY, "r", encoding="utf-8") as f:
            contenido = f.read()

        # Generar nuevo bloque IMPRESORAS
        lineas_impresoras = "IMPRESORAS = {\n"
        for i, imp in enumerate(impresoras, 1):
            nombre = imp["nombre"]
            ip = imp["ip"]
            lineas_impresoras += f'    "{nombre}": "{ip}",\n'
        lineas_impresoras += "}\n"

        # Generar nuevo bloque IMPRESORAS_COLOR (detecta automáticamente)
        # Por ahora mantenemos las que ya estaban, o añadimos por detección
        # Buscamos las que ya están marcadas como color (o usamos las que tenían tóners de color antes)
        nombres = [imp["nombre"] for imp in impresoras]
        
        # Intentar preservar las que ya eran color
        match_color = re.search(r'IMPRESORAS_COLOR\s*=\s*\{([^}]+)\}', contenido, re.DOTALL)
        impresoras_color_existentes = set()
        if match_color:
            # Extraer nombres del set existente
            bloque_color = match_color.group(1)
            for n in re.findall(r'"([^"]+)"', bloque_color):
                impresoras_color_existentes.add(n)
        
        # Solo mantener las que siguen existiendo
        impresoras_color_filtradas = {n for n in impresoras_color_existentes if n in nombres}
        
        # Si no hay ninguna, por defecto marcar la que tenga "6" o "Color" en el nombre
        if not impresoras_color_filtradas:
            for imp in impresoras:
                if "color" in imp["nombre"].lower() or "6" in imp["nombre"]:
                    impresoras_color_filtradas.add(imp["nombre"])
                    break

        if impresoras_color_filtradas:
            lista_color = ", ".join(f'"{n}"' for n in sorted(impresoras_color_filtradas))
            lineas_color = f"IMPRESORAS_COLOR = {{{lista_color}}}\n"
        else:
            lineas_color = "IMPRESORAS_COLOR = set()\n"

        # Reemplazar en el archivo
        contenido = re.sub(
            r'IMPRESORAS\s*=\s*\{[^}]*\}',
            lineas_impresoras.rstrip(),
            contenido,
            flags=re.DOTALL
        )
        contenido = re.sub(
            r'IMPRESORAS_COLOR\s*=\s*\{[^}]*\}',
            lineas_color.rstrip(),
            contenido,
            flags=re.DOTALL
        )

        with open(RUTA_CONFIG_PY, "w", encoding="utf-8") as f:
            f.write(contenido)

    # ==================== ACTUALIZAR secretos.json ====================

    def _actualizar_secretos(self, impresoras):
        # Cargar secretos existentes o crear estructura por defecto
        if os.path.exists(RUTA_SECRETOS):
            with open(RUTA_SECRETOS, "r", encoding="utf-8") as f:
                secretos = json.load(f)
        else:
            secretos = {
                "github_token": "",
                "correo_remitente": "",
                "clave_correo": "",
                "correos_destino": [],
                "ubicaciones": {}
            }

        # Actualizar ubicaciones
        ubicaciones = {}
        for imp in impresoras:
            if imp.get("ubicacion", "").strip():
                ubicaciones[imp["ip"]] = imp["ubicacion"].strip()

        secretos["ubicaciones"] = ubicaciones

        with open(RUTA_SECRETOS, "w", encoding="utf-8") as f:
            json.dump(secretos, f, indent=4, ensure_ascii=False)

    # ==================== ACTUALIZAR config.js ====================

    def _actualizar_config_js(self, hash_cifrado):
        if not os.path.exists(RUTA_CONFIG_JS):
            raise FileNotFoundError(f"No se encontró {RUTA_CONFIG_JS}")

        with open(RUTA_CONFIG_JS, "r", encoding="utf-8") as f:
            contenido = f.read()

        # Reemplazar el hash hex
        contenido = re.sub(
            r'(DATOS_PROTEGIDOS_HEX\s*=\s*")[^"]*(")',
            rf'\g<1>{hash_cifrado}\g<2>',
            contenido
        )

        with open(RUTA_CONFIG_JS, "w", encoding="utf-8") as f:
            f.write(contenido)

    # ==================== ACTUALIZAR historial_impresoras.json ====================

    def _actualizar_historial(self, impresoras):
        # Cargar historial existente
        if os.path.exists(RUTA_HISTORIAL):
            with open(RUTA_HISTORIAL, "r", encoding="utf-8") as f:
                historial = json.load(f)
        else:
            historial = {}

        # Obtener nombres e IPs nuevos
        nuevas_impresoras = {imp["nombre"]: imp["ip"] for imp in impresoras}
        nuevos_nombres = set(nuevas_impresoras.keys())

        for mes, data in historial.items():
            datos_mes = data.get("datos", {})
            nombres_existentes = set(datos_mes.keys())

            # Eliminar impresoras que ya no están en el catálogo
            for nombre in list(nombres_existentes):
                if nombre not in nuevos_nombres:
                    del datos_mes[nombre]
                    print(f"   → {nombre} eliminada del mes {mes}")

            # Agregar impresoras nuevas (con datos vacíos)
            for nombre, ip in nuevas_impresoras.items():
                if nombre not in datos_mes:
                    datos_mes[nombre] = {
                        "ip": ip,
                        "Contador General": 0,
                        "Porcentaje Tóner Negro": "N/A"
                    }
                    print(f"   → {nombre} agregada al mes {mes}")

        with open(RUTA_HISTORIAL, "w", encoding="utf-8") as f:
            json.dump(historial, f, indent=4, ensure_ascii=False)

    # ==================== SINCRONIZAR CON GITHUB ====================

    def _sincronizar_github(self):
        """Usa el módulo existente github_sync para subir el historial actualizado."""
        # Agregamos la carpeta del proyecto al path para importar
        sys.path.insert(0, CARPETA_BASE)

        from printer_monitor.github_sync import sincronizar
        from printer_monitor.config import GITHUB_REPO, GITHUB_FILE_PATH
        from printer_monitor.secrets_loader import cargar_secretos

        secrets = cargar_secretos()
        token = secrets.get("github_token", "")

        if not token:
            print("   ⚠️ Token de GitHub no configurado. No se puede subir a la nube.")
            return

        # Leer el historial actualizado
        with open(RUTA_HISTORIAL, "r", encoding="utf-8") as f:
            json_content = f.read()

        sincronizar(json_content, token, GITHUB_REPO, GITHUB_FILE_PATH)


# ==================== SERVIDOR ====================

def main():
    host = "localhost"
    port = 8001

    server = HTTPServer((host, port), APIHandler)
    print("=" * 55)
    print("  🖨️  API de Administración de Impresoras")
    print("=" * 55)
    print(f"  🌐 http://{host}:{port}")
    print(f"  📁 {CARPETA_BASE}")
    print(f"  ⏺️  POST /api/actualizar-impresoras")
    print("-" * 55)
    print("  Presione Ctrl+C para detener.")
    print("=" * 55)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 API detenida.")
        server.server_close()


if __name__ == "__main__":
    main()

