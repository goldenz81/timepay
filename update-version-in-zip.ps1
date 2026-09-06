# Update version.json in deploy.zip with Arabic text
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "deploy.zip"
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Update)

$entry = $zip.Entries | Where-Object { $_.Name -eq "version.json" }

if ($entry) {
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    $content = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    
    # Parse JSON
    $json = $content | ConvertFrom-Json
    
    # Update changelog summary
    $json.changelog[0].summary = "إزالة السلفة من المستحقات - إضافة ساعات العمل في مودال تفاصيل الأجر الأسبوعي والشهري"
    
    # Convert back to JSON
    $newContent = $json | ConvertTo-Json -Depth 10
    
    # Write back
    $entry.Delete()
    $newEntry = $zip.CreateEntry("version.json")
    $newStream = $newEntry.Open()
    $writer = New-Object System.IO.StreamWriter($newStream, [System.Text.UTF8Encoding]::new($false))
    $writer.Write($newContent)
    $writer.Close()
    $newStream.Close()
    
    Write-Host "Updated version.json in deploy.zip" -ForegroundColor Green
} else {
    Write-Host "version.json not found in deploy.zip" -ForegroundColor Red
}

$zip.Dispose()

