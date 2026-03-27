param(
  [string]$BaseUrl
)

$resolvedBaseUrl = $BaseUrl

if ([string]::IsNullOrWhiteSpace($resolvedBaseUrl)) {
  $resolvedBaseUrl = $env:NEXT_PUBLIC_APP_URL
}

if ([string]::IsNullOrWhiteSpace($resolvedBaseUrl)) {
  $resolvedBaseUrl = "http://localhost:3000"
}

$resolvedBaseUrl = $resolvedBaseUrl.TrimEnd("/")
$uri = "$resolvedBaseUrl/api/health"

Write-Host "Checking WOX-Bin health at $uri" -ForegroundColor Cyan

try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers @{ Accept = "application/json" }
  $statusCode = [int]$response.StatusCode
  $payload = $response.Content | ConvertFrom-Json
} catch {
  $webResponse = $_.Exception.Response
  if ($null -ne $webResponse) {
    $statusCode = [int]$webResponse.StatusCode
    $stream = $webResponse.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    if (-not [string]::IsNullOrWhiteSpace($content)) {
      try {
        $payload = $content | ConvertFrom-Json
      } catch {
        $payload = $null
      }
    }
  } else {
    Write-Error $_
    exit 1
  }
}

$dbStatus = if ($null -ne $payload) { $payload.db } else { "unknown" }
$rateLimitMode = if ($null -ne $payload -and $null -ne $payload.rateLimit) { $payload.rateLimit.activeMode } else { "unknown" }
$rateLimitConfigured = if ($null -ne $payload -and $null -ne $payload.rateLimit) { [bool]$payload.rateLimit.configured } else { $false }
$rateLimitDegraded = if ($null -ne $payload -and $null -ne $payload.rateLimit) { [bool]$payload.rateLimit.degraded } else { $false }
$environment = if ($null -ne $payload -and $null -ne $payload.deployment) { $payload.deployment.environment } else { "unknown" }
$commit = if ($null -ne $payload -and $null -ne $payload.deployment) { $payload.deployment.commit } else { $null }
$checkedAt = if ($null -ne $payload) { $payload.time } else { $null }

Write-Host ("Status      : {0}" -f $statusCode)
Write-Host ("Database    : {0}" -f $dbStatus)
Write-Host ("Rate limit  : {0} (configured={1}, degraded={2})" -f $rateLimitMode, $rateLimitConfigured, $rateLimitDegraded)
Write-Host ("Environment : {0}" -f $environment)
Write-Host ("Commit      : {0}" -f ($(if ($commit) { $commit } else { "n/a" })))
Write-Host ("Checked at  : {0}" -f ($(if ($checkedAt) { $checkedAt } else { "n/a" })))

if ($statusCode -ge 400) {
  exit 1
}
