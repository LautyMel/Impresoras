"""
Módulo de Escaneo SNMP de Impresoras
=====================================
Ejecuta scripts PowerShell para consultar impresoras vía protocolo SNMP.
"""

import subprocess
from .config import TIMEOUT_SNMP


def consultar_impresora(ip_impresora, es_color=False):
    """
    Escanea una impresora por SNMP usando PowerShell.
    
    Args:
        ip_impresora: Dirección IP de la impresora
        es_color: Si es True, escanea tóners CMYK completos
    
    Returns:
        tuple: (contador, t_black, t_cyan, t_magenta, t_yellow)
        - contador: str numérico o "ERROR"
        - t_black, t_cyan, t_magenta, t_yellow: str porcentaje, "OK", "ERROR" o "N/A"
    """
    ps_command = _generar_script_powershell(ip_impresora, es_color)

    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=TIMEOUT_SNMP,
            creationflags=0x08000000  # CREATE_NO_WINDOW
        )

        if result.returncode == 0 and result.stdout.strip():
            partes = result.stdout.strip().split('|')
            if len(partes) == 5:
                return partes[0], partes[1], partes[2], partes[3], partes[4]

        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"

    except subprocess.TimeoutExpired:
        print(f" ⏱️ Timeout: {ip_impresora} no respondió en {TIMEOUT_SNMP}s")
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"
    except Exception as e:
        print(f" ❌ Error en escaneo {ip_impresora}: {e}")
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"


def _generar_script_powershell(ip, es_color):
    """
    Genera el script PowerShell dinámico para consulta SNMP.
    Detecta índices de tóners automáticamente.
    """
    es_color_str = "True" if es_color else "False"

    return f"""
    $sys = New-Object -ComObject OlePrn.OleSNMP
    try {{
        $sys.Open("{ip}", "public", 2, 161)
        
        # 1. Obtener Contador General
        try {{ $contador = $sys.Get(".1.3.6.1.2.1.43.10.2.1.4.1.1") }} catch {{ $contador = "ERROR" }}
        
        # 2. Mapeo dinámico de índices de tóners (busca en hasta 12 slots)
        $indices = @{{ "black" = 0; "cyan" = 0; "magenta" = 0; "yellow" = 0 }}
        for ($i = 1; $i -le 12; $i++) {{
            try {{
                $desc = $sys.Get(".1.3.6.1.2.1.43.11.1.1.6.1.$i").ToLower()
                if ($desc -like "*black*" -or $desc -like "*negro*") {{ $indices["black"] = $i }}
                if ($desc -like "*cyan*" -or $desc -like "*cian*") {{ $indices["cyan"] = $i }}
                if ($desc -like "*magenta*") {{ $indices["magenta"] = $i }}
                if ($desc -like "*yellow*" -or $desc -like "*amarillo*") {{ $indices["yellow"] = $i }}
            }} catch {{}}
        }}

        # 3. Función para calcular porcentaje de tóner
        function Calcular-Toner($idx) {{
            if ($idx -eq 0) {{ return "ERROR" }}
            try {{
                $actual = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.9.1.$idx")
                $maximo = [int]$sys.Get(".1.3.6.1.2.1.43.11.1.1.8.1.$idx")
                if ($actual -gt 0 -and $maximo -gt 0) {{
                    return "$([Math]::Round(($actual / $maximo) * 100))%"
                }} elseif ($actual -eq -3) {{
                    return "OK"
                }} else {{
                    return "ERROR"
                }}
            }} catch {{ return "ERROR" }}
        }}

        $tBlack = Calcular-Toner($indices["black"])

        if ("{es_color_str}" -eq "True") {{
            $tCyan = Calcular-Toner($indices["cyan"])
            $tMagenta = Calcular-Toner($indices["magenta"])
            $tYellow = Calcular-Toner($indices["yellow"])
        }} else {{
            $tCyan = "N/A"
            $tMagenta = "N/A"
            $tYellow = "N/A"
        }}

    }} catch {{
        $contador = "ERROR"
        $tBlack = "ERROR"; $tCyan = "ERROR"; $tMagenta = "ERROR"; $tYellow = "ERROR"
    }}
    
    Write-Output "$contador|$tBlack|$tCyan|$tMagenta|$tYellow"
    """

