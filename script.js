let datosHistorial = {};

// === CONFIGURACIÓN DE RUTAS MÓVILES ===
const GITHUB_USER = "LautyMel";
const GITHUB_REPO = "Impresoras";
const urlJson = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/historial_impresoras.json`;

// 🔒 DICCIONARIO ENCRIPTADO 
const DATOS_PROTEGIDOS_HEX = "7b2231302e3230392e33342e3639223a7b22736563746f72223a225472616e73706f7274652f4c6f6769737469636120284265746f204669676c69616e6f29222c226469726563223a22417664612e204361737461c3b1617265732032333531227d2c2231302e3230392e38372e3239223a7b22736563746f72223a224f6669632e205465636e69636120284665726e616e646f20416c626172726163696e29222c226469726563223a22417664612e204361737461c3b1617265732032333530227d2c2231302e3230392e38372e313432223a7b22736563746f72223a22476572656e63696120284c7569732047526f736d616e29222c226469726563223a22417664612e204361737461c3b1617265732032333530227d2c2231302e32352e352e3234223a7b22736563746f72223a224469722e204772616c2e222c226469726563223a22417664612e20496e646570656e64656e6369612033323737227d2c2231302e32352e352e3233223a7b22736563746f72223a224f6669632e20333135222c226469726563223a22417664612e20496e646570656e64656e6369612033323737227d2c2231302e32352e352e3232223a7b22736563746f72223a2241756469746f726961222c226469726563223a22417664612e20496e646570656e64656e6369612033323737227d2c2231302e32352e352e3231223a7b22736563746f72223a225042222c226469726563223a22417664612e20496e646570656e64656e6369612033323737227d2c2231302e32352e352e3230223a7b22736563746f72223a224f6669632e2032303820534547554e444f205049534f222c226469726563223a22417664612e20496e646570656e64656e6369612033323737227d2c2231302e32352e352e3139223a7b22736563746f72223a225052494d4552205049534f20414c20464f4e444f222c226469726563223a22417664612e20496e646570656e64656e6369612033323737227d7d";

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
            opt.innerText = traducirMes(mes);
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

// 2. Función para calcular diferencias y construir la interfaz web
function renderizarTabla() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) return;

    const mesSeleccionado = selector.value;
    const cuerpo = document.getElementById('tabla-cuerpo');
    cuerpo.innerHTML = "";

    if (!datosHistorial[mesSeleccionado]) return;

    document.getElementById('actualizacion').innerText = `Última lectura de este mes: ${datosHistorial[mesSeleccionado].ultima_actualizacion}`;

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

// 🔒 FUNCIÓN CRIPTOGRÁFICA CORREGIDA (Soporta codificación limpia sin romper JSON)
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
    
    // Convertir entrada a minúsculas automáticamente para evitar fallos por shift/capslock
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
