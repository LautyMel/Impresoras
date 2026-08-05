# -*- coding: utf-8 -*-
"""
Módulo de Sincronización con GitHub
=====================================
Sube el historial local al repositorio remoto usando el token configurado.
"""
from .persistencia import RUTA_HISTORIAL


def sincronizar_github():
    """Lee el historial local y lo sube a GitHub si hay token configurado."""
    from printer_monitor.github_sync import sincronizar
    from printer_monitor.config import GITHUB_REPO, GITHUB_FILE_PATH
    from printer_monitor.secrets_loader import cargar_secretos

    token = cargar_secretos().get("github_token", "")
    if not token:
        print("   ⚠️ Token de GitHub no configurado.")
        return

    with open(RUTA_HISTORIAL, "r", encoding="utf-8") as f:
        sincronizar(f.read(), token, GITHUB_REPO, GITHUB_FILE_PATH)
