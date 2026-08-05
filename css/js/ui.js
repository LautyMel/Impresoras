/**
 * Módulo UI - Renderizado de la Interfaz
 * ========================================
 * Funciones para formatear tóners, renderizar tabla, tarjetas de resumen,
 * traducir meses y calcular métricas del dashboard.
 * 
 * Nota: Las ubicaciones NO se muestran en el frontend por seguridad.
 * Solo aparecen en el Excel cuando el usuario ingresa la contraseña.
 */

// ==================== FORMATEO DE TÓNER ====================

/**
 * Genera HTML para un indicador de tóner con barra de progreso visual.
 * @param {string} valorOriginal - "75%", "ERROR", undefined, etc.
 * @param {string} prefijoColor - "N:", "C:", "M:", "A:"
 * @returns {string} HTML del indicador de tóner
 */
function formatearEtiquetaToner(valorOriginal, prefijoColor = "") {
    if (valorOriginal === "ERROR" || valorOriginal === undefined || valorOriginal === null || valorOriginal === "") {
        return `<span class="badge-error">${prefijoColor}OFF</span>`;
    }

    let valorToner = parseInt(valorOriginal, 10);

    if (isNaN(valorToner)) {
        return `<span class="badge-error">${prefijoColor}??</span>`;
    }

    let claseEstilo = "";
    if (valorToner >= 50 && valorToner <= 100) {
        claseEstilo = "toner-alto";
    } else if (valorToner >= 20 && valorToner < 50) {
        claseEstilo = "toner-medio";
    } else {
        claseEstilo = "toner-bajo";
    }

    const anchoBarra = Math.min(valorToner, 100);
    return `
        <div class="toner-bar-container">
            <div class="toner-bar-fill ${claseEstilo.replace('toner-', 'barra-')}" style="width: ${anchoBarra}%"></div>
            <span class="toner-bar-label">${prefijoColor}${valorToner}%</span>
        </div>`;
}

/**
 * Extrae el valor numérico de un nivel de tóner.
 * @param {string} valor - "75%", "ERROR", etc.
 * @returns {number|null} Valor numérico o null si no es válido
 */
function extraerValorToner(valor) {
    if (!valor || valor === "ERROR" || valor === "N/A" || valor === "OK") return null;
    const num = parseInt(valor, 10);
    return isNaN(num) ? null : num;
}

/**
 * Determina si un tóner está en nivel crítico (< 5%).
 * @param {string} valor - Nivel de tóner
 * @returns {boolean}
 */
function esTonerCritico(valor) {
    const num = extraerValorToner(valor);
    return num !== null && num < 5;
}

// ==================== TARJETAS DE RESUMEN ====================

/**
 * Actualiza las tarjetas de resumen con métricas del mes seleccionado.
 * @param {string} mesClave - Mes seleccionado en formato "YYYY-MM"
 */
function actualizarTarjetasResumen(mesClave) {
    const datos = datosHistorial[mesClave]?.datos;
    if (!datos) return;

    let total = 0;
    let online = 0;
    let offline = 0;
    let critico = new Set();

    for (const [nombreImp, info] of Object.entries(datos)) {
        total++;
        const contador = info["Contador General"];
        
        if (contador === "ERROR" || contador === undefined) {
            offline++;
        } else {
            online++;
        }

        // Evaluar tóner crítico (< 20%)
        const tBlack = info["Porcentaje Tóner Negro"] || info["Nivel de Tóner"];
        if (esTonerCritico(tBlack)) {
            critico.add(nombreImp);
        }

        // Tóners de color
        if (info["Porcentaje Tóner Cian"] !== undefined) {
            ["Cian", "Magenta", "Amarillo"].forEach(color => {
                const key = `Porcentaje Tóner ${color}`;
                if (esTonerCritico(info[key])) {
                    critico.add(nombreImp);
                }
            });
        }
    }

    document.getElementById('total-impresoras').textContent = total;
    document.getElementById('total-online').textContent = online;
    document.getElementById('total-offline').textContent = offline;
    document.getElementById('total-critico').textContent = critico.size;
}

// ==================== TRADUCCIÓN DE MESES ====================

/**
 * Convierte clave "2026-06" a "Junio 2026".
 * @param {string} mesClave - "YYYY-MM"
 * @returns {string} Mes traducido
 */
function traducirMes(mesClave) {
    if (!mesClave || !mesClave.includes('-')) return mesClave;
    const [year, month] = mesClave.split('-');
    return `${NOMBRES_MESES[parseInt(month) - 1]} ${year}`;
}

/**
 * Obtiene la lista ordenada de meses del historial.
 * @returns {string[]} Array de claves de mes ordenadas
 */
function obtenerMesesOrdenados() {
    return Object.keys(datosHistorial).sort();
}

/**
 * Obtiene la clave del mes anterior a uno dado.
 * @param {string} mesClave - Mes actual
 * @param {string[]} listaMeses - Lista ordenada de meses
 * @returns {string|null} Clave del mes anterior o null
 */
function obtenerMesAnterior(mesClave, listaMeses) {
    const posicionActual = listaMeses.indexOf(mesClave);
    return posicionActual > 0 ? listaMeses[posicionActual - 1] : null;
}

/**
 * Genera badge de estado según el contador.
 * @param {string|number} contador - Valor del contador
 * @returns {string} HTML del badge de estado
 */
function formatearEstado(contador) {
    if (contador === "ERROR" || contador === undefined) {
        return `<span class="badge-error">🔴 Offline</span>`;
    }
    return `<span style="color: #28a745; font-weight: 600;">🟢 Online</span>`;
}

// ==================== RENDERIZADO DE TABLA ====================

/**
 * Renderiza la tabla principal con los datos del mes seleccionado.
 * Incluye: nombre, IP, hojas del mes, tóner, estado.
 * Las ubicaciones solo se revelan en el Excel (con contraseña).
 */
function renderizarTabla() {
    const selector = document.getElementById('selector-mes');
    if (!selector || !selector.value) return;

    const mesSeleccionado = selector.value;
    const cuerpo = document.getElementById('tabla-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = "";

    if (!datosHistorial[mesSeleccionado]) return;

    // Actualizar barra de info
    const actEl = document.getElementById('actualizacion');
    if (actEl) {
        actEl.innerText = `Última lectura: ${datosHistorial[mesSeleccionado].ultima_actualizacion}`;
    }

    // Actualizar tarjetas de resumen
    actualizarTarjetasResumen(mesSeleccionado);

    const listaMeses = obtenerMesesOrdenados();
    const mesAnteriorClave = obtenerMesAnterior(mesSeleccionado, listaMeses);

    const datosActuales = datosHistorial[mesSeleccionado].datos;
    const datosAnteriores = mesAnteriorClave ? datosHistorial[mesAnteriorClave].datos : null;

    for (const [nombreImp, info] of Object.entries(datosActuales)) {
        const ip = info.ip || 'Sin IP';

        // --- Contador de Hojas ---
        let hojasMostrar = `<span class="sin-datos">0</span>`;
        const valorContadorActual = info["Contador General"];

        if (valorContadorActual === "ERROR" || valorContadorActual === undefined) {
            hojasMostrar = `<span class="badge-error">—</span>`;
        } else if (datosAnteriores && datosAnteriores[nombreImp] && datosAnteriores[nombreImp]["Contador General"]) {
            const valorContadorAnterior = datosAnteriores[nombreImp]["Contador General"];
            if (valorContadorAnterior !== "ERROR" && valorContadorAnterior !== undefined) {
                const diferencia = Number(valorContadorActual) - Number(valorContadorAnterior);
                hojasMostrar = `<span class="badge-consumo">${diferencia.toLocaleString()}</span>`;
            }
        } else {
            hojasMostrar = `<span class="badge-consumo">${Number(valorContadorActual).toLocaleString()}</span>`;
        }

        // --- Tóner ---
        let valorOriginalNegro = info["Porcentaje Tóner Negro"] || info["Nivel de Tóner"];
        let tonerMostrar = formatearEtiquetaToner(valorOriginalNegro, "N:");

        if (info["Porcentaje Tóner Cian"] !== undefined) {
            let tCian = formatearEtiquetaToner(info["Porcentaje Tóner Cian"], "C:");
            let tMagenta = formatearEtiquetaToner(info["Porcentaje Tóner Magenta"], "M:");
            let tAmarillo = formatearEtiquetaToner(info["Porcentaje Tóner Amarillo"], "A:");

            tonerMostrar = `
                <div class="bloque-toners">
                    ${tonerMostrar} ${tCian} ${tMagenta} ${tAmarillo}
                </div>
            `;
        }

        // --- Estado ---
        const estadoHTML = formatearEstado(valorContadorActual);

        // --- Fila (sin ubicación - solo se ve en Excel con contraseña) ---
        cuerpo.innerHTML += `
            <tr>
                <td><strong>${nombreImp}</strong></td>
                <td><code>${ip}</code></td>
                <td>${hojasMostrar}</td>
                <td>${tonerMostrar}</td>
                <td>${estadoHTML}</td>
            </tr>`;
    }
}

