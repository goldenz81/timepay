@echo off
REM Database Backup Script for timepay_unified (Batch version)
REM This script creates a full backup of the timepay_unified database

REM Database configuration
set DB_HOST=localhost
set DB_NAME=timepay_unified
set DB_USER=root
set DB_PASSWORD=mysql

REM Backup directory
set BACKUP_DIR=.\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate backup filename with timestamp
REM Using PowerShell to get timestamp (works on all Windows versions)
for /f "tokens=*" %%I in ('powershell -Command "Get-Date -Format \"yyyy-MM-dd_HH-mm-ss\""') do set timestamp=%%I
set BACKUP_FILE=%BACKUP_DIR%\timepay_unified_backup_%timestamp%.sql

REM Find mysqldump (try common locations)
set MYSQLDUMP=
if exist "E:\Ampps\mysql\bin\mysqldump.exe" set MYSQLDUMP=E:\Ampps\mysql\bin\mysqldump.exe
if exist "C:\Ampps\mysql\bin\mysqldump.exe" set MYSQLDUMP=C:\Ampps\mysql\bin\mysqldump.exe
if exist "C:\xampp\mysql\bin\mysqldump.exe" set MYSQLDUMP=C:\xampp\mysql\bin\mysqldump.exe
if "%MYSQLDUMP%"=="" (
    echo Error: mysqldump.exe not found!
    echo Please ensure MySQL is installed and mysqldump is available.
    echo Expected location: E:\Ampps\mysql\bin\mysqldump.exe
    pause
    exit /b 1
)

echo Using mysqldump: %MYSQLDUMP%
echo Starting backup of database: %DB_NAME%
echo Backup file: %BACKUP_FILE%
echo.

REM Create backup
"%MYSQLDUMP%" --host=%DB_HOST% --user=%DB_USER% --password=%DB_PASSWORD% --single-transaction --routines --triggers --events --add-drop-database --add-drop-table --complete-insert --extended-insert --quick --lock-tables=false %DB_NAME% > "%BACKUP_FILE%"

if exist "%BACKUP_FILE%" (
    echo.
    echo Backup completed successfully!
    echo File: %BACKUP_FILE%
    echo.
    echo To restore this backup, use:
    echo   mysql -u %DB_USER% -p %DB_NAME% ^< "%BACKUP_FILE%"
) else (
    echo.
    echo Error: Backup file was not created!
    pause
    exit /b 1
)

echo.
echo Backup process completed!
pause

