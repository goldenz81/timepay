# Set your project path
$projectPath = "E:\Ampps\www\TimePay"

# Update PATH to include Node.js
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

function Start-Server {
    Write-Host "Starting server..."
    # Update PATH in the new process
    $pathUpdate = '$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")'
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; $pathUpdate; npm start"
}

function Stop-Server {
    Write-Host "Stopping server..."
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { $_.Kill() }
}

function Restart-Server {
    Stop-Server
    Start-Sleep -Seconds 2
    Start-Server
}

function Show-Menu {
    Clear-Host
    Write-Host "==============================="
    Write-Host " TimePay Server Manager"
    Write-Host "==============================="
    Write-Host " 1. Start Server"
    Write-Host " 2. Stop Server"
    Write-Host " 3. Restart Server"
    Write-Host " 4. Exit"
    Write-Host "==============================="
}

do {
    Show-Menu
    $choice = Read-Host "Select an option (1-4)"

    switch ($choice) {
        "1" { Start-Server }
        "2" { Stop-Server }
        "3" { Restart-Server }
        "4" { Write-Host "Exiting..."; break }
        default { Write-Host "Invalid choice. Try again." }
    }

    if ($choice -ne "4") {
        Write-Host "`nPress Enter to return to menu..."
        Read-Host
    }
} while ($true)
