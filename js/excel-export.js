/**
 * Módulo de Exportación a Excel
 * ===============================
 * Genera un reporte histórico con todos los meses.
 * Las direcciones físicas/sectores están protegidas con cifrado XOR.
 * El usuario debe ingresar la contraseña para revelarlas.
 */

/**
 * Genera y descarga un archivo Excel con el historial completo.
 * Incluye columnas de dirección/sector protegidas por contraseña.
 * Muestra TODOS los meses como columnas de consumo de hojas.
 */
function descargarExcelMensual() {
    // --- 1. Solicitar contraseña para descifrar direcciones ---
    const claveIngresada = prompt("🔒 Ingrese la contraseña para incluir Direcciones y Sectores privados:");
    const claveFormateada = claveIngresada ? claveIngresada : null;
    const diccionarioDirecciones = obtenerDiccionarioDescifrado(claveFormateada);

    if (claveIngresada !== null && !diccionarioDirecciones) {
        alert("⚠️ Contraseña incorrecta. El reporte se descargará con las celdas de ubicación ocultas por seguridad.");
    }

    // --- 2. Obtener lista ordenada de meses ---
    const listaMeses = obtenerMesesOrdenados();
    if (listaMeses.length === 0) {
        alert("No hay datos disponibles para exportar.");
        return;
    }

    // --- 3. Construir encabezados dinámicos ---
    const encabezados = [
        "Impresora",
        "Dirección IP",
        "Ubicación / Sector",
        "Dirección Física"
    ];
    listaMeses.forEach(mesClave => {
        encabezados.push(`Hojas (${traducirMes(mesClave)})`);
    });

    const filasExcel = [
        [`REPORTE GENERAL HISTÓRICO DE CONSUMO`],
        [`Generado automáticamente el: ${new Date().toLocaleString()}`],
        [],
        encabezados
    ];

    // --- 4. Recolectar todas las impresoras únicas en todo el historial ---
    const todasLasImpresoras = new Set();
    listaMeses.forEach(mes => {
        if (datosHistorial[mes] && datosHistorial[mes].datos) {
            Object.keys(datosHistorial[mes].datos).forEach(nombreImp => todasLasImpresoras.add(nombreImp));
        }
    });

    // --- 5. Construir filas por impresora ---
    for (const nombreImp of todasLasImpresoras) {
        // Obtener IP (del mes más reciente donde exista)
        let ipImpresora = "";
        for (let i = listaMeses.length - 1; i >= 0; i--) {
            if (datosHistorial[listaMeses[i]].datos[nombreImp]) {
                ipImpresora = datosHistorial[listaMeses[i]].datos[nombreImp].ip || "";
                break;
            }
        }

        // Datos protegidos: si hay contraseña válida se revelan, sino "[Acceso Protegido]"
        let datosExtra = { direc: "[Acceso Protegido]", sector: "[Acceso Protegido]" };
        if (diccionarioDirecciones) {
            datosExtra = diccionarioDirecciones[ipImpresora] || { direc: "Sin Dirección", sector: "Sin Sector" };
        }

        const filaImpresora = [
            nombreImp,
            ipImpresora,
            datosExtra.sector,
            datosExtra.direc
        ];

        // --- 6. Agregar datos de cada mes ---
        listaMeses.forEach((mesClave) => {
            const datosActuales = datosHistorial[mesClave]?.datos;
            const info = datosActuales ? datosActuales[nombreImp] : null;

            if (!info) {
                filaImpresora.push("-");
                return;
            }

            const valorContadorActual = info["Contador General"];

            if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
                filaImpresora.push("OFFLINE");
            } else {
                const mesAnteriorClave = obtenerMesAnterior(mesClave, listaMeses);
                const datosAnteriores = mesAnteriorClave ? datosHistorial[mesAnteriorClave]?.datos : null;

                if (datosAnteriores && datosAnteriores[nombreImp] && datosAnteriores[nombreImp]["Contador General"]) {
                    const valorContadorAnterior = datosAnteriores[nombreImp]["Contador General"];
                    if (valorContadorAnterior !== "ERROR" && valorContadorAnterior !== undefined) {
                        filaImpresora.push(Number(valorContadorActual) - Number(valorContadorAnterior));
                    } else {
                        filaImpresora.push(Number(valorContadorActual));
                    }
                } else {
                    filaImpresora.push(Number(valorContadorActual));
                }
            }
        });

        filasExcel.push(filaImpresora);
    }

    // --- 7. Construir libro Excel con SheetJS ---
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filasExcel);

    // Combinar celda del título
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } }];

    // Formato de números con separador de miles para columnas de hojas
    for (let r = 4; r < filasExcel.length; r++) {
        for (let c = 4; c < encabezados.length; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
                ws[cellRef].z = '#,##0';
            }
        }
    }

    // Ancho automático de columnas
    const maxAnchos = filasExcel[3].map((_, colIdx) => {
        return Math.max(...filasExcel.map(row => (row[colIdx] ? row[colIdx].toString().length : 0))) + 4;
    });
    ws['!cols'] = maxAnchos.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, "Historial General");
    XLSX.writeFile(wb, "Reporte_General_Impresoras.xlsx");
}

