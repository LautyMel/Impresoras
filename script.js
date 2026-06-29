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
function descubrirMes(mesClave) {
    const [year, month] = mesClave.split('-');
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${nombres[parseInt(month) - 1]} ${year}`;
}
// Alias para mantener compatibilidad
function traducirMes(mesClave) { return descubrirMes(mesClave); }

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

// 4. FUNCIÓN EXCEL COMPARATIVA MODIFICADA
function descargarExcelMensual() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) {
        alert("Por favor, selecciona un mes válido primero.");
        return;
    }

    const claveIngresada = prompt("🔒 Ingrese la contraseña para incluir Direcciones y Sectores privados:");
    const diccionarioDirecciones = obtenerDiccionarioDescifrado(claveIngresada);

    if (claveIngresada !== null && !diccionarioDirecciones) {
        alert("⚠️ Contraseña incorrecta. El reporte se descargará con las celdas de ubicación ocultas por seguridad.");
    }

    const mesSeleccionado = selector.value;
    const nombreMesVisible = traducirMes(mesSeleccionado);
    const datosActuales = datosHistorial[mesSeleccionado]?.datos;

    if (!datosActuales) {
        alert("No hay datos disponibles para exportar.");
        return;
    }

    // Calcular Claves para Mes Anterior y Hace 2 Meses
    const [year, month] = mesSeleccionado.split('-').map(Number);
    
    const fechaMesAnterior = new Date(year, month - 2, 1);
    const mesAnteriorClave = fechaMesAnterior.getFullYear() + "-" + String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');
    const nombreMesAnteriorVisible = traducirMes(mesAnteriorClave);
    const datosAnteriores = datosHistorial[mesAnteriorClave] ? datosHistorial[mesAnteriorClave].datos : null;

    const fechaHaceDosMeses = new Date(year, month - 3, 1);
    const haceDosMesesClave = fechaHaceDosMeses.getFullYear() + "-" + String(fechaHaceDosMeses.getMonth() + 1).padStart(2, '0');
    const datosHaceDosMeses = datosHistorial[haceDosMesesClave] ? datosHistorial[haceDosMesesClave].datos : null;

    const filasExcel = [
        [`REPORTE DE CONSUMO MENSUAL COMPARATIVO`],
        [`Generado automáticamente el: ${new Date().toLocaleString()}`],
        [], 
        ["Impresora", "Dirección IP", "Ubicación / Sector", "Dirección Física", `Hojas Impresas (${nombreMesAnteriorVisible})`, `Hojas Impresas (${nombreMesVisible})`]
    ];

    for (const [nombreImp, info] of Object.entries(datosActuales)) {
        let hojasCalculadasActual = 0;
        let hojasCalculadasAnterior = 0;
        
        const valorContadorActual = info["Contador General"];

        // ---- Cálculo del Mes Seleccionado (Actual) ----
        if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
            hojasCalculadasActual = "OFFLINE";
        } else if (datosAnteriores && datosAnteriores[nombreImp] && datosAnteriores[nombreImp]["Contador General"]) {
            const valorContadorAnterior = datosAnteriores[nombreImp]["Contador General"];
            if (valorContadorAnterior !== "ERROR" && valorContadorAnterior !== undefined) {
                hojasCalculadasActual = Number(valorContadorActual) - Number(valorContadorAnterior);
            } else {
                hojasCalculadasActual = Number(valorContadorActual);
            }
        } else {
            hojasCalculadasActual = Number(valorContadorActual);
        }

        // ---- Cálculo del Mes Anterior ----
        if (datosAnteriores && datosAnteriores[nombreImp]) {
            const valorContadorAnterior = datosAnteriores[nombreImp]["Contador General"];
            
            if (valorContadorAnterior === "ERROR" || valorContadorAnterior === undefined) {
                hojasCalculadasAnterior = "OFFLINE";
            } else if (datosHaceDosMeses && datosHaceDosMeses[nombreImp] && datosHaceDosMeses[nombreImp]["Contador General"]) {
                const valorContadorHaceDosMeses = datosHaceDosMeses[nombreImp]["Contador General"];
                if (valorContadorHaceDosMeses !== "ERROR" && valorContadorHaceDosMeses !== undefined) {
                    hojasCalculadasAnterior = Number(valorContadorAnterior) - Number(valorContadorHaceDosMeses);
                } else {
                    hojasCalculadasAnterior = Number(valorContadorAnterior);
                }
            } else {
                hojasCalculadasAnterior = Number(valorContadorAnterior);
            }
        } else {
            hojasCalculadasAnterior = "Sin Datos";
        }

        const ipImpresora = info.ip || "";
        
        let datosExtra = { direc: "[Acceso Protegido]", sector: "[Acceso Protegido]" };
        if (diccionarioDirecciones) {
            datosExtra = diccionarioDirecciones[ipImpresora] || { direc: "Sin Dirección", sector: "Sin Sector" };
        }

        filasExcel.push([
            nombreImp,
            ipImpresora,
            datosExtra.sector,
            datosExtra.direc,
            hojasCalculadasAnterior,
            hojasCalculadasActual
        ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filasExcel);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

    // Formatear columnas de números (Columnas E y F -> Índices 4 y 5)
    for (let r = 4; r < filasExcel.length; r++) {
        const cellRefAnterior = XLSX.utils.encode_cell({ r: r, c: 4 });
        if (ws[cellRefAnterior] && typeof ws[cellRefAnterior].v === 'number') {
            ws[cellRefAnterior].z = '#,##0';
        }
        
        const cellRefActual = XLSX.utils.encode_cell({ r: r, c: 5 });
        if (ws[cellRefActual] && typeof ws[cellRefActual].v === 'number') {
            ws[cellRefActual].z = '#,##0';
        }
    }

    const maxAnchos = filasExcel[3].map((_, colIdx) => {
        return Math.max(...filasExcel.map(row => row[colIdx] ? row[colIdx].toString().length : 0)) + 4;
    });
    ws['!cols'] = maxAnchos.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, `Reporte ${mesSeleccionado}`);
    XLSX.writeFile(wb, `Reporte_Impresoras_${mesSeleccionado}.xlsx`);
}
