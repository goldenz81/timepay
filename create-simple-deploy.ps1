# Deploy script with version update and changelog
param(
    [string]$Changelog = "",
    [switch]$BumpMajor,
    [switch]$BumpMinor,
    [switch]$BumpPatch
)

Write-Host "=== Creating deploy.zip ===" -ForegroundColor Green

# Read current version from package.json
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
if (-not $currentVersion) { $currentVersion = "1.0.0" }

# Parse version
$versionParts = $currentVersion.Split('.')
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Bump version
if ($BumpMajor) {
    $major++
    $minor = 0
    $patch = 0
} elseif ($BumpMinor) {
    $minor++
    $patch = 0
} else {
    # Default: bump patch
    $patch++
}

$newVersion = "$major.$minor.$patch"
Write-Host "Version: $currentVersion -> $newVersion" -ForegroundColor Cyan

# Update package.json - replace version only, preserving original formatting
$packageContent = [System.IO.File]::ReadAllText("$pwd\package.json")
$packageContent = $packageContent -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$newVersion`""
[System.IO.File]::WriteAllText("$pwd\package.json", $packageContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Updated package.json" -ForegroundColor Gray

# Get changelog if not provided
if (-not $Changelog) {
    $Changelog = "System update v$newVersion"
}

Write-Host "Changelog: $Changelog" -ForegroundColor Yellow

# Create deploy file name with version
$deployFileName = "deploy_v$newVersion.zip"

# Remove existing zip files
if (Test-Path "deploy.zip") {
    Remove-Item "deploy.zip" -Force
    Write-Host "Removed old deploy.zip" -ForegroundColor Gray
}
if (Test-Path $deployFileName) {
    Remove-Item $deployFileName -Force
    Write-Host "Removed old $deployFileName" -ForegroundColor Gray
}

# Check build folder
if (-not (Test-Path "build")) {
    Write-Host "ERROR: build folder not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`nCreating deployment package..." -ForegroundColor Cyan

# Create temp directory
$tempDir = Join-Path $env:TEMP "deploy_temp_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy build contents
Write-Host "  - Copying build/..." -ForegroundColor Gray
Copy-Item -Path "build\*" -Destination $tempDir -Recurse -Force

# Copy folders (excluding static and public)
# ملاحظة: public/ غير مطلوب لأن محتوياته موجودة بالفعل في build/
# build/ يحتوي على جميع ملفات public/ بعد عملية npm run build
$folders = @("api", "config", "models", "includes", "updates", "uploads", "data")
foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "  - Copying $folder/..." -ForegroundColor Gray
        Copy-Item -Path $folder -Destination $tempDir -Recurse -Force
    }
}

# Note: static folder is NOT copied because build/static contains the latest compiled files
# Copying static would overwrite the new build files with old ones

# Copy important root files (use build/index.html instead of root index.html to ensure latest version)
$rootFiles = @("index.php_", "sw.js", "manifest.json", "site.webmanifest", "favicon.ico", "favicon.png", "login-pic.png", "package.json")
foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Write-Host "  - Copying $file..." -ForegroundColor Gray
        Copy-Item -Path $file -Destination $tempDir -Force
    }
}

# Copy build/index.html to root (ensures latest version with correct file references)
if (Test-Path "build\index.html") {
    Write-Host "  - Copying build/index.html..." -ForegroundColor Gray
    Copy-Item -Path "build\index.html" -Destination (Join-Path $tempDir "index.html") -Force
}

# Create version.json
$dateNow = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$versionInfo = @{
    version = $newVersion
    buildDate = $dateNow
    changelog = @(
        @{
            date = $dateNow
            summary = $Changelog
            version = $newVersion
        }
    )
}
$versionJson = $versionInfo | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Join-Path $tempDir "version.json"), $versionJson, [System.Text.Encoding]::UTF8)
Write-Host "  - Created version.json" -ForegroundColor Gray

# Update local changelog.json
$changelogPath = "updates\changelog.json"
if (-not (Test-Path "updates")) {
    New-Item -ItemType Directory -Path "updates" -Force | Out-Null
}

if (Test-Path $changelogPath) {
    $localChangelog = Get-Content $changelogPath -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
    $localChangelog = [PSCustomObject]@{
        version = $newVersion
        updates = @()
    }
}

$newEntry = [PSCustomObject]@{
    date = $dateNow
    summary = $Changelog
    version = $newVersion
}

$updatesArray = @($newEntry)
if ($localChangelog.updates) {
    $updatesArray += $localChangelog.updates
}
$localChangelog.updates = $updatesArray
$localChangelog.version = $newVersion

$changelogJson = $localChangelog | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($changelogPath, $changelogJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "  - Updated changelog.json" -ForegroundColor Gray

# Create ZIP with forward slashes (Linux compatible)
Write-Host "`nCompressing with correct paths..." -ForegroundColor Cyan

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = Join-Path (Get-Location).Path $deployFileName
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

# Add all files with forward slashes
Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($tempDir.Length + 1)
    # Convert backslash to forward slash
    $entryName = $relativePath.Replace('\', '/')
    
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

$zip.Dispose()

# Cleanup
Remove-Item $tempDir -Recurse -Force

# Copy to updates folder (for update system)
if (-not (Test-Path "updates")) {
    New-Item -ItemType Directory -Path "updates" -Force | Out-Null
}
$updatesZipPath = Join-Path "updates" "deploy.zip"
if (Test-Path $updatesZipPath) {
    Remove-Item $updatesZipPath -Force
}
Copy-Item -Path $zipPath -Destination $updatesZipPath -Force
Write-Host "  - Copied to updates/deploy.zip" -ForegroundColor Gray

# Also create deploy.zip in root for backward compatibility
$rootDeployPath = Join-Path (Get-Location).Path "deploy.zip"
Copy-Item -Path $zipPath -Destination $rootDeployPath -Force
Write-Host "  - Copied to deploy.zip (backward compatibility)" -ForegroundColor Gray

# Summary
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "  DEPLOY READY!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "  File: $deployFileName ($zipSize MB)" -ForegroundColor White
Write-Host "  Version: v$newVersion" -ForegroundColor Cyan
Write-Host "  Location: Root + updates/ folder" -ForegroundColor Cyan
Write-Host "  Date: $dateNow" -ForegroundColor White
Write-Host "  Changelog: $Changelog" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Green
