$ErrorActionPreference = 'Stop'
Write-Host "Checking Atomos frontend files..." -ForegroundColor Cyan
$required = @('package.json','vite.config.ts','tsconfig.json','index.html','src/main.tsx','src/App.tsx')
foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing required file: $file" }
  Write-Host "OK  $file" -ForegroundColor Green
}
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
npm install
Write-Host "`nRunning production build..." -ForegroundColor Cyan
npm run build
Write-Host "`nRunning TypeScript check..." -ForegroundColor Cyan
npm run typecheck
Write-Host "`nAtomos frontend verification completed." -ForegroundColor Green
