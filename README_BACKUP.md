# Database Backup Guide

This guide explains how to create a full backup of the `timepay_unified` database.

## Quick Start

### Option 1: PowerShell Script (Recommended)

1. Open PowerShell in the project directory
2. Run:
   ```powershell
   .\backup_database.ps1
   ```

The script will:
- Create a `backups` folder if it doesn't exist
- Generate a timestamped SQL backup file
- Compress the backup to save space
- Display backup location and restore instructions

### Option 2: Batch Script (Windows)

1. Double-click `backup_database.bat`
2. Or run from Command Prompt:
   ```cmd
   backup_database.bat
   ```

### Option 3: Manual Command

If you have MySQL command-line tools in your PATH:

```bash
mysqldump -u root -pmysql --single-transaction --routines --triggers --events --add-drop-database --add-drop-table --complete-insert --extended-insert --quick --lock-tables=false timepay_unified > backup.sql
```

## Backup Features

- **Full database backup**: Includes all tables, data, routines, triggers, and events
- **Transaction-safe**: Uses `--single-transaction` for consistent backup
- **Compressed**: Automatically compresses backups to save space
- **Timestamped**: Each backup has a unique timestamp in the filename

## Restore Backup

### From SQL file:
```bash
mysql -u root -p timepay_unified < backups\timepay_unified_backup_YYYY-MM-DD_HH-mm-ss.sql
```

### From compressed file:
```bash
# PowerShell
Get-Content backups\timepay_unified_backup_YYYY-MM-DD_HH-mm-ss.sql.gz | gunzip | mysql -u root -p timepay_unified

# Or extract first, then restore
gunzip backups\timepay_unified_backup_YYYY-MM-DD_HH-mm-ss.sql.gz
mysql -u root -p timepay_unified < backups\timepay_unified_backup_YYYY-MM-DD_HH-mm-ss.sql
```

## Database Configuration

The backup scripts use these default settings (from `config/database_config.php`):

- **Host**: localhost
- **Database**: timepay_unified
- **Username**: root
- **Password**: mysql

To change these settings, edit the variables at the top of the script files.

## Backup Location

All backups are saved in the `backups` folder in the project root directory.

## Troubleshooting

### mysqldump not found

If you get an error that mysqldump is not found:

1. **For AMPPS**: The script should automatically find it at `C:\Ampps\mysql\bin\mysqldump.exe`
2. **For XAMPP**: The script should automatically find it at `C:\xampp\mysql\bin\mysqldump.exe`
3. **Manual**: Add MySQL bin directory to your system PATH, or edit the script to point to the correct location

### Permission Errors

- Make sure MySQL service is running
- Verify database credentials are correct
- Check that the backup directory is writable

### Large Database

For very large databases:
- The backup may take several minutes
- Ensure you have enough disk space (at least 2x the database size)
- Consider backing up during off-peak hours

## Automated Backups

To schedule automatic backups:

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, weekly, etc.)
4. Set action to run: `powershell.exe -File "E:\Ampps\www\TimePay\backup_database.ps1"`

### Cron Job (if using WSL or Linux)

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup_database.ps1
```

## Best Practices

1. **Regular Backups**: Create backups daily or weekly depending on data importance
2. **Off-site Storage**: Copy backups to external drive or cloud storage
3. **Test Restores**: Periodically test restoring from backups to ensure they work
4. **Retention Policy**: Keep multiple backups (daily for 7 days, weekly for 4 weeks, monthly for 12 months)
5. **Before Major Changes**: Always backup before:
   - System updates
   - Database schema changes
   - Bulk data imports/exports
   - Configuration changes

