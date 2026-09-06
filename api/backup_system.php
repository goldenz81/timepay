<?php
// إخفاء تحذيرات PHP
error_reporting(0);
ini_set('display_errors', 0);

// CORS headers
header('Content-Type: application/json; charset=utf-8');
// إعداد CORS headers - يعمل في التطوير والإنتاج
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'https://timepay.borgelarabpress.com',
    'http://timepay.borgelarabpress.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    $currentOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    if (strpos($currentOrigin, 'timepay.borgelarabpress.com') !== false || strpos($currentOrigin, 'localhost') !== false) {
        header("Access-Control-Allow-Origin: $currentOrigin");
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}



// Include database configuration and models
$configPath = file_exists('../config/database_config.php') ? '../config/database_config.php' : 'config/database_config.php';
$modelPath = file_exists('../models/Database.php') ? '../models/Database.php' : 'models/Database.php';

require_once $configPath;
require_once $modelPath;

// CLI support and background execution helpers
if (php_sapi_name() === 'cli') {
    $args = $argv ?? [];
    $params = [];
    foreach ($args as $arg) {
        if (strpos($arg, '--') === 0) {
            $pair = explode('=', substr($arg, 2), 2);
            $k = $pair[0] ?? '';
            $v = $pair[1] ?? '';
            if ($k !== '') { $params[$k] = $v; }
        }
    }
    if (($params['action'] ?? '') === 'restore_cli') {
        $backupName = $params['backup_name'] ?? '';
        $restoreDb = (($params['restore_database'] ?? '0') === '1');
        $backupSystemCli = new BackupSystem();
        $result = $backupSystemCli->restoreBackup($backupName, $restoreDb);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit(0);
    } elseif (($params['action'] ?? '') === 'create_cli') {
        $backupSystemCli = new BackupSystem();
        $result = $backupSystemCli->createBackup();
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit(0);
    }
}

function spawn_background_restore($backupName, $restoreDatabase) {
    $script = realpath(__FILE__);
    $restoreFlag = $restoreDatabase ? '1' : '0';
    if (stripos(PHP_OS, 'WIN') === 0) {
        // Use php from PATH; AMMPS usually exposes php
        $cmd = 'start /B "" php "' . $script . '" --action=restore_cli --backup_name=' . escapeshellarg($backupName) . ' --restore_database=' . $restoreFlag;
        @pclose(@popen($cmd, 'r'));
    } else {
        $cmd = 'php ' . escapeshellarg($script) . ' --action=restore_cli --backup_name=' . escapeshellarg($backupName) . ' --restore_database=' . $restoreFlag . ' > /dev/null 2>&1 &';
        @exec($cmd);
    }
}

function spawn_background_create() {
    $script = realpath(__FILE__);
    if (stripos(PHP_OS, 'WIN') === 0) {
        $cmd = 'start /B "" php "' . $script . '" --action=create_cli';
        @pclose(@popen($cmd, 'r'));
    } else {
        $cmd = 'php ' . escapeshellarg($script) . ' --action=create_cli > /dev/null 2>&1 &';
        @exec($cmd);
    }
}

class BackupSystem {
    private $backupDir;
    private $db;
    private $createdBackups = [];
    private $runBackupRoot = '';
    private $backedUpTargets = [];
    
    public function __construct() {
        // Store backups OUTSIDE the project root to avoid dev-server watch loops
        // تحديد مسار النسخ الاحتياطي بناءً على البيئة (Development vs Production)
        $rootDir = dirname(dirname(__FILE__)); // الانتقال من api/ إلى جذر المشروع
        
        // على Windows (Development): E:\Ampps\www\TimePay_backups\
        // على Linux (Production): /home/username/public_html/TimePay_backups/ أو خارج المجلد
        if (stripos(PHP_OS, 'WIN') === 0) {
            // Windows: خارج مجلد المشروع
            $this->backupDir = dirname($rootDir) . DIRECTORY_SEPARATOR . 'TimePay_backups' . DIRECTORY_SEPARATOR;
        } else {
            // Linux/Unix: داخل مجلد المشروع في مجلد backups (لضمان الصلاحيات)
            // يمكن تغييره ليكون خارج المجلد إذا كانت الصلاحيات تسمح
            $this->backupDir = $rootDir . DIRECTORY_SEPARATOR . 'backups' . DIRECTORY_SEPARATOR;
        }
        
        $this->db = Database::getConnection();
        
        // Create backup directory if it doesn't exist
        if (!file_exists($this->backupDir)) {
            @mkdir($this->backupDir, 0755, true);
            // إضافة ملف .htaccess لحماية المجلد على Apache (Linux فقط)
            if (stripos(PHP_OS, 'WIN') !== 0) {
                $htaccessFile = $this->backupDir . '.htaccess';
                if (!file_exists($htaccessFile)) {
                    @file_put_contents($htaccessFile, "deny from all\n");
                }
            }
        }
        
        // Migrate old backups from legacy in-project dirs to the new external dir if needed
        $this->migrateOldBackups();

        // Cleanup any stale temporary restore folders left from interrupted runs
        $this->cleanupStaleTempRestores();
    }
    
    public function createBackup() {
        try {
            $timestamp = date('Y-m-d_H-i-s');
            $backupName = "TimePay_Backup_{$timestamp}";
            $zipPath = $this->backupDir . $backupName . '.zip';
            
            // Generate fresh database dumps
            $this->generateDatabaseDumps();
            
            // Files and directories to backup (with original structure)
            // ملاحظة مهمة: بعض الملفات/المجلدات قد لا تكون موجودة في Production
            // - src/ موجود فقط في Development (المصدر الأصلي)
            // - build/ موجود في Production (الملفات المترجمة)
            // سيتم التحقق من وجود كل ملف/مجلد قبل النسخ تلقائياً
            $rootDir = dirname(dirname(__FILE__)); // جذر المشروع
            
            $itemsToBackup = [
                // Core application directories
                // ملاحظة: src/ موجود فقط في Development، سيتم تخطيه تلقائياً في Production
                'src/' => 'src/',
                'api/' => 'api/',
                'config/' => 'config/',
                'models/' => 'models/',
                'includes/' => 'includes/',
                'updates/' => 'updates/', // مهم: يحتوي على changelog.json و deploy.zip
                'public/' => 'public/', // ملاحظة: محتويات public/ موجودة أيضاً في build/، لكن public/ قد يحتوي على ملفات إضافية مثل .htaccess
                'data/' => 'data/',
                'uploads/' => 'uploads/',
                'build/' => 'build/',
                
                // Configuration files (مطابق لما في deploy.zip)
                'package.json' => 'package.json',
                'package-lock.json' => 'package-lock.json',
                'tailwind.config.js' => 'tailwind.config.js',
                'postcss.config.js' => 'postcss.config.js',
                'index.php' => 'index.php',
                'index.php_' => 'index.php_', // ملف index.php الأصلي
                'favicon.png' => 'favicon.png',
                'favicon.ico' => 'favicon.ico',
                'login-pic.png' => 'login-pic.png',
                'sw.js' => 'sw.js', // Service Worker
                'manifest.json' => 'manifest.json',
                'site.webmanifest' => 'site.webmanifest',
                'index.html' => 'index.html', // من build/index.html
                
                // Database files (التحقق من الوجود سيتم لاحقاً)
                'database_setup.sql' => 'database_setup.sql',
                'timepay_unified.sql' => 'timepay_unified.sql',
                'database_backup.sql' => 'database_backup.sql',
                
                // Additional important files (التحقق من الوجود سيتم لاحقاً)
                'salary_formulas_viewer.html' => 'salary_formulas_viewer.html',
                'test_calculation.php' => 'test_calculation.php',
                'Timepay-server.ps1' => 'Timepay-server.ps1',
                'BACKUP_INFO.md' => 'BACKUP_INFO.md'
            ];
            
            $backupInfo = [
                'name' => $backupName,
                'date' => date('Y-m-d H:i:s'),
                'version' => $this->getSystemVersion(),
                'files' => [],
                'directories' => [],
                'size' => 0,
                'description' => 'نسخة احتياطية شاملة من نظام TimePay تشمل جميع الملفات المهمة وقاعدة البيانات'
            ];
            
            // Create ZIP file directly
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
                throw new Exception('فشل في إنشاء ملف ZIP');
            }
            
            // Add files and directories to ZIP with original structure
            // ملاحظة: يتم التحقق من وجود كل ملف/مجلد قبل النسخ
            // بعض الملفات/المجلدات قد لا تكون موجودة في Production (مثل src/)
            // وهذا طبيعي ولا يسبب مشاكل
            foreach ($itemsToBackup as $zipPath => $sourcePath) {
                $fullSourcePath = '../' . $sourcePath;
                
                // معالجة خاصة لـ index.html: البحث في build/ أولاً
                if ($sourcePath === 'index.html') {
                    $buildIndexPath = '../build/index.html';
                    if (file_exists($buildIndexPath)) {
                        $zip->addFile($buildIndexPath, $zipPath);
                        $backupInfo['files'][] = $zipPath;
                        continue;
                    } elseif (file_exists($fullSourcePath)) {
                        $zip->addFile($fullSourcePath, $zipPath);
                        $backupInfo['files'][] = $zipPath;
                        continue;
                    } else {
                        error_log("Backup: Skipping missing item: $sourcePath (not found in build/ or root)");
                        continue;
                    }
                }
                
                // التحقق من وجود الملف/المجلد قبل محاولة نسخه
                if (file_exists($fullSourcePath)) {
                    if (is_dir($fullSourcePath)) {
                        $this->addDirectoryToZip($zip, $fullSourcePath, $zipPath . '/');
                        $backupInfo['directories'][] = $zipPath;
                    } else {
                        $zip->addFile($fullSourcePath, $zipPath);
                        $backupInfo['files'][] = $zipPath;
                    }
                } else {
                    // تسجيل الملفات/المجلدات غير الموجودة (للتشخيص فقط، لا يسبب خطأ)
                    // ملاحظة: src/ غير موجود في Production وهذا طبيعي
                    error_log("Backup: Skipping missing item: $sourcePath (not found in " . (stripos(PHP_OS, 'WIN') === 0 ? 'Development' : 'Production') . ")");
                }
            }
            
            // Add backup info to ZIP
            $zip->addFromString('backup_info.json', json_encode($backupInfo, JSON_UNESCAPED_UNICODE));
            
            $zip->close();
            
            $backupInfo['size'] = file_exists($zipPath) ? filesize($zipPath) : 0;
            
            // Update version info with backup date
            $this->updateVersionInfo($backupInfo['date']);
            
            return [
                'success' => true,
                'message' => 'تم إنشاء النسخة الاحتياطية بنجاح',
                'backup_name' => $backupName . '.zip',
                'backup_path' => $zipPath,
                'size' => $this->formatBytes($backupInfo['size']),
                'date' => $backupInfo['date']
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function generateDatabaseDumps() {
        try {
            $configPath = file_exists('../config/database_config.php') ? '../config/database_config.php' : 'config/database_config.php';
            $config = require $configPath;
            
            // Generate database_backup.sql (current database structure + data)
            $this->generateFullDatabaseDump($config);
            
            // Update database_setup.sql with current structure
            $this->updateDatabaseSetupFile($config);
            
        } catch (Exception $e) {
            // Log error but don't stop backup process
            error_log("Database dump generation failed: " . $e->getMessage());
        }
    }
    
    private function generateFullDatabaseDump($config) {
        $dumpFile = '../database_backup.sql';
        
        // Get all tables
        $pdo = $this->db;
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        
        $dump = "-- TimePay Database Backup\n";
        $dump .= "-- Generated on: " . date('Y-m-d H:i:s') . "\n";
        $dump .= "-- Database: {$config['dbname']}\n\n";
        $dump .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
        $dump .= "SET AUTOCOMMIT = 0;\n";
        $dump .= "START TRANSACTION;\n";
        $dump .= "SET time_zone = \"+00:00\";\n\n";
        
        foreach ($tables as $table) {
            // Get table structure
            $createTable = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
            $dump .= "-- Table structure for table `$table`\n";
            $dump .= "DROP TABLE IF EXISTS `$table`;\n";
            $dump .= $createTable['Create Table'] . ";\n\n";
            
            // Get table data
            $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $dump .= "-- Data for table `$table`\n";
                $columns = array_keys($rows[0]);
                $columnList = '`' . implode('`, `', $columns) . '`';
                
                foreach ($rows as $row) {
                    $values = array_map(function($value) use ($pdo) {
                        return $value === null ? 'NULL' : $pdo->quote($value);
                    }, $row);
                    $dump .= "INSERT INTO `$table` ($columnList) VALUES (" . implode(', ', $values) . ");\n";
                }
                $dump .= "\n";
            }
        }
        
        $dump .= "COMMIT;\n";
        
        file_put_contents($dumpFile, $dump);
    }
    
    private function updateDatabaseSetupFile($config) {
        $setupFile = '../database_setup.sql';
        $pdo = $this->db;
        
        // Get all tables
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        
        $setup = "-- TimePay Database Setup\n";
        $setup .= "-- Updated on: " . date('Y-m-d H:i:s') . "\n";
        $setup .= "-- Database: {$config['dbname']}\n\n";
        $setup .= "CREATE DATABASE IF NOT EXISTS `{$config['dbname']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n";
        $setup .= "USE `{$config['dbname']}`;\n\n";
        $setup .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
        $setup .= "SET AUTOCOMMIT = 0;\n";
        $setup .= "START TRANSACTION;\n";
        $setup .= "SET time_zone = \"+00:00\";\n\n";
        
        foreach ($tables as $table) {
            // Get table structure only (no data)
            $createTable = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
            $setup .= "-- Table structure for table `$table`\n";
            $setup .= "DROP TABLE IF EXISTS `$table`;\n";
            $setup .= $createTable['Create Table'] . ";\n\n";
        }
        
        $setup .= "COMMIT;\n";
        
        file_put_contents($setupFile, $setup);
    }
    
    private function restoreDatabase($sqlFile) {
        try {
            $config = require '../config/database_config.php';
            $pdo = $this->db;
            
            // Read SQL file
            $sql = file_get_contents($sqlFile);
            
            // Split into individual statements
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            
            // Execute each statement
            foreach ($statements as $statement) {
                if (!empty($statement) && !preg_match('/^--/', $statement)) {
                    $pdo->exec($statement);
                }
            }
            
        } catch (Exception $e) {
            throw new Exception("فشل في استعادة قاعدة البيانات: " . $e->getMessage());
        }
    }
    
    public function getBackupList() {
        try {
            $backups = [];
            $files = glob($this->backupDir . '*.zip');
            
            foreach ($files as $file) {
                $filename = basename($file);
                $backupInfo = $this->getBackupInfo($filename);
                
                $backups[] = [
                    'name' => $filename,
                    'date' => $backupInfo['date'] ?? date('Y-m-d H:i:s', filemtime($file)),
                    'size' => $this->formatBytes(filesize($file)),
                    'path' => $file
                ];
            }
            
            // Sort by date (newest first)
            usort($backups, function($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });
            
            return [
                'success' => true,
                'backups' => $backups
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function restoreBackup($backupName, $restoreDatabase = false) {
        try {
            // Allow long-running restore without client timeout
            @ignore_user_abort(true);
            @set_time_limit(0);
            @ini_set('max_execution_time', '0');
            @ini_set('memory_limit', '1024M');

            $backupPath = $this->backupDir . $backupName;
            
            if (!file_exists($backupPath)) {
                throw new Exception('النسخة الاحتياطية غير موجودة');
            }
            
            // Extract ZIP file
            $tempDir = $this->backupDir . 'temp_restore_' . time();
            if (!mkdir($tempDir, 0755, true)) {
                throw new Exception('فشل في إنشاء مجلد الاستعادة المؤقت');
            }
            
            $this->extractZip($backupPath, $tempDir);
            
            // Determine if request is via web; if so, skip restoring the running api/ to avoid mid-request crash
            $isWeb = (php_sapi_name() !== 'cli');
            $skipApi = $isWeb;

            // Restore files (optionally skipping api/)
            // Reset per-run backups registry and set a safe backup root outside src/api
            $this->createdBackups = [];
            $this->backedUpTargets = [];
            $this->runBackupRoot = rtrim($this->backupDir, '/').'/pre_restore_' . time() . '/';
            @mkdir($this->runBackupRoot, 0755, true);
            $this->restoreFiles($tempDir, $skipApi);
            
            // Restore database if requested (safe)
            if ($restoreDatabase && file_exists($tempDir . '/database_backup.sql')) {
                try {
                    $this->restoreDatabase($tempDir . '/database_backup.sql');
                } catch (Exception $dbEx) {
                    // Do not fail the whole restore on DB errors; append message
                    $message = 'تم استعادة الملفات مع تحذير في استرجاع قاعدة البيانات: ' . $dbEx->getMessage();
                }
            }
            
            // Clean up extracted temp directory
            $this->removeDirectory($tempDir);
            
            // Clean up per-run backup mirror directory
            if (!empty($this->runBackupRoot) && is_dir($this->runBackupRoot)) {
                $this->removeDirectory($this->runBackupRoot);
            }
            $this->createdBackups = [];
            $this->backedUpTargets = [];
            $this->runBackupRoot = '';
            
            $message = 'تم استعادة النسخة الاحتياطية بنجاح';
            if ($skipApi) {
                $message .= ' (تم تخطي مجلد api للحفاظ على استقرار الخادم)';
            }
            if ($restoreDatabase) {
                $message .= ' (بما في ذلك قاعدة البيانات)';
            }
            
            return [
                'success' => true,
                'message' => $message
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function deleteBackup($backupName) {
        try {
            // Debug: Log the backup name (temporarily enabled for debugging)
            error_log("Delete backup - Name: " . $backupName);
            error_log("Delete backup - Dir: " . $this->backupDir);
            
            $backupPath = $this->backupDir . $backupName;
            error_log("Delete backup - Full path: " . $backupPath);
            
            if (!file_exists($backupPath)) {
                error_log("Delete backup - File not found: " . $backupPath);
                throw new Exception('النسخة الاحتياطية غير موجودة');
            }
            
            if (unlink($backupPath)) {
                error_log("Delete backup - Successfully deleted: " . $backupPath);
                return [
                    'success' => true,
                    'message' => 'تم حذف النسخة الاحتياطية بنجاح'
                ];
            } else {
                error_log("Delete backup - Failed to delete: " . $backupPath);
                throw new Exception('فشل في حذف النسخة الاحتياطية');
            }
            
        } catch (Exception $e) {
            error_log("Delete backup - Exception: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function copyDirectory($src, $dst) {
        if (!is_dir($src)) {
            return false;
        }
        
        // Create destination directory if it doesn't exist
        if (!is_dir($dst) && !mkdir($dst, 0755, true)) {
            return false;
        }
        
        $dir = opendir($src);
        if (!$dir) {
            return false;
        }
        
        while (($file = readdir($dir)) !== false) {
            if ($file != '.' && $file != '..') {
                $srcFile = $src . '/' . $file;
                $dstFile = $dst . '/' . $file;
                
                if (is_dir($srcFile)) {
                    $this->copyDirectory($srcFile, $dstFile);
                } else {
                    copy($srcFile, $dstFile);
                }
            }
        }
        closedir($dir);
        return true;
    }

    // Compare two files quickly (size) and accurately (md5) when needed
    private function filesAreDifferent($sourceFile, $destFile) {
        if (!file_exists($destFile)) {
            return true;
        }
        $srcSize = @filesize($sourceFile);
        $dstSize = @filesize($destFile);
        if ($srcSize !== $dstSize) {
            return true;
        }
        // Same size – verify content with md5 to avoid unnecessary copies
        $srcHash = @md5_file($sourceFile);
        $dstHash = @md5_file($destFile);
        return $srcHash !== $dstHash;
    }

    // Differential copy: only copy added/changed files, keep existing identical files
    private function copyDirectoryDifferential($src, $dst) {
        if (!is_dir($src)) {
            return false;
        }
        if (!is_dir($dst) && !mkdir($dst, 0755, true)) {
            return false;
        }

        $dir = opendir($src);
        if (!$dir) {
            return false;
        }

        while (($entry = readdir($dir)) !== false) {
            if ($entry === '.' || $entry === '..') { continue; }
            $srcPath = $src . '/' . $entry;
            $dstPath = $dst . '/' . $entry;

            if (is_dir($srcPath)) {
                // Recurse into sub-directories
                $this->copyDirectoryDifferential($srcPath, $dstPath);
            } else {
                if ($this->filesAreDifferent($srcPath, $dstPath)) {
                    @copy($srcPath, $dstPath);
                }
            }
        }

        closedir($dir);
        return true;
    }
    
    private function removeDirectory($dir) {
        if (!is_dir($dir)) {
            return false;
        }
        
        $files = array_diff(scandir($dir), array('.', '..'));
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->removeDirectory($path) : unlink($path);
        }
        return rmdir($dir);
    }

    // Remove any leftover temp restore directories in the backups folder
    private function cleanupStaleTempRestores() {
        try {
            $patterns = [
                $this->backupDir . 'temp_restore_*',
                $this->backupDir . 'temp_restore_api_*'
            ];
            foreach ($patterns as $pattern) {
                foreach (glob($pattern) as $staleDir) {
                    if (is_dir($staleDir)) {
                        $this->removeDirectory($staleDir);
                    } elseif (file_exists($staleDir)) {
                        @unlink($staleDir);
                    }
                }
            }
        } catch (Exception $e) {
            // ignore cleanup errors
        }
    }
    
    
    private function getDirectorySize($directory) {
        $size = 0;
        if (is_dir($directory)) {
            foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory)) as $file) {
                $size += $file->getSize();
            }
        } else {
            $size = filesize($directory);
        }
        return $size;
    }
    
    private function formatBytes($size, $precision = 2) {
        $units = array('B', 'KB', 'MB', 'GB', 'TB');
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        return round($size, $precision) . ' ' . $units[$i];
    }
    
    private function createZip($source, $destination) {
        $zip = new ZipArchive();
        if ($zip->open($destination, ZipArchive::CREATE) !== TRUE) {
            throw new Exception('فشل في إنشاء ملف ZIP');
        }
        
        $this->addToZip($zip, $source, '');
        $zip->close();
    }
    
    private function addDirectoryToZip($zip, $source, $zipPath) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        
        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                
                // Skip files that should not be backed up
                if ($this->shouldSkipFile($filePath)) {
                    continue;
                }
                
                // Get relative path from source directory using realpath
                $sourceRealPath = realpath($source);
                $fileRealPath = realpath($filePath);
                $relativePath = str_replace($sourceRealPath . DIRECTORY_SEPARATOR, '', $fileRealPath);
                // Convert backslashes to forward slashes for ZIP
                $relativePath = str_replace('\\', '/', $relativePath);
                // Create clean ZIP path by prefixing the provided zipPath (e.g., "src/", "api/")
                // so that the archive mirrors the original top-level folder structure
                $zipPath = rtrim($zipPath, '/');
                $cleanZipPath = ($zipPath !== '' ? ($zipPath . '/' . $relativePath) : $relativePath);
                // Add to ZIP with clean relative path
                $zip->addFile($filePath, $cleanZipPath);
            }
        }
    }
    
    private function shouldSkipFile($filePath) {
        $skipPatterns = [
            '/node_modules/',
            '/.git/',
            '/.vscode/',
            '/.idea/',
            '/Backup/',
            '/backups/',
            '/temp/',
            '/tmp/',
            '/logs/',
            '/cache/',
            '/.env',
            '/.DS_Store',
            '/Thumbs.db',
            '/*.log',
            '/*.tmp',
            '/*.cache'
        ];
        
        foreach ($skipPatterns as $pattern) {
            if (strpos($filePath, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    private function addToZip($zip, $source, $prefix) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        
        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                // Get relative path from source directory
                $relativePath = str_replace($source . DIRECTORY_SEPARATOR, '', $filePath);
                // Convert backslashes to forward slashes for ZIP
                $relativePath = str_replace('\\', '/', $relativePath);
                // Add to ZIP with clean path
                $zip->addFile($filePath, $prefix . $relativePath);
            }
        }
    }
    
    private function extractZip($zipPath, $destination) {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== TRUE) {
            throw new Exception('فشل في فتح ملف ZIP');
        }
        
        $zip->extractTo($destination);
        $zip->close();
    }
    
    private function restoreFiles($tempDir, $skipApi = false) {
        $itemsToRestore = [
            // Core application directories
            'src/' => '../src/',
            'api/' => '../api/',
            'config/' => '../config/',
            'models/' => '../models/',
            'includes/' => '../includes/',
            'public/' => '../public/',
            'data/' => '../data/',
            'uploads/' => '../uploads/',
            'build/' => '../build/',
            
            // Configuration files
            'package.json' => '../package.json',
            'package-lock.json' => '../package-lock.json',
            'tailwind.config.js' => '../tailwind.config.js',
            'postcss.config.js' => '../postcss.config.js',
            'index.php' => '../index.php',
            'favicon.png' => '../favicon.png',
            
            // Database files
            'database_setup.sql' => '../database_setup.sql',
            'timepay.sql' => '../timepay.sql',
            'timepay_unified.sql' => '../timepay_unified.sql',
            'database_backup.sql' => '../database_backup.sql',
            
            // Additional important files
            'salary_formulas_viewer.html' => '../salary_formulas_viewer.html',
            'test_calculation.php' => '../test_calculation.php',
            'test_salary_api.html' => '../test_salary_api.html',
            'test_ui.html' => '../test_ui.html',
            'Timepay-server.ps1' => '../Timepay-server.ps1',
            'BACKUP_INFO.md' => '../BACKUP_INFO.md'
        ];
        
        foreach ($itemsToRestore as $name => $destPath) {
            // Skip sensitive targets during web request to avoid mid-request crashes
            if ($skipApi) {
                if (strpos($name, 'api/') === 0) { continue; }
                if ($name === 'index.php') { continue; }
                if (strpos($name, 'backups/') === 0) { continue; }
            }
            $sourcePath = $tempDir . '/' . $name;
            
            if (file_exists($sourcePath)) {
                // Copy new file/directory over existing without creating any backup directories
                if (is_dir($sourcePath)) {
                    // Differential: only copy files that differ
                    $this->copyDirectoryDifferential($sourcePath, $destPath);
                } else {
                    if ($this->filesAreDifferent($sourcePath, $destPath)) {
                        @copy($sourcePath, $destPath);
                    }
                }
            }
        }
    }
    
    private function getBackupInfo($filename) {
        $backupPath = $this->backupDir . $filename;
        
        if (file_exists($backupPath)) {
            $zip = new ZipArchive();
            if ($zip->open($backupPath) === TRUE) {
                $infoContent = $zip->getFromName('backup_info.json');
                $zip->close();
                
                if ($infoContent) {
                    $info = json_decode($infoContent, true);
                    return $info;
                }
            }
        }
        
        return [];
    }
    
    private function updateVersionInfo($backupDate) {
        try {
            $versionFile = '../version_info.json';
            if (file_exists($versionFile)) {
                $versionData = json_decode(file_get_contents($versionFile), true);
                $versionData['last_backup'] = $backupDate;
                file_put_contents($versionFile, json_encode($versionData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            }
        } catch (Exception $e) {
            // Ignore version update errors
        }
    }
    
    private function getSystemVersion() {
        try {
            // Try to get version from package.json
            $packageFile = '../package.json';
            if (file_exists($packageFile)) {
                $packageData = json_decode(file_get_contents($packageFile), true);
                if (isset($packageData['version'])) {
                    return $packageData['version'];
                }
            }
            
            // Try to get version from version_info.json
            $versionFile = '../version_info.json';
            if (file_exists($versionFile)) {
                $versionData = json_decode(file_get_contents($versionFile), true);
                if (isset($versionData['version'])) {
                    return $versionData['version'];
                }
            }
            
            // Default version
            return '1.0.0';
        } catch (Exception $e) {
            return '1.0.0';
        }
    }
    
    private function migrateOldBackups() {
        try {
            $legacyDirs = ['../Backup/', '../backups/'];
            $newBackupDir = $this->backupDir;
            
            foreach ($legacyDirs as $oldBackupDir) {
                if (is_dir($oldBackupDir)) {
                    $oldFiles = glob($oldBackupDir . '*');
                    foreach ($oldFiles as $oldFile) {
                        $filename = basename($oldFile);
                        $newFile = $newBackupDir . $filename;
                        if (!file_exists($newFile)) {
                            @rename($oldFile, $newFile);
                        }
                    }
                }
            }
        } catch (Exception $e) {
            // Ignore migration errors
            error_log("Backup migration error: " . $e->getMessage());
        }
    }
}

// Handle requests
$backupSystem = new BackupSystem();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list') {
            echo json_encode($backupSystem->getBackupList(), JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'POST':
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        
        
        // Handle case where JSON decode fails
        if ($input === null && json_last_error() !== JSON_ERROR_NONE) {
            error_log("Backup API - JSON Error: " . json_last_error_msg());
            // Try to get data from $_POST as fallback
            if (!empty($_POST)) {
                $input = $_POST;
                // error_log("Backup API - Using POST data: " . print_r($input, true));
            } else {
                // For GET requests or simple POST requests, set empty array
                $input = [];
                // error_log("Backup API - Using empty input array");
            }
        }
        
        // Additional fallback: try to parse raw input as form data
        if (empty($input) && !empty($rawInput)) {
            parse_str($rawInput, $input);
            // error_log("Backup API - Parsed as form data: " . print_r($input, true));
        }
        
        switch ($action) {
            case 'create':
                // Launch background create to avoid connection resets during web request
                spawn_background_create();
                http_response_code(202);
                echo json_encode([
                    'success' => true,
                    'message' => 'تم بدء إنشاء النسخة الاحتياطية في الخلفية. سيظهر الملف بعد لحظات.'
                ], JSON_UNESCAPED_UNICODE);
                break;
                
            case 'restore':
                // Try to get backup name from multiple sources
                $backupName = null;
                $restoreDatabase = false;
                
                if (isset($input['backup_name'])) {
                    $backupName = $input['backup_name'];
                    $restoreDatabase = isset($input['restore_database']) ? (bool)$input['restore_database'] : false;
                } elseif (isset($_POST['backup_name'])) {
                    $backupName = $_POST['backup_name'];
                    $restoreDatabase = isset($_POST['restore_database']) ? (bool)$_POST['restore_database'] : false;
                } elseif (isset($_GET['backup_name'])) {
                    $backupName = $_GET['backup_name'];
                    $restoreDatabase = isset($_GET['restore_database']) ? (bool)$_GET['restore_database'] : false;
                }
                
                if ($backupName) {
                    // Launch background restore to avoid connection resets during web request
                    spawn_background_restore($backupName, $restoreDatabase);
                    http_response_code(202);
                    echo json_encode([
                        'success' => true,
                        'message' => 'تم بدء الاسترجاع الآمن في الخلفية. ستظهر التغييرات خلال لحظات.'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['success' => false, 'error' => 'اسم النسخة الاحتياطية مطلوب'], JSON_UNESCAPED_UNICODE);
                }
                break;
                
            case 'delete':
                // Try to get backup name from multiple sources
                $backupName = null;
                if (isset($input['backup_name'])) {
                    $backupName = $input['backup_name'];
                } elseif (isset($_POST['backup_name'])) {
                    $backupName = $_POST['backup_name'];
                } elseif (isset($_GET['backup_name'])) {
                    $backupName = $_GET['backup_name'];
                }
                
                if ($backupName) {
                    echo json_encode($backupSystem->deleteBackup($backupName), JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['success' => false, 'error' => 'اسم النسخة الاحتياطية مطلوب'], JSON_UNESCAPED_UNICODE);
                }
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'طريقة طلب غير مدعومة'], JSON_UNESCAPED_UNICODE);
}
?>
