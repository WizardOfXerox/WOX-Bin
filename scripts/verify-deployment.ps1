param(
  [string]$BaseUrl,
  [string]$ProfileUsername,
  [string]$ExpectedEnvironment
)

$resolvedBaseUrl = $BaseUrl

if ([string]::IsNullOrWhiteSpace($resolvedBaseUrl)) {
  $resolvedBaseUrl = $env:NEXT_PUBLIC_APP_URL
}

if ([string]::IsNullOrWhiteSpace($resolvedBaseUrl)) {
  $resolvedBaseUrl = "http://localhost:3000"
}

$resolvedBaseUrl = $resolvedBaseUrl.TrimEnd("/")

if ([string]::IsNullOrWhiteSpace($ProfileUsername)) {
  $ProfileUsername = $env:VERIFY_PROFILE_USERNAME
}

if ([string]::IsNullOrWhiteSpace($ExpectedEnvironment)) {
  $ExpectedEnvironment = $env:VERIFY_EXPECTED_ENVIRONMENT
}

$checks = @(
  @{ Name = "Health"; Path = "/api/health"; Expected = @(200) },
  @{ Name = "Landing"; Path = "/"; Expected = @(200) },
  @{ Name = "Sign in"; Path = "/sign-in"; Expected = @(200) },
  @{ Name = "Feed"; Path = "/feed"; Expected = @(200) },
  @{ Name = "Archive"; Path = "/archive"; Expected = @(200) },
  @{ Name = "Discord landing"; Path = "/discord"; Expected = @(200) },
  @{ Name = "Discord interactions GET guard"; Path = "/api/discord/interactions"; Expected = @(405) },
  @{ Name = "Discord events GET guard"; Path = "/api/discord/events"; Expected = @(405) }
)

if (-not [string]::IsNullOrWhiteSpace($ProfileUsername)) {
  $normalizedProfile = [uri]::EscapeDataString($ProfileUsername.Trim().ToLowerInvariant())
  $checks += @{ Name = "Public profile"; Path = "/u/$normalizedProfile"; Expected = @(200) }
}

$failures = 0

foreach ($check in $checks) {
  $uri = "$resolvedBaseUrl$($check.Path)"
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers @{ Accept = "text/html,application/json" }
    $statusCode = [int]$response.StatusCode
  } catch {
    $webResponse = $_.Exception.Response
    if ($null -ne $webResponse) {
      $statusCode = [int]$webResponse.StatusCode
    } else {
      Write-Host ("FAIL  {0} -> request error" -f $check.Name) -ForegroundColor Red
      $failures += 1
      continue
    }
  }

  if ($check.Expected -contains $statusCode) {
    Write-Host ("PASS  {0} -> {1}" -f $check.Name, $statusCode) -ForegroundColor Green
  } else {
    Write-Host ("FAIL  {0} -> {1} (expected {2})" -f $check.Name, $statusCode, ($check.Expected -join ", ")) -ForegroundColor Red
    $failures += 1
  }
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedEnvironment)) {
  try {
    $health = Invoke-RestMethod -UseBasicParsing -Uri "$resolvedBaseUrl/api/health" -Headers @{ Accept = "application/json" }
    if ($health.deployment.environment -eq $ExpectedEnvironment) {
      Write-Host ("PASS  Health environment -> {0}" -f $health.deployment.environment) -ForegroundColor Green
    } else {
      Write-Host ("FAIL  Health environment -> {0} (expected {1})" -f $health.deployment.environment, $ExpectedEnvironment) -ForegroundColor Red
      $failures += 1
    }
  } catch {
    Write-Host "FAIL  Health environment -> request error" -ForegroundColor Red
    $failures += 1
  }
}

if ($failures -gt 0) {
  Write-Host ("Deployment verification failed with {0} failing check(s)." -f $failures) -ForegroundColor Red
  exit 1
}

Write-Host "Deployment verification passed." -ForegroundColor Cyan
