# Fix Database Encoding - Convert to UTF-8
# This script fixes encoding issues in the database before export

$ErrorActionPreference = "Stop"

# Database configuration
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"

# Find mysql
$mysql = "E:\Ampps\mysql\bin\mysql.exe"
if (-not (Test-Path $mysql)) {
    $mysql = "C:\Ampps\mysql\bin\mysql.exe"
}
if (-not (Test-Path $mysql)) {
    Write-Host "Error: mysql.exe not found!" -ForegroundColor Red
    exit 1
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Fix Database Encoding" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host ""

# Create SQL script to fix encoding
$fixScript = @"
-- Set database charset to utf8mb4
ALTER DATABASE `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Get all tables
SET @tables = NULL;
SELECT GROUP_CONCAT(table_name) INTO @tables
FROM information_schema.tables
WHERE table_schema = '$dbName';

-- Fix each table
SET @sql = CONCAT('ALTER TABLE ', @tables, ' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
"@

$tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
[System.IO.File]::WriteAllText($tempSqlFile, $fixScript, [System.Text.Encoding]::UTF8)

Write-Host "Creating backup before fixing encoding..." -ForegroundColor Yellow
$backupFile = "backups\backup_before_encoding_fix_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').sql"

# Backup first
$mysqldump = $mysql -replace "mysql.exe", "mysqldump.exe"
if (Test-Path $mysqldump) {
    $backupArgs = @(
        "--host=$dbHost",
        "--user=$dbUser",
        "--password=$dbPassword",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
        "$dbName"
    )
    
    $process = Start-Process -FilePath $mysqldump -ArgumentList $backupArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $backupFile -RedirectStandardError "nul"
    Write-Host "  Backup created: $backupFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Fixing database encoding..." -ForegroundColor Yellow
Write-Host "  WARNING: This will modify your database!" -ForegroundColor Red
Write-Host "  Press Ctrl+C to cancel, or wait 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Execute fix script
$mysqlArgs = @(
    "--host=$dbHost",
    "--user=$dbUser",
    "--password=$dbPassword",
    "$dbName"
)

try {
    $process = Start-Process -FilePath $mysql -ArgumentList $mysqlArgs -NoNewWindow -Wait -PassThru -RedirectStandardInput $tempSqlFile -RedirectStandardOutput "nul" -RedirectStandardError "nul"
    
    if ($process.ExitCode -eq 0) {
        Write-Host "  Database encoding fixed!" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Process exited with code $($process.ExitCode)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Now you can export the database with correct encoding." -ForegroundColor Cyan
    Write-Host "Run: .\export-db-utf8mb4-final.ps1" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
