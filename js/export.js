import { obtenerDiccionarioDescifrado } from './crypto.js';
import { traducirMes } from './utils.js';

export function descargarExcelMensual(datosHistorial) {
    const claveIngresada = prompt("🔒 Ingrese la contraseña para incluir Direcciones y Sectores privados:");
    const claveFormateada = claveIngresada ? claveIngresada : null;
    const diccionarioDirecciones = obtenerDiccionarioDescifrado(claveFormateada);

    if (claveIngresada !== null && !diccionarioDirecciones) {
        alert("⚠️ Contraseña incorrecta. El reporte se descargará con las celdas de ubicación ocultas por seguridad.");
    }

    const listaMeses = Object.keys(datosHistorial).sort(); 
    if (listaMeses.length === 0) {
        alert("No hay datos disponibles para exportar.");
        return;
    }

    const encabezados = ["Impresora", "Dirección IP", "Ubicación / Sector", "Dirección Física"];
    listaMeses.forEach(mesClave => encabezados.push(`Hojas (${traducirMes(mesClave)})`));

    const filasExcel = [
        [`REPORTE GENERAL HISTÓRICO DE CONSUMO`],
        [`Generado automáticamente el: ${new Date().toLocaleString()}`],
        [], 
        encabezados
    ];

    const todasLasImpresoras = new Set();
    listaMeses.forEach(mes => {
        if (datosHistorial[mes] && datosHistorial[mes].datos) {
            Object.keys(datosHistorial[mes].datos).forEach(nombreImp => todasLasImpresoras.add(nombreImp));
        }
    });

    for (const nombreImp of todasLasImpresoras) {
        let ipImpresora = "";
        for (let i = listaMeses.length - 1; i >= 0; i--) {
            if (datosHistorial[listaMeses[i]].datos[nombreImp]) {
                ipImpresora = datosHistorial[listaMeses[i]].datos[nombreImp].ip || "";
                break;
            }
        }

        let datosExtra = { direc: "[Acceso Protegido]", sector: "[Acceso Protegido]" };
        if (diccionarioDirecciones) {
            datosExtra = diccionarioDirecciones[ipImpresora] || { direc: "Sin Dirección", sector: "Sin Sector" };
        }

        const filaImpresora = [nombreImp, ipImpresora, datosExtra.sector, datosExtra.direc];

        listaMeses.forEach((mesSeleccionado) => {
            const info = datosHistorial[mesSeleccionado]?.datos?.[nombreImp];

            if (!info) {
                filaImpresora.push("-"); 
                return;
            }

            const valorContadorActual = info["Contador General"];
            if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
                filaImpresora.push("OFFLINE");
            } else {
                const posicionActual = listaMeses.indexOf(mesSeleccionado);
                const mesAnteriorClave = posicionActual > 0 ? listaMeses[posicionActual - 1] : null;
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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filasExcel);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } }];

    for (let r = 4; r < filasExcel.length; r++) {
        for (let c = 4; c < encabezados.length; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
                ws[cellRef].z = '#,##0';
            }
        }
    }

    const maxAnchos = filasExcel[3].map((_, colIdx) => Math.max(...filasExcel.map(row => row[colIdx] ? row[colIdx].toString().length : 0)) + 4);
    ws['!cols'] = maxAnchos.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, "Historial General");
    XLSX.writeFile(wb, "Reporte_General_Impresoras.xlsx");
}