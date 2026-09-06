Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('deploy.zip')

Write-Host "=== Deploy.zip Contents ===" -ForegroundColor Green
Write-Host "Total files: $($zip.Entries.Count)" -ForegroundColor Cyan

$folders = $zip.Entries | ForEach-Object { 
    $parts = $_.FullName.Split('/')
    if ($parts.Length -gt 1) { $parts[0] } else { 'root' }
} | Sort-Object -Unique

Write-Host "`nFolders:" -ForegroundColor Yellow
foreach ($folder in $folders) {
    $count = ($zip.Entries | Where-Object { $_.FullName.StartsWith("$folder/") }).Count
    $size = ($zip.Entries | Where-Object { $_.FullName.StartsWith("$folder/") } | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  $folder : $count files, $([math]::Round($size, 2)) MB" -ForegroundColor White
}

Write-Host "`nKey files:" -ForegroundColor Yellow
$keyFiles = $zip.Entries | Where-Object { 
    $_.FullName -like '*.js' -or 
    $_.FullName -like '*.css' -or 
    $_.FullName -like '*.php' -or
    $_.FullName -like '*.json'
} | Select-Object -First 20

foreach ($file in $keyFiles) {
    $sizeKB = [math]::Round($file.Length / 1KB, 2)
    Write-Host "  $($file.FullName) - $sizeKB KB" -ForegroundColor Gray
}

$zip.Dispose()

