# Final Database Export with Proper UTF-8 Encoding
# Ensures Arabic text is exported correctly

$ErrorActionPreference = "Stop"

# Database configuration
$dbHost = "localhost"
$dbName = "timepay_unified"
$dbUser = "root"
$dbPassword = "mysql"

# Output file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputFile = "backups\timepay_unified_production_utf8_$timestamp.sql"

# Create backups directory
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" -Force | Out-Null
}

# Find mysqldump
$mysqldump = "E:\Ampps\mysql\bin\mysqldump.exe"
if (-not (Test-Path $mysqldump)) {
    $mysqldump = "C:\Ampps\mysql\bin\mysqldump.exe"
}
if (-not (Test-Path $mysqldump)) {
    Write-Host "Error: mysqldump.exe not found!" -ForegroundColor Red
    exit 1
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Database Export - UTF-8 Final" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host "Output: $outputFile" -ForegroundColor Cyan
Write-Host ""

Write-Host "Exporting with UTF-8 encoding..." -ForegroundColor Yellow

# Build mysqldump command with proper encoding
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

try {
    # Create temp file
    $tempFile = [System.IO.Path]::GetTempFileName()
    
    # Run mysqldump
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $mysqldump
    $processInfo.Arguments = ($mysqldumpArgs -join " ")
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $processInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    $outputBuilder = New-Object System.Text.StringBuilder
    $errorBuilder = New-Object System.Text.StringBuilder
    
    $outputEvent = Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action {
        if ($EventArgs.Data) {
            [void]$Event.MessageData.AppendLine($EventArgs.Data)
        }
    } -MessageData $outputBuilder
    
    $errorEvent = Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action {
        if ($EventArgs.Data -and $EventArgs.Data -notmatch "Warning.*password") {
            [void]$Event.MessageData.AppendLine($EventArgs.Data)
        }
    } -MessageData $errorBuilder
    
    $process.Start() | Out-Null
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    $process.WaitForExit()
    
    # Get output
    $output = $outputBuilder.ToString()
    
    # Save with UTF-8 encoding (no BOM for MySQL compatibility)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($outputFile, $output, $utf8NoBom)
    
    # Cleanup events
    Unregister-Event -SourceIdentifier $outputEvent.Name
    Unregister-Event -SourceIdentifier $errorEvent.Name
    
    if (Test-Path $outputFile) {
        $fileSize = (Get-Item $outputFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  Export Completed Successfully!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  File: $outputFile" -ForegroundColor White
        Write-Host "  Size: $fileSizeMB MB" -ForegroundColor White
        Write-Host "  Encoding: UTF-8 (without BOM)" -ForegroundColor White
        Write-Host ""
        
        # Verify encoding
        $verifyBytes = [System.IO.File]::ReadAllBytes($outputFile)
        $verifyContent = [System.Text.Encoding]::UTF8.GetString($verifyBytes)
        
        if ($verifyContent -match '[\u0600-\u06FF]') {
            Write-Host "  Arabic text verification: PASSED" -ForegroundColor Green
        } else {
            Write-Host "  Warning: No Arabic characters detected" -ForegroundColor Yellow
            Write-Host "  This may indicate the database itself has encoding issues" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Verify the file in a UTF-8 editor (VS Code, Notepad++)" -ForegroundColor White
        Write-Host "  2. Upload to production server" -ForegroundColor White
        Write-Host "  3. Import with: mysql -u user -p database < file.sql" -ForegroundColor White
        Write-Host "     Or via phpMyAdmin with UTF-8 encoding selected" -ForegroundColor White
        Write-Host ""
        
    } else {
        throw "Output file was not created"
    }
    
} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}
