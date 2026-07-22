import subprocess

def consultar_impresora_avanzado(printer, es_color=False):
    """
    Ejecuta un script de PowerShell optimizado que extrae el contador general
    y calcula de forma inteligente el porcentaje de los tóners.
    """
    ps_command = f"""
    $sys = New-Object -ComObject OlePrn.OleSNMP
    try {{
        $sys.Open("{printer}", "public", 2, 161)
        
        # 1. Obtener Contador
        try {{ $contador = $sys.Get(".1.3.6.1.2.1.43.10.2.1.4.1.1") }} catch {{ $contador = "ERROR" }}
        
        # Diccionario para mapear índices encontrados
        $indices = @{{ "black" = 0; "cyan" = 0; "magenta" = 0; "yellow" = 0 }}

        # 2. Mapeo dinámico de índices de tóners
        for ($i = 1; $i -le 12; $i++) {{
            try {{
                $desc = $sys.Get(".1.3.6.1.2.1.43.11.1.1.6.1.$i").ToLower()
                if ($desc -like "*black*" -or $desc -like "*negro*") {{ $indices["black"] = $i }}
                if ($desc -like "*cyan*" -or $desc -like "*cian*") {{ $indices["cyan"] = $i }}
                if ($desc -like "*magenta*") {{ $indices["magenta"] = $i }}
                if ($desc -like "*yellow*" -or $desc -like "*amarillo*") {{ $indices["yellow"] = $i }}
            }} catch {{}}
        }}

        # Función interna para calcular porcentaje por color
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

        if ("{es_color}" -eq "True") {{
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
    
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=10, 
            creationflags=0x08000000  
        )
        if result.returncode == 0 and result.stdout.strip():
            partes = result.stdout.strip().split('|')
            if len(partes) == 5:
                return partes[0], partes[1], partes[2], partes[3], partes[4]
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"
    except:
        return "ERROR", "ERROR", "ERROR", "ERROR", "ERROR"