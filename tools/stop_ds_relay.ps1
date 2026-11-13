$ErrorActionPreference = 'Stop'
$relayRoot = Split-Path $PSScriptRoot -Parent
$relayState = Join-Path $relayRoot '.artifacts/ds-relay'
foreach ($relayKind in @('tunnel', 'relay')) {
    $relayPidFile = Join-Path $relayState ($relayKind + '-pid.txt')
    if (-not (Test-Path -LiteralPath $relayPidFile)) { continue }
    $relayProcessId = [int](Get-Content -LiteralPath $relayPidFile -Raw)
    $relayProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $relayProcessId"
    if (-not $relayProcess) { continue }
    $relayMatches = if ($relayKind -eq 'tunnel') {
        $relayProcess.ExecutablePath -eq (Join-Path $relayState 'bin/cloudflared.exe')
    } else {
        $relayProcess.Name -match '^python(w)?\.exe$' -and $relayProcess.CommandLine -match 'tools[\\/]ds_relay\.py'
    }
    if ($relayMatches) {
        Stop-Process -Id $relayProcessId
        Write-Output "Stopped $relayKind ($relayProcessId)."
    } else {
        Write-Warning "Skipped reused process ID $relayProcessId."
    }
}
if (Test-Path -LiteralPath $relayState) {
    [IO.File]::WriteAllText((Join-Path $relayState 'public.json'), '{"url":null,"temporary":true,"stopped":true}')
}
