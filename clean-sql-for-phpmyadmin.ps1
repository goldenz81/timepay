# Clean SQL file for phpMyAdmin import
# This script removes comments and problematic statements that cause phpMyAdmin parser errors

param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ""
)

if (-not (Test-Path $InputFile)) {
    Write-Host "Error: Input file not found: $InputFile" -ForegroundColor Red
    exit 1
}

if (-not $OutputFile) {
    $OutputFile = $InputFile -replace '\.sql$', '_cleaned.sql'
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "  Cleaning SQL File for phpMyAdmin" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Input:  $InputFile" -ForegroundColor Cyan
Write-Host "Output: $OutputFile" -ForegroundColor Cyan
Write-Host ""

# Read SQL file
Write-Host "Reading SQL file..." -ForegroundColor Yellow
$content = Get-Content $InputFile -Raw -Encoding UTF8

# Remove problematic patterns
Write-Host "Cleaning SQL content..." -ForegroundColor Yellow

# Remove single-line comments (-- comments)
$content = $content -replace '(?m)^\s*--.*$', ''

# Remove multi-line comments (/* ... */)
$content = $content -replace '(?s)/\*.*?\*/', ''

# Remove SET statements that might cause issues
$content = $content -replace '(?m)^\s*SET\s+@[^;]+;', ''

# Remove charset/collation statements that might cause parser issues
$content = $content -replace '(?m)^\s*/\*!\d+\s+SET\s+@OLD_CHARACTER_SET_CLIENT[^;]+;', ''
$content = $content -replace '(?m)^\s*/\*!\d+\s+SET\s+@OLD_CHARACTER_SET_RESULTS[^;]+;', ''
$content = $content -replace '(?m)^\s*/\*!\d+\s+SET\s+@OLD_COLLATION_CONNECTION[^;]+;', ''

# Remove empty lines (more than 2 consecutive)
$content = $content -replace '(?m)^\s*$\r?\n(\s*$\r?\n)+', "`r`n"

# Write cleaned content
Write-Host "Writing cleaned SQL file..." -ForegroundColor Yellow
[System.IO.File]::WriteAllText($OutputFile, $content, [System.Text.Encoding]::UTF8)

$inputSize = (Get-Item $InputFile).Length
$outputSize = (Get-Item $OutputFile).Length
$inputSizeMB = [math]::Round($inputSize / 1MB, 2)
$outputSizeMB = [math]::Round($outputSize / 1MB, 2)

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Cleaning Completed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Input size:  $inputSizeMB MB" -ForegroundColor White
Write-Host "  Output size: $outputSizeMB MB" -ForegroundColor White
Write-Host "  Output file: $OutputFile" -ForegroundColor White
Write-Host ""
Write-Host "This cleaned file should work better with phpMyAdmin import." -ForegroundColor Cyan
Write-Host ""
