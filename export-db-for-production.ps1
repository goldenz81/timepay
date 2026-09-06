# Export Database for Production - Clean SQL Export
# This script exports the database in a format safe for phpMyAdmin import

$ErrorActionPreference = "Stop"

# Database configuration (Development)
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"

# Output file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputFile = "backups\timepay_unified_production_$timestamp.sql"

# Create backups directory if it doesn't exist
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" -Force | Out-Null
    Write-Host "Created backups directory" -ForegroundColor Gray
}

# Find mysqldump
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
        if ($found) {
            $mysqldump = $found.FullName
            break
        }
    } else {
        if (Test-Path $path) {
            $mysqldump = $path
            break
        }
    }
}

if (-not $mysqldump) {
    Write-Host "Error: mysqldump.exe not found!" -ForegroundColor Red
    Write-Host "Please ensure MySQL is installed." -ForegroundColor Yellow
    exit 1
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Database Export for Production" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host "Output: $outputFile" -ForegroundColor Cyan
Write-Host "Using: $mysqldump" -ForegroundColor Gray
Write-Host ""

# Export with safe options for phpMyAdmin
Write-Host "Exporting database..." -ForegroundColor Yellow

$mysqldumpArgs = @(
    "--host=$dbHost",
    "--user=$dbUser",
    "--password=$dbPassword",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--events",
    "--add-drop-database",
    "--add-drop-table",
    "--complete-insert",
    "--extended-insert",
    "--quick",
    "--lock-tables=false",
    "--default-character-set=utf8mb4",
    "--skip-comments",  # Skip comments to avoid phpMyAdmin parser issues
    "--skip-add-locks",  # Skip lock statements
    "--skip-disable-keys",  # Skip disable keys
    "$dbName"
)

try {
    # Execute mysqldump and capture output
    Write-Host "  Running mysqldump..." -ForegroundColor Gray
    
    # Redirect stderr to null to suppress warnings, capture stdout
    $process = Start-Process -FilePath $mysqldump -ArgumentList $mysqldumpArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError "nul"
    
    # Check if file was created and has content
    if (-not (Test-Path $outputFile)) {
        throw "Output file was not created"
    }
    
    # Read the file and ensure UTF-8 encoding (without BOM)
    $content = Get-Content $outputFile -Raw -Encoding UTF8
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($outputFile, $content, $utf8NoBom)
    
    if (Test-Path $outputFile) {
        $fileSize = (Get-Item $outputFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  Export Completed Successfully!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  File: $outputFile" -ForegroundColor White
        Write-Host "  Size: $fileSizeMB MB" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Upload this file to production server" -ForegroundColor White
        Write-Host "  2. Import via phpMyAdmin:" -ForegroundColor White
        Write-Host "     - Go to phpMyAdmin on production" -ForegroundColor Gray
        Write-Host "     - Select the database" -ForegroundColor Gray
        Write-Host "     - Click 'Import' tab" -ForegroundColor Gray
        Write-Host "     - Choose file: $outputFile" -ForegroundColor Gray
        Write-Host "     - Click 'Go'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Or use command line:" -ForegroundColor White
        Write-Host "     mysql -u [user] -p [database] < $outputFile" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "Error: Export file was not created!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "Error during export: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
