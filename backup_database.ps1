# Database Backup Script for timepay_unified
# This script creates a full backup of the timepay_unified database

# Database configuration
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"

# Backup directory (create if it doesn't exist)
$backupDir = ".\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backup directory: $backupDir" -ForegroundColor Green
}

# Generate backup filename with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "$backupDir\timepay_unified_backup_$timestamp.sql"
$backupFileZip = "$backupFile.gz"

# Find mysqldump (common locations for AMPPS/MySQL)
$mysqldumpPaths = @(
    "E:\Ampps\mysql\bin\mysqldump.exe",  # Your specific location
    "C:\Ampps\mysql\bin\mysqldump.exe",
    "C:\xampp\mysql\bin\mysqldump.exe",
    "C:\wamp\bin\mysql\mysql*\bin\mysqldump.exe",
    "C:\Program Files\MySQL\MySQL Server *\bin\mysqldump.exe",
    "mysqldump.exe"  # If in PATH
)

$mysqldump = $null
foreach ($path in $mysqldumpPaths) {
    if ($path -like "*") {
        # Handle wildcards
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

# Check if mysqldump was found
if (-not $mysqldump) {
    Write-Host "Error: mysqldump.exe not found!" -ForegroundColor Red
    Write-Host "Please install MySQL or ensure mysqldump is in your PATH." -ForegroundColor Yellow
    Write-Host "Common locations:" -ForegroundColor Yellow
    Write-Host "  - C:\Ampps\mysql\bin\mysqldump.exe" -ForegroundColor Yellow
    Write-Host "  - C:\xampp\mysql\bin\mysqldump.exe" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using mysqldump: $mysqldump" -ForegroundColor Cyan
Write-Host "Starting backup of database: $dbName" -ForegroundColor Cyan
Write-Host "Backup file: $backupFile" -ForegroundColor Cyan
Write-Host ""

# Create backup using mysqldump
try {
    # Build mysqldump command
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
        "$dbName"
    )
    
    # Execute mysqldump and save to file
    & $mysqldump $mysqldumpArgs | Out-File -FilePath $backupFile -Encoding UTF8
    
    # Check if backup was successful
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host "✓ Backup completed successfully!" -ForegroundColor Green
        Write-Host "  File: $backupFile" -ForegroundColor Green
        Write-Host "  Size: $fileSizeMB MB" -ForegroundColor Green
        Write-Host ""
        
        # Optionally compress the backup
        Write-Host "Compressing backup..." -ForegroundColor Cyan
        try {
            $content = Get-Content $backupFile -Raw -Encoding UTF8
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
            $compressed = [System.IO.Compression.GZipStream]::new(
                [System.IO.File]::Create($backupFileZip),
                [System.IO.Compression.CompressionLevel]::Optimal
            )
            $compressed.Write($bytes, 0, $bytes.Length)
            $compressed.Close()
            
            if (Test-Path $backupFileZip) {
                $zipSize = (Get-Item $backupFileZip).Length
                $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
                $compressionRatio = [math]::Round((1 - ($zipSize / $fileSize)) * 100, 1)
                
                Write-Host "✓ Compression completed!" -ForegroundColor Green
                Write-Host "  Compressed file: $backupFileZip" -ForegroundColor Green
                Write-Host "  Compressed size: $zipSizeMB MB" -ForegroundColor Green
                Write-Host "  Compression ratio: $compressionRatio%" -ForegroundColor Green
                Write-Host ""
                
                # Remove uncompressed file to save space
                Remove-Item $backupFile
                Write-Host "Removed uncompressed file to save space." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Warning: Could not compress backup: $_" -ForegroundColor Yellow
            Write-Host "Uncompressed backup is still available at: $backupFile" -ForegroundColor Yellow
        }
        
        Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To restore this backup, use:" -ForegroundColor Yellow
        Write-Host "  mysql -u $dbUser -p $dbName < `"$backupFile`"" -ForegroundColor Yellow
        if (Test-Path $backupFileZip) {
            Write-Host ""
            Write-Host "Or for compressed backup:" -ForegroundColor Yellow
            Write-Host "  gunzip < `"$backupFileZip`" | mysql -u $dbUser -p $dbName" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "Error: Backup file was not created!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Error during backup: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Backup process completed!" -ForegroundColor Green

