from github import Github, UnknownObjectException
from config import GITHUB_TOKEN, GITHUB_REPO, GITHUB_FILE_PATH

def subir_a_github(contenido_json):
    if not GITHUB_TOKEN:
        print(" -> [GitHub] Sincronización cancelada: Falta el Token de seguridad.")
        return
    try:
        g = Github(GITHUB_TOKEN)
        repo = g.get_repo(GITHUB_REPO)
        
        try:
            # Intentamos obtener el archivo existente
            contents = repo.get_contents(GITHUB_FILE_PATH)
            repo.update_file(
                path=GITHUB_FILE_PATH,
                message="Actualización automática de registros de impresoras",
                content=contenido_json,
                sha=contents.sha
            )
            print(" -> [GitHub] Sincronizado exitosamente en la nube.")
            
        except UnknownObjectException:
            # Esto se ejecuta SOLAMENTE si el archivo realmente no existe en esa ruta
            repo.create_file(
                path=GITHUB_FILE_PATH,
                message="Primer registro automático de historial",
                content=contenido_json
            )
            print(" -> [GitHub] Archivo creado por primera vez en la nube.")
            
    except Exception as e:
        print(f" -> [GitHub] ERROR CRÍTICO al subir los datos (revisá la ruta o permisos): {e}")
