# Quick deploy script - excludes static folder
$ErrorActionPreference = 'Stop'

Write-Host "=== Creating deploy.zip ===" -ForegroundColor Green

# Read current version from package.json
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
if (-not $currentVersion) { $currentVersion = "1.0.0" }

# Parse version and bump patch version
$versionParts = $currentVersion.Split('.')
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Bump patch version (1.0.25 -> 1.0.26)
$patch++

$newVersion = "$major.$minor.$patch"
Write-Host "Version: $currentVersion -> $newVersion" -ForegroundColor Cyan

# Update package.json - replace version only, preserving original formatting
$packageContent = [System.IO.File]::ReadAllText("$pwd\package.json")
$packageContent = $packageContent -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$newVersion`""
[System.IO.File]::WriteAllText("$pwd\package.json", $packageContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Updated package.json to v$newVersion" -ForegroundColor Gray

$deployFileName = "deploy_v$newVersion.zip"
Write-Host "Deploy file: $deployFileName" -ForegroundColor Cyan

# Remove old zip files
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

# Create temp directory
$tempDir = Join-Path $env:TEMP "deploy_temp_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# --- تصدير نسخة كاملة من قاعدة البيانات (مدمجة في النشر) ---
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"
$dbExportPath = Join-Path $tempDir "database_backup.sql"

$mysqldumpPaths = @(
    "E:\Ampps\mysql\bin\mysqldump.exe",
    "C:\Ampps\mysql\bin\mysqldump.exe",
    "C:\xampp\mysql\bin\mysqldump.exe",
    "C:\wamp\bin\mysql\mysql*\bin\mysqldump.exe",
    "C:\Program Files\MySQL\MySQL Server *\bin\mysqldump.exe",
    "mysqldump.exe"
)
$mysqldump = $null
foreach ($path in $mysqldumpPaths) {
    if ($path -like "*") {
        $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { $mysqldump = $found.FullName; break }
    } else {
        if (Test-Path $path) { $mysqldump = $path; break }
    }
}

if ($mysqldump) {
    Write-Host "  - Exporting database: $dbName -> database_backup.sql ..." -ForegroundColor Gray
    $mysqldumpArgs = @(
        "--host=$dbHost", "--user=$dbUser", "--password=$dbPassword",
        "--single-transaction", "--routines", "--triggers", "--events",
        "--add-drop-database", "--add-drop-table", "--complete-insert", "--extended-insert",
        "--quick", "--lock-tables=false", "--default-character-set=utf8mb4",
        "--skip-comments", "--skip-add-locks", "--skip-disable-keys",
        "$dbName"
    )
    try {
        $process = Start-Process -FilePath $mysqldump -ArgumentList $mysqldumpArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $dbExportPath -RedirectStandardError "nul"
        if ((Test-Path $dbExportPath) -and ((Get-Item $dbExportPath).Length -gt 0)) {
            $content = Get-Content $dbExportPath -Raw -Encoding UTF8
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($dbExportPath, $content, $utf8NoBom)
            $dbSizeMB = [math]::Round((Get-Item $dbExportPath).Length / 1MB, 2)
            Write-Host "    Database export OK ($dbSizeMB MB)" -ForegroundColor Green
        } else {
            if (Test-Path $dbExportPath) { Remove-Item $dbExportPath -Force }
            Write-Host "    Database export failed (empty or missing), continuing without." -ForegroundColor Yellow
        }
    } catch {
        if (Test-Path $dbExportPath) { Remove-Item $dbExportPath -Force -ErrorAction SilentlyContinue }
        Write-Host "    Database export error: $($_.Exception.Message). Continuing without." -ForegroundColor Yellow
    }
} else {
    Write-Host "  - mysqldump not found; skipping database export." -ForegroundColor Yellow
}

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
        if ($folder -eq "updates") {
            # منع تكرار حزم التحديث داخل الحزمة نفسها (deploy.zip / deploy_v*.zip)
            New-Item -ItemType Directory -Path (Join-Path $tempDir "updates") -Force | Out-Null
            Get-ChildItem -Path $folder -Recurse -File | Where-Object { $_.Extension -ne ".zip" } | ForEach-Object {
                $relativePath = $_.FullName.Substring((Resolve-Path $folder).Path.Length).TrimStart('\')
                $destinationPath = Join-Path (Join-Path $tempDir "updates") $relativePath
                $destinationDir = Split-Path $destinationPath -Parent
                if (-not (Test-Path $destinationDir)) {
                    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
                }
                Copy-Item -Path $_.FullName -Destination $destinationPath -Force
            }
        } else {
            Copy-Item -Path $folder -Destination $tempDir -Recurse -Force
        }
    }
}

# Copy root files (use build/index.html instead of root index.html to ensure latest version)
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

# Create ZIP
Write-Host "`nCompressing..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = Join-Path (Get-Location).Path $deployFileName
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($tempDir.Length + 1)
    $entryName = $relativePath.Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
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

# Summary
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "  DEPLOY READY!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "  File: $deployFileName ($zipSize MB)" -ForegroundColor White
Write-Host "  Version: v$newVersion (was v$currentVersion)" -ForegroundColor Cyan
Write-Host "  Location: Root + updates/ folder" -ForegroundColor Cyan
Write-Host "  Includes: build + api/config/data + database_backup.sql (if export succeeded)" -ForegroundColor Cyan
Write-Host "  Note: static folder excluded (using build/static instead)" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Green

