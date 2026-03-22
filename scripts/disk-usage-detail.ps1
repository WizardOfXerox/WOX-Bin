$root = "C:\Users\XIA\Desktop\Wox-Bin"
$targets = @(".next", "node_modules", "bookmarkfs", "legacy")
foreach ($d in $targets) {
  $p = Join-Path $root $d
  if (-not (Test-Path $p)) { continue }
  $sum = (Get-ChildItem -LiteralPath $p -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  Write-Output ("{0}: {1:N1} MB" -f $d, ($sum / 1MB))
}

# Top children of .next
$next = Join-Path $root ".next"
if (Test-Path $next) {
  Write-Output "--- .next top-level ---"
  Get-ChildItem -LiteralPath $next -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $sum = if ($_.PSIsContainer) {
      (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    } else { $_.Length }
    [PSCustomObject]@{ Name = $_.Name; MB = [math]::Round($sum / 1MB, 2) }
  } | Sort-Object MB -Descending | Select-Object -First 15 | Format-Table | Out-String | Write-Output
}

# bookmarkfs largest files
$bm = Join-Path $root "bookmarkfs"
if (Test-Path $bm) {
  Write-Output "--- bookmarkfs largest files ---"
  Get-ChildItem -LiteralPath $bm -Recurse -File -Force -ErrorAction SilentlyContinue |
    Sort-Object Length -Descending | Select-Object -First 12 FullName, @{N='MB';E={[math]::Round($_.Length/1MB,2)}} |
    Format-Table | Out-String | Write-Output
}
