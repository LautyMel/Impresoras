let datosHistorial = {};

// === CONFIGURACIÓN DE RUTAS MÓVILES ===
const GITHUB_USER = "LautyMel";
const GITHUB_REPO = "Impresoras";
const urlJson = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/historial_impresoras.json`;

// 🔒 DICCIONARIO 
const DATOS_PROTEGIDOS_HEX = "124f41424b415f0b1e0102475b49505f531410545b440c0e524845512e44545318492e110111129e53425745495f4347545143121241530a191f0047494f10644057071e001d17070a1d7c5d51001e041b06124f1a725742064d361b021f06535e5d1f4b105c5247425f1c02020f4755475c574a4d081049140d040217065155121273400d0c5e5226121c4651c3571b08035257405a02121e164b1e1511111c1d100a1214260b19114b533b57535c5f0a0c505a23161d5c515c52064d311e07121d4051515f0744520f49534d03001c0459545e4a525d5e0602100c491652160c010a511208164b2c0616045d4f71514142089c110000004f000307064b41505016160c465f4014534d523500010a5c535b5749453c070c004f75425d45040c1e5b470e4312120306475f455c505d5d06120816124f141b17160c100a1214281b14134b53265c5457460c0314170b1006531001045e5a525e45511c575346591b4f4a52473706401e12711b0c1c5c470e4312120306475f455c505d5d01120816124f141b17160c100a1214281b14134b53265c5457460c0314170b1006531001045e5a525e45511c575346591b4f4a52473c095b531c165a5c4550185f4f100102185b585e474b415d100a124d4b09190000104d081010771f09115c453a01565542530709151c061a0e120300015e4f5c5247000a51445d444b57505024060b5b445d44000c520f49534d03001c045c43455c57424d081049140d040217065155121273400d0c5e522c1d0b574057580d081e110c124f010205014b41505016160c465f4014534d52222751121e101007594342474b46410000100c491652160c010a511208164b2c0616045d4f7b5e565319081e16001d0c5b5112055b5a475049534d41555142061f524845512054595118495f404a45202a75657c72264d203b363c4d4f1c1214585d5e40505d5a1c010b14534d0b50011a1d5753100c494f310401124112795c520c1d151c011601515953165a5f4745475f4f104357551d0202505f534d62627b7b2c3f50222c202012717e162f223e362a51124f";

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
    
    // MODIFICACIÓN: Quitamos el .toLowerCase() para que use la contraseña exactamente como se escribe
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
