# -*- coding: utf-8 -*-
"""
Paquete de API de Administración de Impresoras
================================================
Separa la lógica en módulos:
  - persistencia.py : escritura de config.py, secretos.json, config.js e historial
  - sincronizacion.py: subida del historial a GitHub
  - server.py        : servidor HTTP y manejador de endpoints
"""
from .server import main

__all__ = ["main"]
