let datosHistorial = {};

// === CONFIGURACIÓN DE RUTAS MÓVILES ===
const GITHUB_USER = "LautyMel";
const GITHUB_REPO = "Impresoras";
const urlJson = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/historial_impresoras.json`;

// 🔒 DICCIONARIO 
const DATOS_PROTEGIDOS_HEX = "124b52471c0b3f3604043b2a26372c3d3a2364022a766217733433366d6d2a7c363d3e2324393e36263564122d2f66302e20250d23602a363d233e3d643d2c253b302c2e3d36353d2d643d223533353164122d2f66302e20250d23602a363d233e3d643d2c253b302c2e3d36353d2d643c3d6c2d623230203d66323425313a3e64353e22253b3024212720232464122d2f66302e20250d23602a363d233e3d643d2c253b302c2e3d36353d2d643d223533353064122d2f66302e20250d23602a363d233e3d64122544254b3c20202d641c2a2c3a2624213d2a64122d2f66302e20250d23602a363d233e3d643d2c253b302c2e3d36353d2d643d223533353064122d2f66302e20250d23602a363d233e3d6412242124233764022a7c363d3e2324393e36263564122d2f66302e20250d23602a363d233e3d641c22272221641a3c3064122d2f66302e20250d23602a363d233e3d64122544254b3c20202d641224212423313064022a7c363d3e2324393e36263564122d2f66302e20250d23602a363d233e3d641a3433342d3d373d322164122d2f66302e20250d23602a363d233e3d64122544254b3c20202d6412242124233664022a7c363d3e2324393e36263564122d2f66302e20250d23602a363d233e3d64132b64122d2f66302e20250d23602a363d233e3d64122544254b3c20202d6412242124233164022a7c363d3e2324393e36263564122d2f66302e20250d23602a363d233e3d641f22272221641e303c641831213f2d242f366431302d3364122d2f66302e20250d23602a363d233e3d64122544254b3c20202d6412242124233064022a7c363d3e2324393e36263564122d2f66302e20250d23602a363d233e3d643b333124313a6431302d33642a3564233627233664122d2f66302e20250d23602a363d233e3d64122544254b3c20202d6d3d";
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
        if (selector) {
            selector.innerHTML = "";
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

// 2. Función para calcular diferencias y construir la interfaz web
function renderizarTabla() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) return;

    const mesSeleccionado = selector.value;
    const cuerpo = document.getElementById('tabla-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = "";

    if (!datosHistorial[mesSeleccionado]) return;

    const actEl = document.getElementById('actualizacion');
    if (actEl) {
        actEl.innerText = `Última lectura de este mes: ${datosHistorial[mesSeleccionado].ultima_actualizacion}`;
    }

    const listaMeses = Object.keys(datosHistorial).sort();
    const posicionActual = listaMeses.indexOf(mesSeleccionado);
    const mesAnteriorClave = posicionActual > 0 ? listaMeses[posicionActual - 1] : null;

    const datosActuales = datosHistorial[mesSeleccionado].datos;
    const datosAnteriores = mesAnteriorClave ? datosHistorial[mesAnteriorClave].datos : null;

    for (const [nombreImp, info] of Object.entries(datosActuales)) {
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

        let valorOriginalNegro = info["Porcentaje Tóner Negro"] || info["Nivel de Tóner"];
        let tonerMostrar = formatearEtiquetaToner(valorOriginalNegro, "N:" );

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

        cuerpo.innerHTML += `
            <tr>
                <td><strong>${nombreImp}</strong></td>
                <td>${info.ip || 'Sin IP'}</td>
                <td>${hojasMostrar}</td>
                <td>${tonerMostrar}</td>
            </tr>`;
    } 
} 

// 3. Función auxiliar para nombres de meses
function traducirMes(mesClave) {
    if (!mesClave || !mesClave.includes('-')) return mesClave;
    const [year, month] = mesClave.split('-');
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${nombres[parseInt(month) - 1]} ${year}`;
}

// 🔒 FUNCIÓN CRIPTOGRÁFICA REVISADA
function obtenerDiccionarioDescifrado(clave) {
    if (!clave) return null;
    try {
        let str = "";
        for (let i = 0; i < DATOS_PROTEGIDOS_HEX.length; i += 2) {
            let byte = parseInt(DATOS_PROTEGIDOS_HEX.substring(i, i + 2), 16);
            let charClave = clave.charCodeAt((i / 2) % clave.length);
            str += String.fromCharCode(byte ^ charClave); 
        }
        return JSON.parse(str); 
    } catch (e) {
        return null;
    }
}

// 4. FUNCIÓN EXCEL HISTÓRICA GENERAL
function descargarExcelMensual() {
    const claveIngresada = prompt("🔒 Ingrese la contraseña para incluir Direcciones y Sectores privados:");
    
    const claveFormateada = claveIngresada ? claveIngresada.toLowerCase() : null;
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
    listaMeses.forEach(mesClave => {
        encabezados.push(`Hojas (${traducirMes(mesClave)})`);
    });

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

        const filaImpresora = [
            nombreImp,
            ipImpresora,
            datosExtra.sector,
            datosExtra.direc
        ];

        listaMeses.forEach((mesSeleccionado) => {
            const datosActuales = datosHistorial[mesSeleccionado]?.datos;
            const info = datosActuales ? datosActuales[nombreImp] : null;

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

    const maxAnchos = filasExcel[3].map((_, colIdx) => {
        return Math.max(...filasExcel.map(row => row[colIdx] ? row[colIdx].toString().length : 0)) + 4;
    });
    ws['!cols'] = maxAnchos.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, "Historial General");
    XLSX.writeFile(wb, "Reporte_General_Impresoras.xlsx");
}
