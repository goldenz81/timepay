# Export Database with Fixed UTF-8 Encoding
# This script ensures proper Arabic text encoding

$ErrorActionPreference = "Stop"

# Database configuration
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"

# Output file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputFile = "backups\timepay_unified_production_fixed_$timestamp.sql"

# Create backups directory
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" -Force | Out-Null
}

# Find mysqldump
$mysqldumpPaths = @(
    "E:\Ampps\mysql\bin\mysqldump.exe",
    "C:\Ampps\mysql\bin\mysqldump.exe",
    "C:\xampp\mysql\bin\mysqldump.exe",
    "mysqldump.exe"
)

$mysqldump = $null
foreach ($path in $mysqldumpPaths) {
    if (Test-Path $path) {
        $mysqldump = $path
        break
    }
}

if (-not $mysqldump) {
    Write-Host "Error: mysqldump.exe not found!" -ForegroundColor Red
    exit 1
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Database Export - Fixed Encoding" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host "Output: $outputFile" -ForegroundColor Cyan
Write-Host ""

# First, set MySQL connection to use UTF-8
Write-Host "Setting MySQL connection encoding..." -ForegroundColor Yellow

# Create a temporary SQL file to set encoding
$tempSqlFile = [System.IO.Path]::GetTempFileName()
$setEncodingSql = @"
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_connection=utf8mb4;
"@
[System.IO.File]::WriteAllText($tempSqlFile, $setEncodingSql, [System.Text.Encoding]::UTF8)

# Export with proper encoding settings
Write-Host "Exporting database with UTF-8 encoding..." -ForegroundColor Yellow

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
    "--set-charset",  # Include charset statements
    "--skip-comments",
    "--skip-add-locks",
    "--skip-disable-keys",
    "$dbName"
)

try {
    # Use cmd to properly handle encoding
    $tempOutput = [System.IO.Path]::GetTempFileName()
    
    # Run mysqldump and save to temp file
    $process = Start-Process -FilePath $mysqldump -ArgumentList $mysqldumpArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tempOutput -RedirectStandardError "nul"
    
    if (-not (Test-Path $tempOutput)) {
        throw "Temp output file was not created"
    }
    
    # Read the file as binary and convert to UTF-8 properly
    Write-Host "  Converting to UTF-8..." -ForegroundColor Gray
    $bytes = [System.IO.File]::ReadAllBytes($tempOutput)
    
    # Try to detect encoding
    $encoding = [System.Text.Encoding]::UTF8
    $content = $encoding.GetString($bytes)
    
    # If content has encoding issues, try Windows-1256 (Arabic Windows encoding)
    if ($content -match '[\x00-\x08\x0B-\x0C\x0E-\x1F]' -and $content -notmatch '[\u0600-\u06FF]') {
        Write-Host "  Detected encoding issues, trying Windows-1256..." -ForegroundColor Gray
        $windows1256 = [System.Text.Encoding]::GetEncoding(1256)
        $content = $windows1256.GetString($bytes)
        
        # Convert to UTF-8
        $utf8Bytes = [System.Text.Encoding]::Convert($windows1256, [System.Text.Encoding]::UTF8, $bytes)
        $content = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)
    }
    
    # Add UTF-8 BOM for better compatibility with some tools
    $utf8WithBom = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($outputFile, $content, $utf8WithBom)
    
    # Cleanup
    Remove-Item $tempOutput -Force -ErrorAction SilentlyContinue
    Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
    
    if (Test-Path $outputFile) {
        $fileSize = (Get-Item $outputFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  Export Completed!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  File: $outputFile" -ForegroundColor White
        Write-Host "  Size: $fileSizeMB MB" -ForegroundColor White
        Write-Host ""
        
        # Verify Arabic text
        $verifyContent = Get-Content $outputFile -Raw -Encoding UTF8
        if ($verifyContent -match '[\u0600-\u06FF]') {
            Write-Host "  Arabic text encoding: OK" -ForegroundColor Green
        } else {
            Write-Host "  Warning: Arabic text may have encoding issues" -ForegroundColor Yellow
            Write-Host "  Try opening the file in a UTF-8 compatible editor" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Open the file in a UTF-8 editor (Notepad++, VS Code) to verify" -ForegroundColor White
        Write-Host "  2. Upload to production server" -ForegroundColor White
        Write-Host "  3. Import via phpMyAdmin with UTF-8 encoding" -ForegroundColor White
        Write-Host ""
        
    } else {
        throw "Output file was not created"
    }
    
} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
