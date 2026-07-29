/**
 * Módulo de Administración de Impresoras
 * =========================================
 * Permite agregar, modificar o eliminar impresoras del catálogo.
 * Protegido por contraseña
 */

// ==================== MODAL DE ADMINISTRACIÓN ====================

/**
 * Abre el panel de administración si la contraseña es correcta.
 */
const CLAVE_ADMIN = "impreso2026";

function abrirPanelAdmin() {
    const clave = prompt("🔒 Ingrese la contraseña de administrador:");

    if (clave === null) return; // Canceló

    if (clave !== CLAVE_ADMIN) {
        alert("❌ Contraseña incorrecta. Acceso denegado.");
        return;
    }

    // Cargar impresoras actuales desde el historial
    const impresoras = obtenerImpresorasDesdeHistorial();
    mostrarModalAdmin(impresoras);
}

/**
 * Extrae la lista de impresoras desde los datos del historial cargado.
 * @returns {Array} Lista de objetos { nombre, ip }
 */
function obtenerImpresorasDesdeHistorial() {
    const impresoras = [];
    const visitadas = new Set();

    // Recorrer todos los meses del historial
    const meses = Object.keys(datosHistorial);
    for (const mes of meses) {
        const datos = datosHistorial[mes]?.datos;
        if (!datos) continue;
        for (const [nombre, info] of Object.entries(datos)) {
            if (!visitadas.has(nombre)) {
                visitadas.add(nombre);
                impresoras.push({
                    nombre: nombre,
                    ip: info.ip || ""
                });
            }
        }
    }

    // Si no hay datos en historial, usar las del diccionario cifrado (simuladas)
    if (impresoras.length === 0) {
        // Intentar descifrar para obtener nombres/IPs
        const dicc = obtenerDiccionarioDescifrado(CLAVE_ADMIN);
        if (dicc) {
            for (const [ip, data] of Object.entries(dicc)) {
                impresoras.push({
                    nombre: `Impresora ${impresoras.length + 1}`,
                    ip: ip,
                    ubicacion: data.sector || "",
                    direccion: data.direc || ""
                });
            }
        } else {
            // Fallback: mostrar las del catálogo original
            const IPS_CONOCIDAS = [
                "10.25.5.19", "10.25.5.20", "10.25.5.21", "10.25.5.22",
                "10.25.5.23", "10.25.5.24", "10.209.34.69", "10.209.87.29", "10.209.87.142"
            ];
            IPS_CONOCIDAS.forEach((ip, i) => {
                impresoras.push({
                    nombre: `Impresora ${i + 1}`,
                    ip: ip
                });
            });
        }
    }

    return impresoras;
}

/**
 * Muestra el modal HTML con la tabla de impresoras para administrar.
 * @param {Array} impresoras - Lista de impresoras actuales
 */
function mostrarModalAdmin(impresoras) {
    // Crear overlay del modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-admin';
    overlay.onclick = function(e) {
        if (e.target === this) cerrarModalAdmin();
    };

    let filas = '';
    impresoras.forEach((imp, index) => {
        filas += `
            <tr>
                <td><input type="text" id="admin-nombre-${index}" value="${imp.nombre}" class="admin-input"></td>
                <td><input type="text" id="admin-ip-${index}" value="${imp.ip}" class="admin-input admin-ip"></td>
                <td><input type="text" id="admin-ubic-${index}" value="${imp.ubicacion || ''}" class="admin-input" placeholder="Opcional"></td>
                <td><button class="btn-delete" onclick="eliminarFilaImpresora(${index})" title="Eliminar">🗑️</button></td>
            </tr>`;
    });

    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>🖨️ Administrar Impresoras</h2>
                <button class="modal-close" onclick="cerrarModalAdmin()">✕</button>
            </div>
            <div class="modal-body">
                <p class="modal-desc">Gestione el catálogo de impresoras. Los cambios se guardarán localmente y se subirán a GitHub.</p>
                <div class="table-wrapper admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Dirección IP</th>
                                <th>Ubicación (privada)</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody id="admin-tbody">
                            ${filas}
                        </tbody>
                    </table>
                </div>
                <button class="btn-add-row" onclick="agregarFilaImpresora()">➕ Agregar Impresora</button>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="cerrarModalAdmin()">Cancelar</button>
                <button class="btn-save" onclick="guardarImpresoras()">💾 Guardar Cambios</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

/**
 * Agrega una fila vacía en la tabla de administración.
 */
function agregarFilaImpresora() {
    const tbody = document.getElementById('admin-tbody');
    if (!tbody) return;

    const index = tbody.children.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" id="admin-nombre-${index}" value="" placeholder="Ej: Impresora 10" class="admin-input"></td>
        <td><input type="text" id="admin-ip-${index}" value="" placeholder="Ej: 10.25.5.100" class="admin-input admin-ip"></td>
        <td><input type="text" id="admin-ubic-${index}" value="" placeholder="Opcional" class="admin-input"></td>
        <td><button class="btn-delete" onclick="eliminarFilaImpresora(${index})" title="Eliminar">🗑️</button></td>
    `;
    tbody.appendChild(tr);
}

/**
 * Elimina una fila de impresora del formulario.
 * @param {number} index - Índice de la fila a eliminar
 */
function eliminarFilaImpresora(index) {
    const tbody = document.getElementById('admin-tbody');
    if (!tbody || tbody.children.length <= 1) {
        alert("Debe haber al menos una impresora en el catálogo.");
        return;
    }
    if (confirm("¿Está seguro de eliminar esta impresora?")) {
        tbody.children[index].remove();
        // Renumerar los IDs
        for (let i = 0; i < tbody.children.length; i++) {
            const inputs = tbody.children[i].querySelectorAll('input');
            inputs[0].id = `admin-nombre-${i}`;
            inputs[1].id = `admin-ip-${i}`;
            inputs[2].id = `admin-ubic-${i}`;
            const btn = tbody.children[i].querySelector('.btn-delete');
            if (btn) btn.setAttribute('onclick', `eliminarFilaImpresora(${i})`);
        }
    }
}

/**
 * Cierra el modal de administración.
 */
function cerrarModalAdmin() {
    const modal = document.getElementById('modal-admin');
    if (modal) modal.remove();
}

/**
 * Guarda los cambios realizados en el catálogo de impresoras.
 * Envía los datos al servidor API local para persistir los cambios
 * en config.py, secretos.json, config.js e historial_impresoras.json.
 * Luego recarga los datos desde GitHub automáticamente.
 */
function guardarImpresoras() {
    const tbody = document.getElementById('admin-tbody');
    if (!tbody) return;

    const nuevasImpresoras = [];
    let errores = false;

    for (let i = 0; i < tbody.children.length; i++) {
        const nombre = document.getElementById(`admin-nombre-${i}`)?.value.trim();
        const ip = document.getElementById(`admin-ip-${i}`)?.value.trim();
        const ubic = document.getElementById(`admin-ubic-${i}`)?.value.trim();

        if (!nombre || !ip) {
            alert(`❌ La fila ${i + 1} debe tener Nombre e IP obligatoriamente.`);
            errores = true;
            continue;
        }

        // Validar formato de IP básico
        const partesIP = ip.split('.');
        if (partesIP.length !== 4 || partesIP.some(p => isNaN(p) || p < 0 || p > 255)) {
            alert(`❌ IP inválida en fila ${i + 1}: "${ip}". Use formato 10.x.x.x`);
            errores = true;
            continue;
        }

        nuevasImpresoras.push({
            nombre: nombre,
            ip: ip,
            ubicacion: ubic || ""
        });
    }

    if (errores) return;
    if (nuevasImpresoras.length === 0) {
        alert("Debe haber al menos una impresora.");
        return;
    }

    // Generar nuevo diccionario de ubicaciones
    const nuevoDiccionario = {};
    nuevasImpresoras.forEach(imp => {
        if (imp.ubicacion) {
            nuevoDiccionario[imp.ip] = {
                sector: imp.ubicacion,
                direc: imp.ubicacion
            };
        }
    });

    // Generar el nuevo hash cifrado
    const nuevoHash = generarHashCifrado(nuevoDiccionario, CLAVE_ADMIN);

    // Mostrar indicador de guardado
    const btnSave = document.querySelector('.btn-save');
    if (btnSave) {
        btnSave.textContent = '⏳ Guardando...';
        btnSave.disabled = true;
    }

    // Enviar datos al API local
    fetch('http://localhost:8001/api/actualizar-impresoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            impresoras: nuevasImpresoras,
            hash: nuevoHash
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ Catálogo de impresoras actualizado correctamente.\nLos cambios se guardaron y sincronizaron.');
            cerrarModalAdmin();
            // Recargar datos desde GitHub para reflejar cambios
            cargarDatosDesdeGitHub();
        } else {
            alert('❌ Error al guardar: ' + (data.error || 'Error desconocido'));
        }
    })
    .catch(err => {
        console.error('Error de conexión con API:', err);
        // Fallback: mostrar instrucciones manuales si la API no está disponible
        let resumen = "⚠️ No se pudo conectar con el servidor local.\n\n";
        resumen += "📋 IMPRESORAS REGISTRADAS:\n";
        nuevasImpresoras.forEach(imp => {
            resumen += `   • ${imp.nombre} → ${imp.ip}`;
            if (imp.ubicacion) resumen += ` (${imp.ubicacion})`;
            resumen += '\n';
        });
        resumen += "\n🔧 Para aplicar manualmente:\n";
        resumen += "1. Abre printer_monitor/config.py y actualiza IMPRESORAS\n";
        resumen += "2. Abre secretos.json y actualiza 'ubicaciones'\n";
        resumen += "3. Copia este hash a js/config.js como DATOS_PROTEGIDOS_HEX:\n\n";
        resumen += nuevoHash;
        alert(resumen);

        if (navigator.clipboard) {
            navigator.clipboard.writeText(nuevoHash).catch(() => {});
        }
    })
    .finally(() => {
        if (btnSave) {
            btnSave.textContent = '💾 Guardar Cambios';
            btnSave.disabled = false;
        }
    });
}

/**
 * Genera un hash cifrado XOR del diccionario para el frontend.
 * @param {object} diccionario - Diccionario { IP: { sector, direc } }
 * @param {string} clave - Contraseña de cifrado
 * @returns {string} Hash hexadecimal
 */
function generarHashCifrado(diccionario, clave) {
    const jsonStr = JSON.stringify(diccionario);
    let hex = "";
    for (let i = 0; i < jsonStr.length; i++) {
        const byte = jsonStr.charCodeAt(i) ^ clave.charCodeAt(i % clave.length);
        hex += byte.toString(16).padStart(2, '0');
    }
    return hex.toUpperCase();
}
