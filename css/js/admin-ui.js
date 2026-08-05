/**
 * Módulo Admin UI - Interfaz de Administración
 * ==============================================
 * Crea y gestiona el modal de administración (login + panel).
 * Dependencias: admin-crud.js
 */

// ==================== MODAL ====================

function abrirModalAdmin() {
    let overlay = document.getElementById("admin-modal-overlay");
    if (overlay) {
        overlay.style.display = "flex";
        return;
    }

    overlay = document.createElement("div");
    overlay.id = "admin-modal-overlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-content modal-admin" id="admin-modal-content">
            <div class="modal-header">
                <h2>⚙️ Panel de Administración</h2>
                <button class="modal-close" onclick="cerrarModalAdmin()" title="Cerrar">✕</button>
            </div>
            <div class="modal-body" id="admin-body">
                ${renderizarLogin()}
            </div>
        </div>
    `;

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrarModalAdmin();
    });

    document.body.appendChild(overlay);
}

function cerrarModalAdmin() {
    const overlay = document.getElementById("admin-modal-overlay");
    if (overlay) overlay.style.display = "none";
}

// ==================== LOGIN FORM ====================

function renderizarLogin() {
    return `
        <div class="admin-login" id="admin-login">
            <div class="admin-login-icon">🔐</div>
            <h3 class="admin-login-title">Acceso Restringido</h3>
            <p class="admin-login-desc">Ingrese el email registrado y la contraseña de seguridad para administrar las impresoras.</p>
            <div class="admin-login-form">
                <div class="admin-field">
                    <label for="admin-email">Email autorizado</label>
                    <input type="email" id="admin-email" class="admin-input" placeholder="correo@ejemplo.com" autocomplete="email">
                </div>
                <div class="admin-field">
                    <label for="admin-password">Contraseña</label>
                    <input type="password" id="admin-password" class="admin-input" placeholder="Contraseña del sistema" autocomplete="current-password">
                </div>
                <div class="admin-login-error" id="admin-login-error" style="display:none;"></div>
                <button class="btn btn-save admin-login-btn" onclick="intentarLogin()" id="admin-login-btn">
                    <span id="admin-login-text">Ingresar</span>
                    <span id="admin-login-spinner" style="display:none;">⏳</span>
                </button>
            </div>
        </div>
    `;
}

// ==================== PANEL ADMIN ====================

function mostrarPanelAdmin(impresoras) {
    const body = document.getElementById("admin-body");
    body.innerHTML = `
        <div class="admin-panel" id="admin-panel">
            <p class="admin-desc">Gestione el catálogo de impresoras. Los cambios se guardan en el servidor y se sincronizan automáticamente.</p>
            <div class="admin-table-actions">
                <button class="btn btn-add-printer" onclick="agregarImpresora()">✚ Agregar Impresora</button>
                <button class="btn btn-excel" onclick="descargarExcelMensual()">📊 Excel</button>
            </div>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th style="width:28%;">Nombre</th>
                            <th style="width:22%;">Dirección IP</th>
                            <th style="width:28%;">Ubicación</th>
                            <th style="width:12%;">Color</th>
                            <th style="width:10%;"></th>
                        </tr>
                    </thead>
                    <tbody id="admin-tabla-cuerpo"></tbody>
                </table>
            </div>
            <div class="admin-footer-actions">
                <button class="btn btn-cancel" onclick="cerrarModalAdmin()">Cancelar</button>
                <button class="btn btn-save" onclick="guardarImpresoras()">💾 Guardar Cambios</button>
            </div>
        </div>
    `;

    const tbody = document.getElementById("admin-tabla-cuerpo");
    impresoras.forEach(imp => agregarFilaTabla(imp.nombre, imp.ip, imp.ubicacion, imp.es_color));
}
