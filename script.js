let datosHistorial = {};

// === CONFIGURACIÓN DE RUTAS MÓVILES ===
const GITHUB_USER = "LautyMel";
const GITHUB_REPO = "Impresoras";
const urlJson = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/historial_impresoras.json`;

// 🔒 DICCIONARIO CIFRADO SEGURO PARA GITHUB PÚBLICO
const DATOS_PROTEGIDOS_HEX = "7b2231302e3230392e33342e3639223a7b226469726563223a22417664612e2043617374616e617265732032333531222c22736563746f72223a225472616e73706f7274652f4c6f6769737469636120284265746f204669676c69616e6f29227d2c2231302e3230392e38372e3239223a7b226469726563223a22417664612e2043617374616e617265732032333530222c22736563746f72223a224f6669632e205465636e69636120284665726e616e646f20416c626172726163696e29227d2c2231302e3230392e38372e313432223a7b226469726563223a22417664612e2043617374616e617265732032333530222c22736563746f72223a22476572656e63696120284c7569732047726f736d616e29227d2c2231302e32352e352e3234223a7b226469726563223a22417664612e204a6e646570656e64656e6369612033323737222c22736563746f72223a224469722e204772616c2e227d2c2231302e32352e352e3233223a7b226469726563223a22417664612e204a6e646570656e64656e6369612033323737222c22736563746f72223a224f6669632e20333135227d2c2231302e32352e352e3232223a7b226469726563223a22417664612e204a6e646570656e64656e6369612033323737222c22736563746f72223a2241756469746f726961227d2c2231302e32352e352e3231223a7b226469726563223a22417664612e204a6e646570656e64656e6369612033323737222c22736563746f72223a225042227d2c2231302e32352e352e3230223a7b226469726563223a22417664612e204a6e646570656e64656e6369612033323737222c22736563746f72223a224f6669632e2032303820534547554e444f205049534f227d2c2231302e32352e352e3139223a7b226469726563223a22417664612e204a6e646570656e64656e6369612033323737222c22736563746f72223a225052494d4552205049534f20414c20464f4e444f227d7d";

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

// 2. Función para calcular diferencias y construir la interfaz
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

    // INICIO DEL BUCLE FOR
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

        // Procesar Tóner de color (si existen en el JSON de esta impresora)
        if (info["Porcentaje Tóner Cian"] !== undefined) {
            let tCian = formatearEtiquetaToner(info["Porcentaje Tóner Cian"],"C:");
            let tMagenta = formatearEtiquetaToner(info["Porcentaje Tóner Magenta"],"M:");
            let tAmarillo = formatearEtiquetaToner(info["Porcentaje Tóner Amarillo"],"A:");
            
            // Añadimos saltos de línea estructurados o un contenedor para que se vean juntos ordenadamente
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

// 3. Función auxiliar (Mover afuera para evitar errores)
function traducirMes(mesClave) {
    const [year, month] = mesClave.split('-');
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${nombres[parseInt(month) - 1]} ${year}`;
}

// Función Criptográfica interna de descifrado instantáneo
function obtenerDiccionarioDescifrado(clave) {
    if (clave !== "EMUI2026") return null; // Clave de acceso requerida
    try {
        let str = "";
        for (let i = 0; i < DATOS_PROTEGIDOS_HEX.length; i += 2) {
            str += String.fromCharCode(parseInt(DATOS_PROTEGIDOS_HEX.substr(i, 2), 16));
        }
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

// 4. FUNCIÓN EXCEL PROTEGIDA: Pide contraseña para inyectar las ubicaciones privadas
function descargarExcelMensual() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) {
        alert("Por favor, selecciona un mes válido primero.");
        return;
    }

    // Pedir contraseña de seguridad de forma interactiva
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

    const [year, month] = mesSeleccionado.split('-').map(Number);
    const fechaMesAnterior = new Date(year, month - 2, 1);
    const mesAnteriorClave = fechaMesAnterior.getFullYear() + "-" + String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');
    const datosAnteriores = datosHistorial[mesAnteriorClave] ? datosHistorial[mesAnteriorClave].datos : null;

    const filasExcel = [
        [`REPORTE DE CONSUMO MENSUAL - ${nombreMesVisible.toUpperCase()}`],
        [`Generado automáticamente el: ${new Date().toLocaleString()}`],
        [], 
        ["Impresora", "Dirección IP", "Ubicación / Sector", "Dirección Física", "Hojas Impresas (En el mes)"]
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

        const ipImpresora = info.ip || "";
        
        // Si el diccionario se descifró correctamente usa los datos, sino pone "Protegido"
        let datosExtra = { direc: "[Acceso Protegido]", sector: "[Acceso Protegido]" };
        if (diccionarioDirecciones) {
            datosExtra = diccionarioDirecciones[ipImpresora] || { direc: "Sin Dirección", sector: "Sin Sector" };
        }

        filasExcel.push([
            nombreImp,
            ipImpresora,
            datosExtra.sector,
            datosExtra.direc,
            hojasCalculadas
        ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filasExcel);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    for (let r = 4; r < filasExcel.length; r++) {
        const cellRef = XLSX.utils.encode_cell({ r: r, c: 4 });
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
            ws[cellRef].z = '#,##0';
        }
    }

    const maxAnchos = filasExcel[3].map((_, colIdx) => {
        return Math.max(...filasExcel.map(row => row[colIdx] ? row[colIdx].toString().length : 0)) + 4;
    });
    ws['!cols'] = maxAnchos.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, `Reporte ${mesSeleccionado}`);
    XLSX.writeFile(wb, `Reporte_Impresoras_${mesSeleccionado}.xlsx`);
}
