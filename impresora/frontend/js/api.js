import { urlJson } from './config.js';

export async function cargarDatos() {
    try {
        const response = await fetch(`${urlJson}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("No se pudo obtener el JSON");
        return await response.json();
    } catch (err) {
        console.error("Error en API:", err);
        throw err;
    }
}