# Final deployment script for v1.0.31
$ErrorActionPreference = "Stop"

$version = "1.0.31"
$deployFolder = "deploy_v1.0.31"
$deployZip = "deploy_v1.0.31.zip"

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Final Deployment Preparation v$version" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Check if deploy folder exists
if (-not (Test-Path $deployFolder)) {
    Write-Host "Error: Deploy folder $deployFolder not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Creating deploy_v1.0.31.zip from folder..." -ForegroundColor Cyan

# Remove old zip if exists
if (Test-Path $deployZip) {
    Remove-Item $deployZip -Force
    Write-Host "  Removed old $deployZip" -ForegroundColor Gray
}

# Create zip file
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($deployZip, [System.IO.Compression.ZipArchiveMode]::Create)

$deployFolderPath = (Resolve-Path $deployFolder).Path
$files = Get-ChildItem -Path $deployFolder -Recurse -File
$totalFiles = $files.Count
$currentFile = 0

foreach ($file in $files) {
    $currentFile++
    $relativePath = $file.FullName.Substring($deployFolderPath.Length + 1)
    $entryName = $relativePath.Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    
    if ($currentFile % 50 -eq 0) {
        Write-Host "  Processed $currentFile / $totalFiles files..." -ForegroundColor Gray
    }
}

$zip.Dispose()
$zipSize = [math]::Round((Get-Item $deployZip).Length / 1MB, 2)
Write-Host "  Created $deployZip ($zipSize MB)" -ForegroundColor Green
Write-Host ""

# Step 2: Copy to updates folder
Write-Host "Step 2: Preparing updates/deploy.zip..." -ForegroundColor Cyan

if (-not (Test-Path "updates")) {
    New-Item -ItemType Directory -Path "updates" -Force | Out-Null
    Write-Host "  Created updates/ folder" -ForegroundColor Gray
}

$updatesPath = Join-Path "updates" "deploy.zip"
if (Test-Path $updatesPath) {
    Remove-Item $updatesPath -Force
    Write-Host "  Removed old deploy.zip from updates/" -ForegroundColor Gray
}

Copy-Item -Path $deployZip -Destination $updatesPath -Force
$updatesSize = [math]::Round((Get-Item $updatesPath).Length / 1MB, 2)
Write-Host "  Copied to updates/deploy.zip ($updatesSize MB)" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Deployment Ready!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files prepared:" -ForegroundColor Cyan
Write-Host "  - $deployZip ($zipSize MB)" -ForegroundColor White
Write-Host "  - updates/deploy.zip ($updatesSize MB)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Upload updates/deploy.zip to production server" -ForegroundColor White
Write-Host "     Location: https://timepay.borgelarabpress.com/updates/deploy.zip" -ForegroundColor Gray
Write-Host "  2. Login to production site" -ForegroundColor White
Write-Host "  3. Use built-in update system to apply v$version" -ForegroundColor White
Write-Host ""
