param(
    [string]$ApiBaseUrl = "https://api.archerexecutivecar.com/api/v1",
    [string]$BuildMode = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Archer Mobile APK Build Pipeline" -ForegroundColor Cyan
Write-Host " Target API Base URL: $ApiBaseUrl" -ForegroundColor Cyan
Write-Host " Build Mode: $BuildMode" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$distDir = Join-Path $PSScriptRoot "..\dist"
if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

# 1. Customer App
Write-Host "`n[1/2] Building Customer App APK (Archer Executive)..." -ForegroundColor Yellow
$customerDir = Join-Path $repoRoot "mobile\apps\customer_app"
Push-Location $customerDir
try {
    flutter pub get
    flutter build apk --$BuildMode --dart-define=API_BASE_URL="$ApiBaseUrl"
    $customerApk = Join-Path $customerDir "build\app\outputs\flutter-apk\app-$BuildMode.apk"
    if (Test-Path $customerApk) {
        $dest = Join-Path $distDir "archer-customer-$BuildMode.apk"
        Copy-Item -Path $customerApk -Destination $dest -Force
        $size = (Get-Item $dest).Length / 1MB
        Write-Host "✓ Customer APK generated: $dest ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Warning "Customer APK output not found at $customerApk"
    }
} finally {
    Pop-Location
}

# 2. Driver App
Write-Host "`n[2/2] Building Driver App APK (Archer Chauffeur)..." -ForegroundColor Yellow
$driverDir = Join-Path $repoRoot "mobile\apps\driver_app"
Push-Location $driverDir
try {
    flutter pub get
    flutter build apk --$BuildMode --dart-define=API_BASE_URL="$ApiBaseUrl"
    $driverApk = Join-Path $driverDir "build\app\outputs\flutter-apk\app-$BuildMode.apk"
    if (Test-Path $driverApk) {
        $dest = Join-Path $distDir "archer-driver-$BuildMode.apk"
        Copy-Item -Path $driverApk -Destination $dest -Force
        $size = (Get-Item $dest).Length / 1MB
        Write-Host "✓ Driver APK generated: $dest ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Warning "Driver APK output not found at $driverApk"
    }
} finally {
    Pop-Location
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " All APKs built successfully in: $distDir" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Get-ChildItem $distDir -Filter "*.apk" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
