# Check Current Project Status
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Current Project Status" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Check deploy files
Write-Host "Deploy Files:" -ForegroundColor Cyan
$files = @(
    @{Name="deploy_v1.0.31.zip"; Path="deploy_v1.0.31.zip"},
    @{Name="deploy_v1.0.32.zip"; Path="deploy_v1.0.32.zip"},
    @{Name="deploy_v1.0.33.zip"; Path="deploy_v1.0.33.zip"},
    @{Name="deploy_v1.0.34.zip"; Path="deploy_v1.0.34.zip"},
    @{Name="deploy_v1.0.35.zip"; Path="deploy_v1.0.35.zip"},
    @{Name="deploy_v1.0.36.zip"; Path="deploy_v1.0.36.zip"},
    @{Name="deploy_v1.0.37.zip"; Path="deploy_v1.0.37.zip"},
    @{Name="deploy_v1.0.38.zip"; Path="deploy_v1.0.38.zip"},
    @{Name="deploy_v1.0.39.zip"; Path="deploy_v1.0.39.zip"},
    @{Name="deploy_v1.0.40.zip"; Path="deploy_v1.0.40.zip"},
    @{Name="deploy_v1.0.41.zip"; Path="deploy_v1.0.41.zip"},
    @{Name="deploy_v1.0.42.zip"; Path="deploy_v1.0.42.zip"},
    @{Name="deploy_v1.0.43.zip"; Path="deploy_v1.0.43.zip"},
    @{Name="deploy_v1.0.44.zip"; Path="deploy_v1.0.44.zip"},
    @{Name="deploy_v1.0.45.zip"; Path="deploy_v1.0.45.zip"},
    @{Name="deploy_v1.0.46.zip"; Path="deploy_v1.0.46.zip"},
    @{Name="deploy_v1.0.47.zip"; Path="deploy_v1.0.47.zip"},
    @{Name="Production SQL"; Path="backups\timepay_unified_clean_*.sql"},
    @{Name="Updates Deploy"; Path="updates\deploy.zip"}
)

foreach ($file in $files) {
    $exists = Test-Path $file.Path
    $status = if ($exists) { "[OK]" } else { "[X]" }
    $color = if ($exists) { "Green" } else { "Red" }
    Write-Host "  $status $($file.Name)" -ForegroundColor $color
}
Write-Host ""

# Check scripts
Write-Host "Available Scripts:" -ForegroundColor Cyan
$scripts = @(
    @{Name="create-clean-sql-for-phpmyadmin.ps1"; Desc="Export DB with UTF-8 encoding"},
    @{Name="export-db-for-production.ps1"; Desc="Export DB for production"},
    @{Name="fix-database-encoding.ps1"; Desc="Fix database encoding"},
    @{Name="build-and-deploy-v1.0.32.ps1"; Desc="Build and deploy v1.0.32"},
    @{Name="build-and-deploy-v1.0.33.ps1"; Desc="Build and deploy v1.0.33 (Fixed work hours)"},
    @{Name="create-fixed-deploy.ps1"; Desc="Build and deploy v1.0.34 (Work hours fix verified)"},
    @{Name="test-fixed-calculation.php"; Desc="Test work hours calculation"}
)

foreach ($script in $scripts) {
    $exists = Test-Path $script.Name
    $status = if ($exists) { "[OK]" } else { "[X]" }
    $color = if ($exists) { "Green" } else { "Red" }
    Write-Host "  $status $($script.Name) - $($script.Desc)" -ForegroundColor $color
}
Write-Host ""

# Check latest SQL file
Write-Host "Latest SQL Export:" -ForegroundColor Cyan
$sqlFiles = Get-ChildItem "backups\*.sql" | Sort-Object LastWriteTime -Descending
if ($sqlFiles) {
    $latest = $sqlFiles[0]
    Write-Host "  $($latest.Name)" -ForegroundColor White
    Write-Host "  Size: $([math]::Round($latest.Length/1MB,2)) MB" -ForegroundColor Yellow
    Write-Host "  Date: $($latest.LastWriteTime)" -ForegroundColor Yellow
} else {
    Write-Host "  No SQL files found" -ForegroundColor Red
}
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run .\create-clean-sql-for-phpmyadmin.ps1 to export database" -ForegroundColor White
Write-Host "  2. Upload the generated SQL file to production phpMyAdmin" -ForegroundColor White
Write-Host "  3. Deploy v1.0.47 using updates/deploy.zip (ABSOLUTE FINAL clean config files)" -ForegroundColor White
Write-Host ""
