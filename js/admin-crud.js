/**
 * Módulo Admin CRUD - Gestión de Impresoras
 * ==========================================
 * Maneja la tabla editable, agregar/eliminar filas y guardar cambios.
 * Dependencias: admin-ui.js (cerrarModalAdmin), config.js (DATOS_PROTEGIDOS_HEX), data-loader.js (cargarDatosDesdeGitHub)
 */

// API_BASE se define en admin-login.js (se carga antes en index.html).
// NO redeclarar aquí para evitar el error:
// "Identifier 'API_BASE' has already been declared"

// ==================== FILAS ====================

function agregarFilaTabla(nombre, ip, ubicacion, esColor) {
    nombre = nombre || "";
    ip = ip || "";
    ubicacion = ubicacion || "";
    esColor = esColor || false;

    const tbody = document.getElementById("admin-tabla-cuerpo");
    if (!tbody) return;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input type="text" class="admin-input admin-input-nombre" value="${escapeHtml(nombre)}" placeholder="Ej: Impresora 10"></td>
        <td><input type="text" class="admin-input admin-input-ip admin-ip" value="${escapeHtml(ip)}" placeholder="Ej: 10.0.0.10"></td>
        <td><input type="text" class="admin-input admin-input-ubic" value="${escapeHtml(ubicacion)}" placeholder="Ej: Oficina 3 - Piso 2"></td>
        <td class="admin-checkbox-cell">
            <label class="admin-checkbox-label">
                <input type="checkbox" class="admin-input-color" ${esColor ? "checked" : ""}>
                <span>🖨️</span>
            </label>
        </td>
        <td><button class="btn-delete" onclick="eliminarFila(this)" title="Eliminar impresora">🗑️</button></td>
    `;
    tbody.appendChild(row);
}

function agregarImpresora() {
    agregarFilaTabla();
    const tbody = document.getElementById("admin-tabla-cuerpo");
    if (tbody) tbody.lastElementChild?.scrollIntoView({ behavior: "smooth" });
}

function eliminarFila(btn) {
    const row = btn.closest("tr");
    if (row && confirm("¿Eliminar esta impresora del catálogo?")) {
        row.remove();
    }
}

// ==================== GUARDAR ====================

async function guardarImpresoras() {
    const tbody = document.getElementById("admin-tabla-cuerpo");
    if (!tbody) return;

    const filas = tbody.querySelectorAll("tr");
    const impresoras = [];

    for (const row of filas) {
        const nombre = row.querySelector(".admin-input-nombre")?.value.trim();
        const ip = row.querySelector(".admin-input-ip")?.value.trim();
        const ubicacion = row.querySelector(".admin-input-ubic")?.value.trim();
        const esColor = row.querySelector(".admin-input-color")?.checked || false;

        if (!nombre || !ip) continue;

        impresoras.push({ nombre, ip, ubicacion, es_color: esColor });
    }

    if (impresoras.length === 0) {
        alert("⚠️ Debe haber al menos una impresora completa.");
        return;
    }

    const hash = DATOS_PROTEGIDOS_HEX || "";

    const btn = document.querySelector(".admin-footer-actions .btn-save");
    const textoOriginal = btn.textContent;
    btn.textContent = "⏳ Guardando...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/actualizar-impresoras`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ impresoras, hash })
        });

        const result = await response.json();

        if (result.success) {
            alert("✅ " + (result.message || "Catálogo actualizado correctamente."));
            if (typeof cargarDatosDesdeGitHub === "function") {
                setTimeout(() => cargarDatosDesdeGitHub(), 1000);
            }
            cerrarModalAdmin();
        } else {
            alert("❌ Error: " + (result.error || "No se pudieron guardar los cambios."));
        }
    } catch (err) {
        alert("❌ Error de conexión con el servidor. ¿Está corriendo printer_api.py?");
        console.error("Error guardando:", err);
    } finally {
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// ==================== UTILIDADES ====================

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
