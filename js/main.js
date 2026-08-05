/**
 * Módulo Principal - Entry Point
 * ================================
 * Orquesta la carga de todos los módulos al iniciar la página.
 * Dependencias (orden de carga en HTML):
 *   1. config.js    → Constantes (GITHUB_USER, URL_JSON, DATOS_PROTEGIDOS_HEX, NOMBRES_MESES)
 *   2. crypto.js    → obtenerDiccionarioDescifrado()
 *   3. data-loader.js → datosHistorial, cargarDatosDesdeGitHub()
 *   4. ui.js        → formatearEtiquetaToner(), traducirMes(), renderizarTabla()
 *   5. excel-export.js → descargarExcelMensual()
 *
 * Este archivo se carga al final y arranca la aplicación.
 */

// Inicializar la aplicación al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    cargarDatosDesdeGitHub();
});

