/**
 * Módulo de Cifrado - Decodificación XOR
 * ========================================
 * Descifra el diccionario de direcciones físicas de impresoras
 * usando una operación XOR bit a bit con la clave ingresada por el usuario.
 */

/**
 * Descifra DATOS_PROTEGIDOS_HEX usando una clave XOR.
 * @param {string} clave - Contraseña ingresada por el usuario
 * @returns {object|null} - Diccionario { IP: { direc, sector } } o null si falla
 */
function obtenerDiccionarioDescifrado(clave) {
    if (!clave) return null;
    try {
        let str = "";
        for (let i = 0; i < DATOS_PROTEGIDOS_HEX.length; i += 2) {
            let byte = parseInt(DATOS_PROTEGIDOS_HEX.substring(i, i + 2), 16);
            let charClave = clave.charCodeAt((i / 2) % clave.length);
            str += String.fromCharCode(byte ^ charClave);
        }
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

