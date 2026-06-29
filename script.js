let datosHistorial = {};

// === CONFIGURACIÓN DE RUTAS MÓVILES ===
const GITHUB_USER = "LautyMel";
const GITHUB_REPO = "Impresoras";
const urlJson = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/historial_impresoras.json`;

// 1. Cargar el JSON dinámico saltando la cache del navegador
fetch(`${urlJson}?t=${new Date().getTime()}`)
    .then(response => {
        if (!response.ok) throw new Error("No se pudo obtener el JSON");
        return response.json();
    })
    .then(data => {
        datosHistorial = data;

        const meses = Object.keys(data).sort().reverse();
        if (meses.length === 0) {
            document.getElementById('actualizacion').innerText = "El archivo de historial está vacío.";
            return;
        }

        const selector = document.getElementById('selector-mes');
        selector.innerHTML = "";

        meses.forEach(mes => {
            const opt = document.createElement('option');
            opt.value = mes;
            opt.innerText = traducirMes(mes); // Corregido para que coincida
            selector.appendChild(opt);
        });

        renderizarTabla();
    })
    .catch(err => {
        console.error(err);
        document.getElementById('actualizacion').innerHTML = "<span style='color: #e74c3c; font-weight: bold;'>Error: No se pudo conectar con los datos de GitHub. Revisa el usuario y repositorio.</span>";
    });

// Función auxiliar interna para dar estilo a cualquier tipo de tóner
function formatearEtiquetaToner(valorOriginal, prefijoColor = "") {
    if (valorOriginal === "ERROR" || valorOriginal === undefined || valorOriginal === null || valorOriginal === "") {
        return `<span class="badge-error">${prefijoColor}OFFLINE</span>`;
    }
    
    let valorToner = parseInt(valorOriginal, 10);
    let claseEstilo = "";

    if (valorToner >= 50 && valorToner <= 100) {
        claseEstilo = "toner-alto"; 
    } else if (valorToner >= 20 && valorToner < 50) {
        claseEstilo = "toner-medio";
    } else {
        claseEstilo = "toner-bajo";
    }

    return `<span class="${claseEstilo}">${prefijoColor}${valorToner}%</span>`;
}

// 2. Función para calcular diferencias y construir la interfaz HTML
function renderizarTabla() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) return;

    const mesSeleccionado = selector.value;
    const cuerpo = document.getElementById('tabla-cuerpo');
    cuerpo.innerHTML = "";

    if (!datosHistorial[mesSeleccionado]) return;

    document.getElementById('actualizacion').innerText = `Última lectura de este mes: ${datosHistorial[mesSeleccionado].ultima_actualizacion}`;

    // Calcular el mes anterior para hacer la resta del contador
    const [year, month] = mesSeleccionado.split('-').map(Number);
    const fechaMesAnterior = new Date(year, month - 2, 1);
    const mesAnteriorClave = fechaMesAnterior.getFullYear() + "-" + String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');

    const datosActuales = datosHistorial[mesSeleccionado].datos;
    const datosAnteriores = datosHistorial[mesAnteriorClave] ? datosHistorial[mesAnteriorClave].datos : null;

    for (const [nombreImp, info] of Object.entries(datosActuales)) {

        // Procesar Contador de Hojas
        let hojasMostrar = `<span class="sin-datos">0 hojas</span>`;
        const valorContadorActual = info["Contador General"];

        if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
            hojasMostrar = `<span class="badge-error">OFFLINE</span>`;
        } else if (datosAnteriores && datosAnteriores[nombreImp] && datosAnteriores[nombreImp]["Contador General"]) {
            const valorContadorAnterior = datosAnteriores[nombreImp]["Contador General"];
            if (valorContadorAnterior !== "ERROR" && valorContadorAnterior !== undefined) {
                const diferencia = Number(valorContadorActual) - Number(valorContadorAnterior);
                hojasMostrar = `<span class="badge-consumo">${diferencia.toLocaleString()} hojas</span>`;
            }
        } else {
            hojasMostrar = `<span class="badge-consumo">${Number(valorContadorActual).toLocaleString()} hojas </span>`;
        }

        // Procesar Porcentaje de Tóner Negro
        let valorOriginalNegro = info["Porcentaje Tóner Negro"] || info["Nivel de Tóner"];
        let tonerMostrar = formatearEtiquetaToner(valorOriginalNegro, "N:" );

        // Procesar Tóner de color
        if (info["Porcentaje Tóner Cian"] !== undefined) {
            let tCian = formatearEtiquetaToner(info["Porcentaje Tóner Cian"],"C:");
            let tMagenta = formatearEtiquetaToner(info["Porcentaje Tóner Magenta"],"M:");
            let tAmarillo = formatearEtiquetaToner(info["Porcentaje Tóner Amarillo"],"A:");
            
            tonerMostrar = `
                <div class="bloque-toners">
                    ${tonerMostrar} ${tCian} ${tMagenta} ${tAmarillo}
                </div>
            `;
        }

        // Insertar fila unificada por impresora
        cuerpo.innerHTML += `
            <tr>
                <td><strong>${nombreImp}</strong></td>
                <td>${info.ip || 'Sin IP'}</td>
                <td>${hojasMostrar}</td>
                <td>${tonerMostrar}</td>
            </tr>`;
    } 
} 

// 3. Función auxiliar para traducción de meses (CORREGIDO EL NOMBRE AQUÍ)
function traducirMes(mesClave) {
    const [year, month] = mesClave.split('-');
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${nombres[parseInt(month) - 1]} ${year}`;
}

// 4. Generar y descargar el reporte mensual en formato Excel (.xlsx)
function descargarExcelMensual() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) {
        alert("Por favor, selecciona un mes válido primero.");
        return;
    }

    const mesSeleccionado = selector.value;
    const nombreMesVisible = traducirMes(mesSeleccionado);
    const datosActuales = datosHistorial[mesSeleccionado]?.datos;

    if (!datosActuales) {
        alert("No hay datos disponibles para exportar.");
        return;
    }

    const [year, month] = mesSeleccionado.split('-').map(Number);
    const fechaMesAnterior = new Date(year, month - 2, 1);
    const mesAnteriorClave = fechaMesAnterior.getFullYear() + "-" + String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');
    const datosAnteriores = datosHistorial[mesAnteriorClave] ? datosHistorial[mesAnteriorClave].datos : null;

    // Estructurar el array de datos (Matriz de filas y celdas)
    const filasExcel = [
        [`REPORTE DE CONSUMO MENSUAL - ${nombreMesVisible.toUpperCase()}`],
        [`Generado automáticamente el: ${new Date().toLocaleString()}`],
        [], 
        ["Impresora", "Dirección IP", "Hojas Impresas (En el mes)", "Tóner Negro", "Tóner Cian", "Tóner Magenta", "Tóner Amarillo"]
    ];

    for (const [nombreImp, info] of Object.entries(datosActuales)) {
        let hojasCalculadas = 0;
        const valorContadorActual = info["Contador General"];

        if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
            hojasCalculadas = "OFFLINE";
        } else if (datosAnteriores && datosAnteriores[nombreImp] && datosAnteriores[nombreImp]["Contador General"]) {
            const valorContadorAnterior = datosAnteriores[nombreImp]["Contador General"];
            if (valorContadorAnterior !== "ERROR" && valorContadorAnterior !== undefined) {
                hojasCalculadas = Number(valorContadorActual) - Number(valorContadorAnterior);
            } else {
                hojasCalculadas = Number(valorContadorActual);
            }
        } else {
            hojasCalculadas = Number(valorContadorActual);
        }

        const tNegro = info["Porcentaje Tóner Negro"] || info["Nivel de Tóner"] || "N/A";
        const tCian = info["Porcentaje Tóner Cian"] || "N/A";
        const tMagenta = info["Porcentaje Tóner Magenta"] || "N/A";
        const tAmarillo = info["Porcentaje Tóner Amarillo"] || "N/A";

        filasExcel.push([
            nombreImp,
            info.ip || "Sin IP",
            hojasCalculadas,
            tNegro,
            tCian,
            tMagenta,
            tAmarillo
        ]);
    }

    // Creación técnica del archivo .xlsx con SheetJS
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filasExcel);

    // Ajustar anchos automáticos (CORREGIDO DE 'wth' A 'wch')
    const maxAnchos = filasExcel[3].map((_, colIdx) => {
        return Math.max(...filasExcel.map(row => row[colIdx] ? row[colIdx].toString().length : 0)) + 3;
    });
    ws['!cols'] = maxAnchos.map(w => ({ wch: w }));

    // Combinar fila de título (A1:G1)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

    XLSX.utils.book_append_sheet(wb, ws, `Reporte ${mesSeleccionado}`);
    XLSX.writeFile(wb, `Reporte_Impresoras_${mesSeleccionado}.xlsx`);
}
