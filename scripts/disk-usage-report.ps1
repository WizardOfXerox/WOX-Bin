$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = $PSScriptRoot }
$root = Resolve-Path $root

Write-Host "Scanning: $root"
$items = Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue
$rows = foreach ($i in $items) {
  $name = $i.Name
  if ($i.PSIsContainer) {
    $sum = (Get-ChildItem -LiteralPath $i.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
  } else {
    $sum = $i.Length
  }
  [PSCustomObject]@{
    Name = $name
    MB   = [math]::Round(($sum / 1MB), 2)
    GB   = [math]::Round(($sum / 1GB), 3)
  }
}
$rows | Sort-Object MB -Descending | Format-Table -AutoSize | Out-String | Write-Host

$total = ($rows | Measure-Object -Property MB -Sum).Sum
Write-Host "Approx top-level sum: $([math]::Round($total, 2)) MB"
