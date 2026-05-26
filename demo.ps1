param(
  [string]$Address = "0x7a0c09d89052eb39a942a1320673a946f4a2dfce"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`nPharos Ecosystem Asset Tracker Demo" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Install deps if needed
if (-not (Test-Path "$root\node_modules")) {
  Write-Host "[setup] Installing dependencies..." -ForegroundColor Yellow
  npm install --prefix $root 2>&1 | Out-Null
}

Write-Host "[run] Tracking wallet: $Address`n" -ForegroundColor Green

npx tsx "$root\main.ts" $Address
if ($LASTEXITCODE -eq 0) {
  Write-Host "`nDemo completed successfully!" -ForegroundColor Green
} else {
  Write-Host "`nDemo finished with warnings (partial data may be shown)" -ForegroundColor Yellow
}
