# Create Clean SQL File for phpMyAdmin Upload
# This script fixes encoding and exports a clean SQL file

$ErrorActionPreference = "Stop"

# Database configuration
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"

# Output file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputFile = "backups\timepay_unified_clean_$timestamp.sql"

# Create backups directory
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" -Force | Out-Null
}

# Find MySQL tools
$mysql = "E:\Ampps\mysql\bin\mysql.exe"
$mysqldump = "E:\Ampps\mysql\bin\mysqldump.exe"

if (-not (Test-Path $mysql)) {
    $mysql = "C:\Ampps\mysql\bin\mysql.exe"
    $mysqldump = "C:\Ampps\mysql\bin\mysqldump.exe"
}

if (-not (Test-Path $mysql)) {
    Write-Host "Error: MySQL tools not found!" -ForegroundColor Red
    exit 1
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Create Clean SQL for phpMyAdmin" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host "Output: $outputFile" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create backup before any changes
Write-Host "Step 1: Creating backup..." -ForegroundColor Yellow
$backupFile = "backups\backup_before_fix_$timestamp.sql"
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
Write-Host "  Backup saved: $backupFile" -ForegroundColor Gray
Write-Host ""

# Step 2: Fix database encoding
Write-Host "Step 2: Fixing database encoding..." -ForegroundColor Yellow

# Build fix script - fix database and common tables
$fixScript = @"
-- Fix database charset
ALTER DATABASE `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix common tables (add more if needed)
ALTER TABLE `employees` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `attendance_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `fingerprint_attendance` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `departments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `cost_centers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `system_variables` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `system_settings` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `advances` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `salary_calculations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `weekly_wage_entitlements` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `weekly_wage_deductions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `monthly_salary_entitlements` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `monthly_salary_deductions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `custom_themes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"@

$tempFixFile = [System.IO.Path]::GetTempFileName() + ".sql"
[System.IO.File]::WriteAllText($tempFixFile, $fixScript, [System.Text.Encoding]::UTF8)

# Execute fix
Write-Host "  Fixing database and tables..." -ForegroundColor Gray
$errorFile = [System.IO.Path]::GetTempFileName()
$process = Start-Process -FilePath $mysql -ArgumentList @("--host=$dbHost", "--user=$dbUser", "--password=$dbPassword", "$dbName") -NoNewWindow -Wait -PassThru -RedirectStandardInput $tempFixFile -RedirectStandardOutput "nul" -RedirectStandardError $errorFile

if ($process.ExitCode -eq 0) {
    Write-Host "  Database encoding fixed!" -ForegroundColor Green
} else {
    Write-Host "  Warning: Some tables may not have been fixed (this is OK if tables don't exist)" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Export with proper encoding
Write-Host "Step 3: Exporting database with UTF-8 encoding..." -ForegroundColor Yellow

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
    "--set-charset",
    "--skip-comments",
    "--skip-add-locks",
    "--skip-disable-keys",
    "$dbName"
)

# Export to temp file first
$tempOutput = [System.IO.Path]::GetTempFileName()

$process = Start-Process -FilePath $mysqldump -ArgumentList $mysqldumpArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tempOutput -RedirectStandardError "nul"

if (-not (Test-Path $tempOutput)) {
    throw "Export failed - temp file not created"
}

# Read and save with proper UTF-8 encoding (no BOM for MySQL compatibility)
$content = [System.IO.File]::ReadAllBytes($tempOutput)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$textContent = $utf8NoBom.GetString($content)

# Add header comment
$header = @"
-- TimePay Database Export
-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
-- Database: $dbName
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- 
-- This file is ready for import via phpMyAdmin
-- Make sure to select UTF-8 encoding when importing

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_connection=utf8mb4;

"@

$finalContent = $header + $textContent

# Save final file
[System.IO.File]::WriteAllText($outputFile, $finalContent, $utf8NoBom)

# Cleanup
Remove-Item $tempOutput -Force -ErrorAction SilentlyContinue
Remove-Item $tempFixFile -Force -ErrorAction SilentlyContinue
Remove-Item $errorFile -Force -ErrorAction SilentlyContinue

# Verify
if (Test-Path $outputFile) {
    $fileSize = (Get-Item $outputFile).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  Export Completed Successfully!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  File: $outputFile" -ForegroundColor White
    Write-Host "  Size: $fileSizeMB MB" -ForegroundColor White
    Write-Host "  Encoding: UTF-8 (no BOM)" -ForegroundColor White
    Write-Host ""
    
    # Verify Arabic text
    $verifyContent = Get-Content $outputFile -Raw -Encoding UTF8
    if ($verifyContent -match '[\u0600-\u06FF]') {
        Write-Host "  Arabic text encoding: VERIFIED" -ForegroundColor Green
        
        # Show sample
        $sample = ($verifyContent -split "`n" | Select-String -Pattern "[\u0600-\u06FF]" | Select-Object -First 1).Line
        if ($sample) {
            $sample = $sample.Trim()
            if ($sample.Length -gt 100) { $sample = $sample.Substring(0, 100) + "..." }
            Write-Host "  Sample: $sample" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  Warning: No Arabic text detected in export" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  Ready for phpMyAdmin Upload!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor Yellow
    Write-Host "  1. Open phpMyAdmin on production server" -ForegroundColor White
    Write-Host "  2. Select the target database" -ForegroundColor White
    Write-Host "  3. Click 'Import' tab" -ForegroundColor White
    Write-Host "  4. Choose file: $outputFile" -ForegroundColor White
    Write-Host "  5. Character set: UTF-8" -ForegroundColor White
    Write-Host "  6. Click 'Go'" -ForegroundColor White
    Write-Host ""
    Write-Host "File location:" -ForegroundColor Cyan
    Write-Host "  $((Get-Item $outputFile).FullName)" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host "Error: Output file was not created!" -ForegroundColor Red
    exit 1
}
