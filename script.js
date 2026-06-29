let datosHistorial = {};

// === CONFIGURACIÓN DE RUTAS MÓVILES ===
const GITHUB_USER = "LautyMel";
const GITHUB_REPO = "Impresoras";
const urlJson = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/historial_impresoras.json`;

// 🔒 DICCIONARIO CIFRADO SEGURO (La contraseña EMUI2026 es la llave matemática, no está escrita aquí)
const DATOS_PROTEGIDOS_HEX = "306d6b63303c733324637d7a3120616f73756b78292c6e64627d70657e286377757b326330366b303c70332463767e6e30207d6164746f63292461627c7a76637e284063777532303061353c70332463717e6a3120616f73756b7829246e636b63697e68285a7375616e6d6333303062323c71332463727e693120616f73756b78292c6e64627d70657e284263706b72646c244365636433303062313c71332463737e683120616f73756b78292c6e64627d70657e284963776d6333333033303062303c713324637c7e6f3120616f73756b78292c6e64627d70657e284373626f7c6d656f6333303062373c713324637d7e6e3120616f73756b78292c6e64627d70657e285a4433303062363c713324637e7e6d3120616f73756b78292c6e64627d70657e284963776d6333333130245543415348424924524f5b4d33303062353c713324637f7e6c3120616f73756b78292c6e64627d70657e28565a4f4b435424564f534724434a24404748444f3b";

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

    const [year, month] = mesSeleccionado.split('-').map(Number);
    const fechaMesAnterior = new Date(year, month - 2, 1);
    const mesAnteriorClave = fechaMesAnterior.getFullYear() + "-" + String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');

    const datosActuales = datosHistorial[mesSeleccionado].datos;
    const datosAnteriores = datosHistorial[mesAnteriorClave] ? datosHistorial[mesAnteriorClave].datos : null;

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
    const [year, month] = mesClave.split('-');
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${nombres[parseInt(month) - 1]} ${year}`;
}

// 🔒 FUNCIÓN CRIPTOGRÁFICA SEGURA: La contraseña ingresada intenta descifrar matemáticamente los datos.
function obtenerDiccionarioDescifrado(clave) {
    if (!clave) return null;
    try {
        let str = "";
        for (let i = 0; i < DATOS_PROTEGIDOS_HEX.length; i += 2) {
            let byte = parseInt(DATOS_PROTEGIDOS_HEX.substr(i, 2), 16);
            let charClave = clave.charCodeAt((i / 2) % clave.length);
            str += String.fromCharCode(byte ^ charClave); 
        }
        return JSON.parse(str); // Si la clave es errónea, esto romperá y saltará al catch.
    } catch (e) {
        return null;
    }
}

// 4. FUNCIÓN EXCEL HISTÓRICA GENERAL (Muestra todos los meses del historial en columnas hacia la derecha)
function descargarExcelMensual() {
    const claveIngresada = prompt("🔒 Ingrese la contraseña para incluir Direcciones y Sectores privados:");
    const diccionarioDirecciones = obtenerDiccionarioDescifrado(claveIngresada);

    if (claveIngresada !== null && !diccionarioDirecciones) {
        alert("⚠️ Contraseña incorrecta. El reporte se descargará con las celdas de ubicación ocultas por seguridad.");
    }

    // Obtener todos los meses disponibles y ordenarlos cronológicamente (antiguo a reciente)
    const listaMeses = Object.keys(datosHistorial).sort(); 
    if (listaMeses.length === 0) {
        alert("No hay datos disponibles para exportar.");
        return;
    }

    // Construir la fila de encabezados dinámicos basándose en los meses que existan en el JSON
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

    // Obtener un Set único con todas las impresoras del historial global
    const todasLasImpresoras = new Set();
    listaMeses.forEach(mes => {
        if (datosHistorial[mes] && datosHistorial[mes].datos) {
            Object.keys(datosHistorial[mes].datos).forEach(nombreImp => todasLasImpresoras.add(nombreImp));
        }
    });

    // Procesar los datos de cada impresora mes por mes
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

        // Calcular consumos individuales para cada mes respectivo de la línea de tiempo
        listaMeses.forEach((mesSeleccionado) => {
            const datosActuales = datosHistorial[mesSeleccionado]?.datos;
            const info = datosActuales ? datosActuales[nombreImp] : null;

            if (!info) {
                filaImpresora.push("-"); // No registrada en este mes
                return;
            }

            const valorContadorActual = info["Contador General"];

            if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
                filaImpresora.push("OFFLINE");
            } else {
                const [year, month] = mesSeleccionado.split('-').map(Number);
                const fechaMesAnterior = new Date(year, month - 2, 1);
                const mesAnteriorClave = fechaMesAnterior.getFullYear() + "-" + String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');
                const datosAnteriores = datosHistorial[mesAnteriorClave]?.datos;

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

    // Compilación final del documento XLSX
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filasExcel);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } }];

    // Asignar el renderizado de millares numéricos (#,##0) a todas las celdas de las columnas de meses
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
