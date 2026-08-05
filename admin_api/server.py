# -*- coding: utf-8 -*-
"""
Servidor HTTP de la API de Administración de Impresoras
==========================================================
Expone los endpoints:
  GET  /api/impresoras           → Catálogo actual
  POST /api/login                → Autenticación email + contraseña XOR
  POST /api/actualizar-impresoras → Persiste cambios del catálogo
"""
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

from . import persistencia, sincronizacion
from printer_monitor.admin_api import validar_login, obtener_catalogo


class APIHandler(BaseHTTPRequestHandler):
    """Manejador HTTP para la API de administración."""

    # ==================== CORS ====================

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    # ==================== GET ====================

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/impresoras":
            impresoras = obtener_catalogo(
                persistencia.RUTA_CONFIG_PY, persistencia.RUTA_SECRETOS
            )
            self._responder_json(200, {"success": True, "impresoras": impresoras})
        else:
            self._responder_error(404, "Endpoint no encontrado")

    # ==================== POST ====================

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/actualizar-impresoras":
            body = self._leer_cuerpo()
            self._procesar_actualizacion(body)
        elif parsed.path == "/api/login":
            body = self._leer_cuerpo()
            self._procesar_login(body)
        else:
            self._responder_error(404, "Endpoint no encontrado")

    # ==================== LOGIN ====================

    def _procesar_login(self, body):
        datos = self._parsear_json(body)
        if datos is None:
            return

        exito, mensaje, impresoras = validar_login(
            datos.get("email", "").strip().lower(),
            datos.get("password", ""),
            persistencia.RUTA_SECRETOS,
            persistencia.RUTA_CONFIG_JS,
        )

        if exito:
            self._responder_json(200, {
                "success": True,
                "message": "Autenticación exitosa",
                "impresoras": impresoras,
            })
        else:
            self._responder_error(401, mensaje)

    # ==================== ACTUALIZAR ====================

    def _procesar_actualizacion(self, body):
        datos = self._parsear_json(body)
        if datos is None:
            return

        impresoras, hash_cifrado = datos.get("impresoras", []), datos.get("hash", "")
        if not impresoras:
            self._responder_error(400, "La lista de impresoras está vacía")
            return

        errores = []

        # Archivos locales críticos
        for nombre, fn in [
            ("config.py", lambda: persistencia.actualizar_config_py(impresoras)),
            ("secretos.json", lambda: persistencia.actualizar_secretos(impresoras)),
            ("historial", lambda: persistencia.actualizar_historial(impresoras)),
        ]:
            try:
                fn()
                print(f"✅ {nombre} actualizado")
            except Exception as e:
                errores.append(f"{nombre}: {e}")
                print(f"❌ {nombre}: {e}")

        # Config JS (opcional)
        if hash_cifrado:
            try:
                persistencia.actualizar_config_js(hash_cifrado)
                print("✅ config.js actualizado")
            except Exception as e:
                errores.append(f"config.js: {e}")

        # Sincronización con GitHub (opcional)
        try:
            sincronizacion.sincronizar_github()
            print("✅ Sincronizado con GitHub")
        except Exception as e:
            errores.append(f"github: {e}")

        # Si falló un archivo crítico, la operación NO es un éxito total
        exito = not any(
            e.startswith(("config.py:", "secretos.json:", "historial:"))
            for e in errores
        )

        self._responder_json(200, {
            "success": exito,
            "warnings": errores if errores else None,
            "message": (
                "Catálogo actualizado correctamente."
                if exito
                else "Guardado con errores: " + "; ".join(errores)
            ),
        })

    # ==================== HELPERS ====================

    def _leer_cuerpo(self):
        try:
            return self.rfile.read(int(self.headers.get("Content-Length", 0)))
        except (ValueError, OSError):
            return b""

    def _parsear_json(self, body):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            self._responder_error(400, "JSON inválido")
            return None

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _responder_json(self, codigo, datos):
        self.send_response(codigo)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(datos, ensure_ascii=False).encode("utf-8"))

    def _responder_error(self, codigo, mensaje):
        self._responder_json(codigo, {"success": False, "error": mensaje})


def main():
    host, port = "localhost", 8001
    server = HTTPServer((host, port), APIHandler)
    print("=" * 55)
    print("  🖨️  API de Administración de Impresoras")
    print("=" * 55)
    print(f"  🌐 http://{host}:{port}")
    print("  ⏺️  POST /api/actualizar-impresoras")
    print("  ⏺️  POST /api/login")
    print("  ⏺️  GET  /api/impresoras")
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
