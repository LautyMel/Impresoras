import { traducirMes, formatearEtiquetaToner } from './utils.js';

export function poblarSelector(meses) {
    const selector = document.getElementById('selector-mes');
    if (!selector) return;
    
    selector.innerHTML = "";
    meses.forEach(mes => {
        const opt = document.createElement('option');
        opt.value = mes;
        opt.innerText = traducirMes(mes);
        selector.appendChild(opt);
    });
}

export function renderizarTabla(datosHistorial, mesSeleccionado) {
    const cuerpo = document.getElementById('tabla-cuerpo');
    if (!cuerpo || !datosHistorial[mesSeleccionado]) return;
    
    cuerpo.innerHTML = "";
    
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