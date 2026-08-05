/**
 * Módulo Admin Login - Autenticación
 * ====================================
 * Maneja el login contra la API backend.
 * Dependencias: admin-ui.js (mostrarPanelAdmin)
 */

const API_BASE = "http://localhost:8001";

async function intentarLogin() {
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value.trim();
    const errorEl = document.getElementById("admin-login-error");
    const btn = document.getElementById("admin-login-btn");
    const text = document.getElementById("admin-login-text");
    const spinner = document.getElementById("admin-login-spinner");

    if (!email || !password) {
        errorEl.textContent = "⚠️ Complete todos los campos.";
        errorEl.style.display = "block";
        return;
    }

    btn.disabled = true;
    text.style.display = "none";
    spinner.style.display = "inline";
    errorEl.style.display = "none";

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            const impresoras = result.impresoras || [];
            mostrarPanelAdmin(impresoras);
        } else {
            errorEl.textContent = result.error || "⚠️ Credenciales incorrectas.";
            errorEl.style.display = "block";
        }
    } catch (err) {
        errorEl.textContent = "⚠️ Error de conexión con el servidor. ¿Está corriendo printer_api.py?";
        errorEl.style.display = "block";
        console.error("Error login:", err);
    } finally {
        btn.disabled = false;
        text.style.display = "inline";
        spinner.style.display = "none";
    }
}
