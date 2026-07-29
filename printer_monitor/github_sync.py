"""
Módulo de Sincronización con GitHub
====================================
Sube el historial JSON al repositorio remoto usando PyGithub.
"""

from github import Github


def sincronizar(json_content, github_token, repo_name, file_path):
    """
    Sube o actualiza un archivo JSON en un repositorio de GitHub.

    Args:
        json_content: str con contenido JSON formateado
        github_token: Token de acceso personal de GitHub
        repo_name: "Usuario/Repositorio"
        file_path: Ruta del archivo dentro del repo (ej: "historial_impresoras.json")
    """
    if not github_token:
        print(" -> [GitHub] Sincronización cancelada: Token no configurado.")
        return

    try:
        g = Github(github_token)
        repo = g.get_repo(repo_name)

        try:
            # Intentar obtener el archivo existente
            contents = repo.get_contents(file_path)
            repo.update_file(
                path=file_path,
                message="Actualización automática - Monitor de Impresoras",
                content=json_content,
                sha=contents.sha
            )
            print(" -> [GitHub] Archivo ACTUALIZADO exitosamente en la nube.")
        except Exception:
            # El archivo no existe → crearlo
            repo.create_file(
                path=file_path,
                message="Inicialización - Historial de Impresoras",
                content=json_content
            )
            print(" -> [GitHub] Archivo CREADO por primera vez en la nube.")

    except Exception as e:
        print(f" -> [GitHub] ERROR de conexión/sincronización: {e}")

