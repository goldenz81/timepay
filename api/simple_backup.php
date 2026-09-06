<?php
// Simple Backup API
error_reporting(0);
ini_set('display_errors', 0);

require_once 'cors_headers.php';

$projectRoot = realpath(__DIR__ . '/..');
$backupDir = realpath(__DIR__ . '/..' . DIRECTORY_SEPARATOR . '..') . DIRECTORY_SEPARATOR . 'TimePay_backups' . DIRECTORY_SEPARATOR;
if (!is_dir($backupDir)) { @mkdir($backupDir, 0755, true); }

function zipDirectory($zip, $source, $zipPrefix = '') {
    $sourceReal = realpath($source);
    if ($sourceReal === false) return;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceReal, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $file) {
        /** @var SplFileInfo $file */
        if ($file->isDir()) continue;
        $filePath = $file->getRealPath();
        // skip large/unnecessary
        if (strpos($filePath, DIRECTORY_SEPARATOR . 'node_modules' . DIRECTORY_SEPARATOR) !== false) continue;
        if (strpos($filePath, DIRECTORY_SEPARATOR . '.git' . DIRECTORY_SEPARATOR) !== false) continue;
        if (strpos($filePath, DIRECTORY_SEPARATOR . 'TimePay_backups' . DIRECTORY_SEPARATOR) !== false) continue;
        $relative = str_replace($sourceReal . DIRECTORY_SEPARATOR, '', $filePath);
        $relative = str_replace('\\', '/', $relative);
        $inZip = ltrim($zipPrefix . '/' . $relative, '/');
        $zip->addFile($filePath, $inZip);
    }
}

function createBackup($projectRoot, $backupDir) {
    $timestamp = date('Y-m-d_H-i-s');
    $name = 'TimePay_Backup_' . $timestamp . '.zip';
    $path = $backupDir . $name;

    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE) !== true) {
        return ['success' => false, 'error' => 'تعذر إنشاء ملف النسخة'];
    }

    // Try to dump current database into a temp file and include it
    $tmpSql = null;
    try {
        $cfgPath = file_exists($projectRoot . '/config/database_config.php') ? ($projectRoot . '/config/database_config.php') : null;
        if ($cfgPath) {
            $config = require $cfgPath;
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['dbname']);
            $pdo = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false
            ]);
            $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
            $dump = "-- TimePay Database Backup\n-- Generated on: " . date('Y-m-d H:i:s') . "\n-- Database: {$config['dbname']}\n\n";
            $dump .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\nSET AUTOCOMMIT=0;\nSTART TRANSACTION;\nSET time_zone='+00:00';\n\n";
            foreach ($tables as $table) {
                $create = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
                $dump .= "-- Structure for table `{$table}`\nDROP TABLE IF EXISTS `{$table}`;\n" . ($create['Create Table'] ?? '') . ";\n\n";
                $rows = $pdo->query("SELECT * FROM `{$table}`", PDO::FETCH_ASSOC);
                $first = $rows->fetch();
                if ($first) {
                    $columns = array_map(fn($c)=>"`{$c}`", array_keys($first));
                    $values = '(' . implode(', ', array_map(fn($v)=>$v===null?'NULL':$pdo->quote($v), array_values($first))) . ')';
                    $dump .= "INSERT INTO `{$table}` (" . implode(', ', $columns) . ") VALUES \n{$values}";
                    $count = 1;
                    while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
                        $val = '(' . implode(', ', array_map(fn($v)=>$v===null?'NULL':$pdo->quote($v), array_values($row))) . ')';
                        $dump .= ",\n{$val}";
                        $count++;
                        if ($count % 500 === 0) { $dump .= ";\n"; }
                    }
                    if ($count % 500 !== 0) { $dump .= ";\n"; }
                    $dump .= "\n";
                }
            }
            $dump .= "COMMIT;\n";
            $tmpSql = $backupDir . 'database_backup_' . $timestamp . '.sql';
            file_put_contents($tmpSql, $dump);
            // add to zip
            $zip->addFile($tmpSql, 'database_backup.sql');
        }
    } catch (Throwable $e) {
        // ignore db dump errors, keep file backup working
    }

    $include = [
        // Directories (no production build while in development)
        'src', 'api', 'config', 'models', 'includes', 'public', 'data', 'uploads',
        // Root files
        '.htaccess', 'index.php', 'index.php_', 'package.json', 'package-lock.json',
        'postcss.config.js', 'tailwind.config.js', 'favicon.png', 'Timepay-server.ps1'
    ];

    foreach ($include as $item) {
        $full = $projectRoot . DIRECTORY_SEPARATOR . $item;
        if (is_dir($full)) {
            zipDirectory($zip, $full, $item);
        } elseif (is_file($full)) {
            $zip->addFile($full, $item);
        }
    }

    $zip->addFromString('backup_info.json', json_encode(['date' => date('Y-m-d H:i:s')], JSON_UNESCAPED_UNICODE));
    $zip->close();
    if ($tmpSql && file_exists($tmpSql)) { @unlink($tmpSql); }

    // Get file info after creation
    $filePath = $backupDir . $name;
    $fileSize = file_exists($filePath) ? round(filesize($filePath) / 1024 / 1024, 2) . ' MB' : 'غير محدد';
    $fileDate = file_exists($filePath) ? date('Y-m-d H:i:s', filemtime($filePath)) : date('Y-m-d H:i:s');

    return [
        'success' => true, 
        'message' => 'تم إنشاء النسخة بنجاح', 
        'backup_name' => $name,
        'size' => $fileSize,
        'date' => $fileDate
    ];
}

function listBackups($backupDir) {
    $files = glob($backupDir . '*.zip') ?: [];
    $backups = [];
    foreach ($files as $file) {
        $backups[] = [
            'name' => basename($file),
            'date' => date('Y-m-d H:i:s', filemtime($file)),
            'size' => round(filesize($file) / 1024 / 1024, 2) . ' MB',
        ];
    }
    usort($backups, function($a,$b){ return strtotime($b['date']) - strtotime($a['date']); });
    return ['success' => true, 'backups' => $backups];
}

function deleteBackup($backupDir, $name) {
    if (!$name) return ['success' => false, 'error' => 'اسم النسخة مطلوب'];
    $path = $backupDir . basename($name);
    if (!is_file($path)) return ['success' => false, 'error' => 'النسخة غير موجودة'];
    return unlink($path) ? ['success' => true, 'message' => 'تم الحذف'] : ['success' => false, 'error' => 'تعذر الحذف'];
}

function downloadBackup($backupDir, $name) {
    $path = $backupDir . basename($name);
    if (!is_file($path)) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'غير موجود']); return; }
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . basename($path) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
}

$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    echo json_encode(listBackups($backupDir), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'create') {
        // Run quickly in the same request (simple and reliable)
        echo json_encode(createBackup($projectRoot, $backupDir), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'delete') {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?: [];
        $name = $input['backup_name'] ?? ($_POST['backup_name'] ?? ($_GET['backup_name'] ?? ''));
        echo json_encode(deleteBackup($backupDir, $name), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'download') {
    $name = $_GET['backup_name'] ?? '';
    downloadBackup($backupDir, $name);
    exit;
}

echo json_encode(['success' => false, 'error' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
?>


