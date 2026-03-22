# Stops whatever is listening on the dev port (default 3000) — e.g. leftover `next dev`.
# Safer than killing every node.exe (won't touch Cursor/VS Code language servers unless they use that port).
param(
  [int]$Port = 3000
)

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Host "Nothing listening on port $Port."
  exit 0
}

$seen = @{}
foreach ($c in $listeners) {
  $procId = $c.OwningProcess
  if ($seen.ContainsKey($procId)) { continue }
  $seen[$procId] = $true
  try {
    $p = Get-Process -Id $procId -ErrorAction Stop
    Write-Host "Stopping PID $procId ($($p.ProcessName)) on port $Port"
    Stop-Process -Id $procId -Force -ErrorAction Stop
  } catch {
    Write-Warning "Could not stop PID ${procId}: $_"
  }
}
Write-Host "Done."
