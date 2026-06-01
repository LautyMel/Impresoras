Este software es un script de automatización en Python diseñado para auditar de forma periódica el estado de un parque de impresoras en red mediante el protocolo **SNMP**. Extrae métricas críticas como el contador general de impresiones y el nivel de tóner negro, almacena localmente el historial formateado en JSON estructurado por meses y realiza un respaldo automático en la nube utilizando la API de GitHub.

---

## 1. Análisis de Librerías Utilizadas

El script combina librerías estándar de Python (nativas) con una librería externa especializada para la integración con servicios en la nube:

* **`subprocess` (Nativa):** Fundamental para la bifurcación de procesos en el sistema operativo. Permite a Python invocar el intérprete de PowerShell de Windows, enviarle scripts dinámicos y capturar sus flujos de salida (`stdout`) y errores (`stderr`).
* **`json` (Nativa):** Proporciona funciones de codificación y decodificación para el formato JSON. Convierte estructuras de datos nativas de Python (como diccionarios y listas) en texto estructurado plano y viceversa.
* **`os` (Nativa):** Proporciona una interfaz portátil para interactuar con las funciones del sistema operativo. Se utiliza para la gestión de rutas de archivos (`os.path.join`), verificación de existencias (`os.path.exists`) y creación de directorios (`os.makedirs`).
* **`time` (Nativa):** Utilizada para el control de flujos temporales. Específicamente, su función `sleep()` suspende la ejecución del hilo principal del script durante un intervalo de segundos configurado.
* **`sys` (Nativa):** Proporciona acceso a variables y funciones asociadas directamente con el intérprete de Python. *Nota: En este script actual está importada por defecto pero no realiza ninguna operación activa.*
* **`datetime` de `datetime` (Nativa):** Permite la manipulación y formateo de fechas y horas del sistema, esencial para el sellado de tiempo (*timestamping*) de los registros de auditoría.
* **`Github` de `github` (Externa - PyGithub):** Es un cliente de la API REST de GitHub (v3). Permite autenticarse mediante tokens de acceso personal (PAT) y realizar operaciones Git avanzadas como la lectura, creación y actualización de archivos en repositorios remotos sin usar el comando `git` local.

---

## 2. Explicación Línea por Línea del Código

### Sección 1: Configuración Global e Inicialización (Líneas 1-27)

```python
01: import subprocess
02: import json
03: import os
04: import time
05: import sys
06: from datetime import datetime
07: from github import Github  # Librería PyGithub
08: 
09: # ==================== CONFIGURACIÓN ====================
10: CARPETA_PROYECTO = r"C:\Users\20453243215\Desktop\pp\impresora"
11: 
12: # Configuración del Repositorio de GitHub
13: GITHUB_REPO = "LautyMel/Impresoras"       
14: GITHUB_FILE_PATH = "historial_impresoras.json" 
15: 
16: # Tiempo de espera entre escaneos (600 segundos = 10 minutos)
17: TIEMPO_REPETICION = 600
18: # =======================================================
19: 
20: ruta_token = os.path.join(CARPETA_PROYECTO, "config.txt")
21: try:
22:     with open(ruta_token, "r", encoding="utf-8") as f:
23:         GITHUB_TOKEN = f.read().strip()
24: except FileNotFoundError:
25:     print(f"❌ ERROR: No se encontró el archivo 'config.txt' en {CARPETA_PROYECTO}")
26:     print("Por favor, crea el archivo config.txt y pega tu token de GitHub adentro.")
27:     GITHUB_TOKEN = ""
Líneas 01-07: Importación de los módulos requeridos explicados en la sección anterior.

Línea 10: Define la constante de la ruta del directorio de trabajo. El prefijo r define un raw string, el cual anula el carácter de escape de las barras invertidas (\) en Windows.

Líneas 13-14: Configura las constantes del entorno Git: el identificador único del repositorio remoto (Usuario/Repositorio) y la ruta relativa del archivo de persistencia dentro del repositorio.

Línea 17: Define la tasa de refresco del bucle principal en segundos (10 minutos).

Línea 20: Utiliza os.path.join para concatenar de forma segura la ruta base del proyecto con el archivo de credenciales config.txt, garantizando compatibilidad de separadores de sistema.

Líneas 21-27 (Bloque Try-Except): Intenta abrir el archivo de configuración en modo lectura ("r") con codificación UTF-8.

Línea 23: .read().strip() lee la totalidad del archivo y remueve espacios en blanco o saltos de línea (\n) accidentales al inicio o final.

Líneas 24-27: Captura la excepción específica FileNotFoundError si el archivo de texto no existe en la ruta. En lugar de detener abruptamente la ejecución del software, imprime instrucciones correctivas en la consola y define GITHUB_TOKEN como una cadena vacía, deshabilitando la sincronización en la nube de forma segura pero manteniendo la operación local.

Sección 2: Base de Datos de Dispositivos (Líneas 29-41)
Python
29: IMPRESORAS = {
30:     "Impresora": "10.25.5.27",
31:     "Impresora 2": "10.25.5.20",
32:     "Impresora 1": "10.25.5.22",
33:     "Impresora 4": "10.25.5.28",
34:     "Impresora 5": "10.25.5.24",
35:     "Impresora 6": "10.25.5.29",
36:     "Impresora 7": "10.25.5.23",
37:     "Impresora 8": "10.25.5.25",
38:     "Impresora 9": "10.25.5.21"
39: }
Líneas 29-39: Diccionario (dict) que actúa como inventario estático de red. Mapea identificadores amigables (Strings que sirven de clave) directamente con sus respectivas direcciones IPv4 privadas. El bucle del programa iterará sobre este objeto para realizar las solicitudes SNMP de forma secuencial.

Sección 3: Consulta Avanzada vía Subproceso de PowerShell (Líneas 43-104)
Python
43: def consultar_impresora_avanzado(printer):
44:     """
45:     Ejecuta un script de PowerShell optimizado que extrae el contador general
46:     y calcula de forma inteligente el porcentaje del tóner negro analizando los índices.
47:     """
48:     ps_command = f"""
49:     $sys = New-Object -ComObject OlePrn.OleSNMP
50:     try {{
51:         $sys.Open("{printer}", "public", 2, 161)
52:         
53:         # 1. Obtener Contador
54:         try {{ $contador = $sys.Get(".1.3.6.1.2.1.43.10.2.1.4.1.1") }} catch {{ $contador = "ERROR" }}
55:         
56:         # 2. Buscar índice del Tóner Negro (revisando los primeros 6 índices de descripción)
57:         $idxToner = 1
58:         for ($i = 1; $i -le 6; $i++) {{
59:             try {{
60:                 $desc = $sys.Get(".1.3.6.1.2.1.43.11.1.1.6.1.$i").ToLower()
61:                 if ($desc -like "*black*" -or $desc -like "*negro*") {{
62:                     $idxToner = $i
63:                     break
64:                 }}
65:             }} catch {{}}
66:         }}
67: 
68:         # 3. Obtener niveles con el índice detectado
69:         try {{ $actual = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.9.1.$idxToner") }} catch {{ $actual = -1 }}
70:         try {{ $maximo = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.8.1.$idxToner") }} catch {{ $maximo = -1 }}
71: 
72:         # 4. Calcular porcentaje real
73:         if ($actual -gt 0 -and $maximo -gt 0) {{
74:             $porcentaje = [Math]::Round(($actual / $maximo) * 100)
75:             $tonerResultado = "$porcentaje%"
76:         }} elseif ($actual -eq -3) {{
77:             $tonerResultado = "OK"
78:         }} else {{
79:             $tonerResultado = "ERROR"
80:         }}
81:     }} catch {{
82:         $contador = "ERROR"
83:         $tonerResultado = "ERROR"
84:     }}
85:     
86:     # Devolver formato limpio para procesar en Python
87:     Write-Output "$contador|$tonerResultado"
88:     """
89:     try:
90:         result = subprocess.run(
91:             ["powershell", "-Command", ps_command],
92:             stdout=subprocess.PIPE, 
93:             stderr=subprocess.PIPE, 
94:             text=True, 
95:             timeout=6,
96:             creationflags=0x08000000  
97:         )
98:         if result.returncode == 0 and result.stdout.strip():
99:             partes = result.stdout.strip().split('|')
100:            if len(partes) == 2:
101:                return partes[0], partes[1]
102:        return "ERROR", "ERROR"
103:    except:
104:        return "ERROR", "ERROR"
Línea 43: Declaración de la función que recibe como argumento printer (la IP de la impresora a analizar).

Línea 48: Definición de una cadena multilínea formateada (f-string) que contiene código nativo de PowerShell. Las llaves del script original de PowerShell se duplican ({{ y }}) para que Python no las interprete erróneamente como variables de formato.

Línea 49: $sys = New-Object -ComObject OlePrn.OleSNMP: Inicializa un objeto COM heredado de Windows optimizado para la gestión y traducción de peticiones SNMP simples.

Línea 51: $sys.Open(...): Abre la conexión de red. Parámetros: IP, Comunidad SNMP ("public" por defecto), Número de reintentos (2), y puerto de escucha estándar (161).

Línea 54: Realiza una consulta síncrona Get usando el OID estándar RFC-1213/RFC-3805 (.1.3.6.1.2.1.43.10.2.1.4.1.1) que representa el contador total de impresiones de la máquina (páginas impresas históricas).

Líneas 57-66 (Algoritmo de Detección de Índice de Tóner): Dado que las impresoras organizan sus suministros (Cian, Magenta, Amarillo, Negro) en diferentes índices según marca o modelo, el bucle itera del índice 1 al 6. Consulta el OID de descripción de componente (.43.11.1.1.6.1.[i]), lo normaliza a minúsculas (.ToLower()) y valida si contiene las palabras clave "black" o "negro". Si coincide, almacena el índice en $idxToner e interrumpe el bucle (break).

Líneas 69-70: Con el índice hallado, consulta el OID de nivel actual (.43.11.1.1.9.1.[índice]) y el OID de capacidad máxima del cartucho (.43.11.1.1.8.1.[índice]), forzando su conversión a tipo entero [int].

Líneas 73-80 (Lógica Matemática y Manejo del Estándar SNMP):

Si ambos valores son positivos, calcula matemáticamente el porcentaje restante y lo redondea analíticamente con [Math]::Round().

Línea 76 (-eq -3): El estándar industrial SNMP define que un valor de -3 significa que el estado del suministro está en rangos operativos normales ("OK"), pero el hardware de la impresora no dispone de un sensor de medición milimétrica (es binario). El script mapea esto devolviendo "OK". Cualquier otra salida no contemplada define un "ERROR".

Línea 87: Emite por la consola de salida estándar una sola cadena unificada separada por un pipeline (ej: "45102|78%").

Líneas 90-97 (Ejecución y Control desde Python): Invoca subprocess.run pasando la lista de comandos de ejecución.

stdout=subprocess.PIPE / stderr=subprocess.PIPE: Redirecciona las salidas de consola para que queden almacenadas en memoria dentro del objeto result.

text=True: Fuerza a que los datos capturados se interpreten directamente como strings de texto plano decodificados y no como bytes binarios.

timeout=6: Mecanismo de seguridad crítico. Si un dispositivo de red no responde en 6 segundos (ej: apagado, fuera de línea), aborta la ejecución lanzando una excepción interna para evitar el bloqueo del bucle del programa.

creationflags=0x08000000: Corresponde a la bandera de sistema CREATE_NO_WINDOW de Windows. Esto evita de manera absoluta la apertura de ventanas negras de consola visibles en la pantalla en cada ciclo de escaneo.

Líneas 98-101: Valida si el proceso terminó sin código de error (returncode == 0). Si es así, limpia los extremos del string, segmenta el texto usando el carácter | como delimitador y retorna una tupla con los dos valores limpios listos para su procesamiento en Python.

Sección 4: Sincronización Remota con la API de GitHub (Líneas 105-132)
Python
105: def subir_a_github(contenido_json):
106:     if not GITHUB_TOKEN:
107:         print(" -> [GitHub] Sincronización cancelada: Falta el Token de seguridad.")
108:         return
109:     try:
110:         g = Github(GITHUB_TOKEN)
111:         repo = g.get_repo(GITHUB_REPO)
112:         try:
113:             contents = repo.get_contents(GITHUB_FILE_PATH)
114:             repo.update_file(
115:                 path=GITHUB_FILE_PATH,
116:                 message="Actualización automática de registros de impresoras",
117:                 content=contenido_json,
118:                 sha=contents.sha
119:             )
120:             print(" -> [GitHub] Sincronizado exitosamente en la nube.")
121:         except Exception:
122:             repo.create_file(
123:                 path=GITHUB_FILE_PATH,
124:                 message="Primer registro automático de historial",
125:                 content=contenido_json
126:             )
127:             print(" -> [GitHub] Archivo creado por primera vez en la nube.")
128:     except Exception as e:
129:         print(f" -> [GitHub] ERROR al subir los datos: {e}")
Líneas 106-108: Validación preventiva. Si la variable GITHUB_TOKEN está vacía, interrumpe inmediatamente la función mediante un return temprano para evitar llamadas fallidas al servidor web externo.

Línea 110: Instancia el cliente SDK de PyGithub pasando las credenciales.

Línea 111: Realiza una petición GET a la API para cargar la referencia abstracta del repositorio en la variable repo.

Líneas 112-120 (Flujo de Actualización): Intenta descargar los metadatos del archivo en el repositorio remoto (repo.get_contents). Si el archivo ya existe, procede a sobreescribirlo llamando a repo.update_file.

Detalle técnico crítico: En la arquitectura interna de Git y la API de GitHub, para sobreescribir un archivo es obligatorio enviar el hash SHA-1 actual del archivo (sha=contents.sha) para asegurar la consistencia y prevenir conflictos de escritura simultáneos.

Líneas 121-127 (Flujo de Creación Inicial): Si la consulta de la línea 113 falla debido a que el archivo aún no existe en el repositorio remoto, se dispara este bloque except. Invoca el método repo.create_file, el cual inicializa el archivo JSON en el repositorio por primera vez.

Líneas 128-129: Captura de forma general cualquier anomalía del entorno de red (ejemplo: pérdida de conectividad a internet, token revocado) e imprime la causa exacta del error sin provocar el colapso del script principal.

Sección 5: Orquestación, Procesamiento y Persistencia (Líneas 134-184)
Python
134: def ejecutar_escaneo():
135:     ahora = datetime.now()
136:     fecha_str = ahora.strftime("%Y-%m-%d %H:%M:%S")
137:     mes_clave = ahora.strftime("%Y-%m")
138: 
139:     # Archivo local de historial
140:     archivo_datos_local = os.path.join(CARPETA_PROYECTO, "historial_impresoras.json")
141: 
142:     if os.path.exists(archivo_datos_local):
143:         with open(archivo_datos_local, "r", encoding="utf-8") as f:
144:             try:
145:                 historial = json.load(f)
146:             except json.JSONDecodeError:
147:                 historial = {}
148:     else:
149:         historial = {}
150: 
151:     # Si cambia el mes, crea automáticamente la nueva sección conservando las anteriores
152:     if mes_clave not in historial:
153:         historial[mes_clave] = {"ultima_actualizacion": fecha_str, "datos": {}}
154: 
155:     historial[mes_clave]["ultima_actualizacion"] = fecha_str
156: 
157:     for nombre_imp, ip_imp in IMPRESORAS.items():
158:         print(f"Escaneando {nombre_imp} ({ip_imp})...")
159:         
160:         # Aseguramos que la estructura interna mantenga la IP actualizada
161:         if nombre_imp not in historial[mes_clave]["datos"]:
162:             historial[mes_clave]["datos"][nombre_imp] = {}
163:         
164:         historial[mes_clave]["datos"][nombre_imp]["ip"] = ip_imp
165:             
166:         # Llamada por red via SNMP
167:         contador, toner = consultar_impresora_avanzado(ip_imp)
168:         
169:         # Guardar Contador
170:         if contador.isdigit():
171:             historial[mes_clave]["datos"][nombre_imp]["Contador General"] = int(contador)
172:         else:
173:             historial[mes_clave]["datos"][nombre_imp]["Contador General"] = "ERROR"
174:             
175:         # Guardar Tóner
176:         historial[mes_clave]["datos"][nombre_imp]["Porcentaje Tóner Negro"] = toner
177: 
178:     json_final = json.dumps(historial, indent=4, ensure_ascii=False)
179: 
180:     with open(archivo_datos_local, "w", encoding="utf-8") as f:
181:         f.write(json_final)
182:     print(f"[{fecha_str}] Historial guardado localmente.")
183: 
184:     subir_a_github(json_final)
Líneas 135-137: Extrae el tiempo del sistema operativo. Genera fecha_str para auditorías individuales y un formato de año y mes (mes_clave, ej: "2026-06") para particionar los registros.

Líneas 142-149 (Mecanismo anti-sobreescritura): Verifica la existencia física del JSON local.

Si existe, lee su contenido y lo analiza con json.load(f) para transformarlo en un diccionario activo en memoria.

Línea 146 (json.JSONDecodeError): Si el archivo está corrupto o vacío, captura el error e inicializa la variable como un objeto vacío para evitar fallos catastróficos de ejecución.

Líneas 152-153 (Estructuración mensual dinámica): Valida si existe un nodo raíz para el mes corriente. Si no existe (cambio de mes), inicializa el nodo preservando de manera intacta todos los históricos de meses anteriores cargados previamente en memoria.

Líneas 157-164: Inicializa el bucle iterativo principal sobre la base de datos de impresoras. Crea la subestructura jerárquica para cada máquina si es la primera vez que se escanea en el mes e inyecta la dirección IP de control.

Línea 167: Invoca la función de subproceso de PowerShell descrita anteriormente pasándole la IP del dispositivo en cuestión.

Líneas 170-173: Análisis sintáctico del contador devuelto. Si la cadena está compuesta puramente por dígitos numéricos (.isdigit()), realiza una conversión explícita a tipo entero (int()), garantizando que en el JSON final se almacene como un tipo numérico real y no un texto (útil para análisis estadísticos o gráficas posteriores). De lo contrario, almacena el literal "ERROR".

Línea 178: Serializa el diccionario estructurado de memoria convirtiéndolo en un String JSON plano. Parámetros avanzados:

indent=4: Formatea el texto con sangrías estructuradas de 4 espacios haciéndolo legible al ojo humano.

ensure_ascii=False: Permite conservar caracteres especiales nativos (como el símbolo de porcentaje %, tildes o caracteres internacionales) directamente en formato UTF-8 nativo sin codificarlos en secuencias Unicode del tipo \uXXXX.

Líneas 180-184: Escribe de forma asíncrona la cadena final en el almacenamiento local y despacha el mismo string hacia la rutina de subida a internet de GitHub.

Sección 6: Punto de Entrada Principal e Inicialización (Líneas 186-196)
Python
186: if __name__ == "__main__":
187:     if not os.path.exists(CARPETA_PROYECTO):
188:         os.makedirs(CARPETA_PROYECTO)
189: 
190:     print("Monitor inteligente de impresoras iniciado...")
191:     
192:     while True:
193:         ejecutar_escaneo()
194:         time.sleep(TIEMPO_REPETICION)
Línea 186: Bloque estándar de control en Python. Asegura que el código interno sólo se ejecute si el script es ejecutado de forma directa por el intérprete (ej: python script.py) e impide su ejecución accidental si el script es importado como módulo desde otro archivo secundario.

Líneas 187-188: Evaluación defensiva del entorno físico. Comprueba si la ruta de destino definida en la variable CARPETA_PROYECTO existe en el disco duro local. Si no es así, invoca os.makedirs creando de forma recursiva todo el árbol de subcarpetas necesarias en el sistema de archivos de Windows para evitar fallos de escritura posteriores.

Línea 192: Inicializa un Bucle de Control Infinito (while True). Esto transforma el script convencional en un servicio continuo/demonio residente en la memoria del sistema.

Líneas 193-194: Llama secuencialmente al método maestro de escaneo y, tras su finalización exitosa, suspende la ejecución y libera ciclos del procesador central utilizando time.sleep durante el lapso temporal configurado (10 minutos), antes de reanudar automáticamente el ciclo completo una vez más.

3. Estructura de Salida Organizada (Archivo JSON Generado)
Para comprender la jerarquía lógica del archivo resultante historial_impresoras.json, este sigue fielmente el siguiente patrón de almacenamiento:

JSON
{
    "2026-06": {
        "ultima_actualizacion": "2026-06-01 09:15:00",
        "datos": {
            "Impresora": {
                "ip": "10.25.5.27",
                "Contador General": 45102,
                "Porcentaje Tóner Negro": "75%"
            },
            "Impresora 2": {
                "ip": "10.25.5.20",
                "Contador General": "ERROR",
                "Porcentaje Tóner Negro": "ERROR"
            }
        }
    }
}
