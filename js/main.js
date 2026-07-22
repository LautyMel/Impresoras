import { cargarDatos } from './api.js';
import { poblarSelector, renderizarTabla } from './ui.js';
import { descargarExcelMensual } from './export.js';

let datosHistorialGlobal = {};

async function inicializarAplicacion() {
    try {
        // 1. Traer datos
        datosHistorialGlobal = await cargarDatos();
        
        const meses = Object.keys(datosHistorialGlobal).sort().reverse();
        if (meses.length === 0) {
            document.getElementById('actualizacion').innerText = "El archivo de historial está vacío.";
            return;
        }

        // 2. Armar interfaz visual
        poblarSelector(meses);
        
        const selector = document.getElementById('selector-mes');
        renderizarTabla(datosHistorialGlobal, selector.value);

        // 3. Activar los botones y selects
        selector.addEventListener('change', (e) => {
            renderizarTabla(datosHistorialGlobal, e.target.value);
        });

        document.getElementById('btn-excel').addEventListener('click', () => {
            descargarExcelMensual(datosHistorialGlobal);
        });

    } catch (err) {
        document.getElementById('actualizacion').innerHTML = "<span style='color: #e74c3c; font-weight: bold;'>Error: No se pudo conectar con los datos de GitHub. Revisa el usuario y repositorio.</span>";
    }
}

// Arrancar apenas cargue la página
document.addEventListener('DOMContentLoaded', inicializarAplicacion);