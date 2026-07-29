/**
 * Módulo de Carga de Datos - Fetch desde GitHub
 * ===============================================
 * Obtiene el historial JSON desde GitHub y lo prepara para la UI.
 */

/** Variable global que almacena todo el historial cargado */
let datosHistorial = {};

/**
 * Carga el JSON de historial desde GitHub, saltando caché.
 * Puebla el selector de meses y renderiza la tabla inicial.
 */
function cargarDatosDesdeGitHub() {
    fetch(`${URL_JSON}?t=${new Date().getTime()}`)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo obtener el JSON");
            return response.json();
        })
        .then(data => {
            datosHistorial = data;

            const meses = Object.keys(data).sort().reverse();
            if (meses.length === 0) {
                const el = document.getElementById('actualizacion');
                if (el) el.innerText = "El archivo de historial está vacío.";
                return;
            }

            const selector = document.getElementById('selector-mes');
            if (selector) {
                selector.innerHTML = '<option value="">-- Seleccionar mes --</option>';
                meses.forEach(mes => {
                    const opt = document.createElement('option');
                    opt.value = mes;
                    opt.innerText = traducirMes(mes);
                    selector.appendChild(opt);
                });
            }

            renderizarTabla();
        })
        .catch(err => {
            console.error(err);
            const el = document.getElementById('actualizacion');
            if (el) {
                el.innerHTML = "<span style='color: #e74c3c; font-weight: bold;'>Error: No se pudo conectar con los datos de GitHub. Revisa el usuario y repositorio.</span>";
            }
        });
}

