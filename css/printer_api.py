# -*- coding: utf-8 -*-
"""
===== API LOCAL PARA ADMINISTRACIÓN DE IMPRESORAS =====
Puente entre frontend y archivos del sistema.

Este archivo es solo un punto de entrada. Toda la lógica vive en el
paquete `admin_api/`:

  admin_api/server.py         → Servidor HTTP y endpoints
  admin_api/persistencia.py   → Escritura de config.py, secretos.json, config.js e historial
  admin_api/sincronizacion.py → Subida del historial a GitHub

Endpoints:
  POST /api/actualizar-impresoras → Persiste cambios del catálogo
  POST /api/login                → Autenticación email + contraseña XOR
  GET  /api/impresoras           → Devuelve el catálogo actual

Uso:
  python printer_api.py  (corre en http://localhost:8001)
"""
import os
import sys

CARPETA_BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CARPETA_BASE)

from admin_api import main  # noqa: E402


if __name__ == "__main__":
    main()
