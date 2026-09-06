<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

// Ensure correct timezone (adjust if needed)
if (function_exists('date_default_timezone_set')) {
    @date_default_timezone_set('Africa/Cairo');
}

function normalize_time_hhmm($value) {
    // Return HH:MM (drop seconds if present), default 03:00
    if (!$value) return '03:00';
    if (preg_match('/^(\d{2}):(\d{2})$/', $value, $m)) {
        return $m[1] . ':' . $m[2];
    }
    if (preg_match('/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/', $value, $m)) {
        $h = max(0, min(23, intval($m[1])));
        $i = max(0, min(59, intval($m[2])));
        return str_pad((string)$h, 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
    }
    return '03:00';
}

function createBackup() {
    try {
        // Call backup creation API
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost/TimePay/api/simple_backup.php?action=create');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true) ?: ['success' => false, 'message' => 'Invalid response'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function find_pwsh_path() {
    $candidates = [
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        'C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
    ];
    foreach ($candidates as $p) {
        if (file_exists($p)) return $p;
    }
    return 'powershell.exe';
}

function run_cmd($cmd) {
    $descriptor = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $proc = proc_open($cmd, $descriptor, $pipes, null, null, ['bypass_shell' => true]);
    if (!is_resource($proc)) return ['code' => -1, 'stdout' => '', 'stderr' => 'proc_open failed'];
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    foreach ($pipes as $p) { if (is_resource($p)) fclose($p); }
    $code = proc_close($proc);
    return ['code' => $code, 'stdout' => $stdout, 'stderr' => $stderr];
}

function write_diag_log($msg) {
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'backup_task.log';
    @file_put_contents($path, '[' . date('Y-m-d H:i:s') . "] " . $msg . "\n", FILE_APPEND);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';

    switch ($action) {
        case 'schedule_backup':
            $frequency = $input['frequency'] ?? 'daily';
            $timeRaw = $input['time'] ?? '03:00';
            $time = normalize_time_hhmm($timeRaw);

            // If an active schedule exists, update it; otherwise insert a new one
            $pdo->beginTransaction();

            $sel = $pdo->prepare("SELECT id FROM backup_schedule WHERE is_active = 1 LIMIT 1");
            $sel->execute();
            $existing = $sel->fetch(PDO::FETCH_ASSOC);

            if ($existing && isset($existing['id'])) {
                // Update schedule and reset last_backup_date to allow re-run today after time change
                $upd = $pdo->prepare("UPDATE backup_schedule SET frequency = ?, backup_time = ?, last_backup_date = NULL, is_active = 1, updated_at = NOW() WHERE id = ?");
                $upd->execute([$frequency, $time . ':00', $existing['id']]);
            } else {
                $ins = $pdo->prepare("INSERT INTO backup_schedule (frequency, backup_time, is_active, last_backup_date, created_at, updated_at) VALUES (?, ?, 1, NULL, NOW(), NOW())");
                $ins->execute([$frequency, $time . ':00']);
            }

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'تم جدولة النسخ الاحتياطي التلقائي بنجاح',
                'saved' => ['frequency' => $frequency, 'backup_time' => $time]
            ]);
            break;

        case 'check_scheduled_backup':
            // Compare by HH:MM ignoring seconds, with ±1 minute tolerance (current or previous minute)
            $currentTime = date('H:i');
            $prevMinute = date('H:i', strtotime('-1 minute'));
            $currentDate = date('Y-m-d');

            $stmt = $pdo->prepare("
                SELECT * FROM backup_schedule 
                WHERE is_active = 1 
                AND DATE_FORMAT(backup_time, '%H:%i') IN (?, ?) 
                AND (last_backup_date IS NULL OR last_backup_date < ?)
            ");
            $stmt->execute([$currentTime, $prevMinute, $currentDate]);
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $results = [];
            foreach ($schedules as $schedule) {
                $backupResult = createBackup();
                $results[] = ['schedule_id' => $schedule['id'], 'result' => $backupResult];

                if (!empty($backupResult['success'])) {
                    $updateStmt = $pdo->prepare("UPDATE backup_schedule SET last_backup_date = ?, updated_at = NOW() WHERE id = ?");
                    $updateStmt->execute([$currentDate, $schedule['id']]);
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'تم فحص النسخ الاحتياطي المجدول',
                'checked_at' => $currentDate . ' ' . $currentTime,
                'matches' => count($schedules),
                'results' => $results
            ]);
            break;

        case 'run_now':
            // Force a backup now (for testing)
            $result = createBackup();
            echo json_encode([
                'success' => !empty($result['success']),
                'message' => !empty($result['success']) ? 'تم تنفيذ النسخ الاحتياطي الآن' : ($result['message'] ?? 'فشل التنفيذ'),
                'result' => $result,
                'server_time' => date('Y-m-d H:i')
            ]);
            break;

        case 'install_task':
            // Create Windows Scheduled Task using curl to call check_scheduled_backup every minute
            $url = "http://127.0.0.1/TimePay/api/backup_scheduler.php?action=check_scheduled_backup";
            $cmdLine = 'cmd.exe /c "curl --silent --show-error ' . $url . ' > NUL 2>&1"';

            // Optional credentials
            $ru = $input['ru'] ?? $_GET['ru'] ?? '';
            $rp = $input['rp'] ?? $_GET['rp'] ?? '';

            if (!empty($ru) && !empty($rp)) {
                // Create task to run under specified user
                $cmd = 'schtasks /Create /SC MINUTE /MO 1 /TN "TimePay_BackupChecker" /TR ' . escapeshellarg($cmdLine) . ' /RU ' . escapeshellarg($ru) . ' /RP ' . escapeshellarg($rp) . ' /RL HIGHEST /F';
            } else {
                // Default: try SYSTEM (requires admin token for creation)
                $cmd = 'schtasks /Create /SC MINUTE /MO 1 /TN "TimePay_BackupChecker" /TR ' . escapeshellarg($cmdLine) . ' /RU SYSTEM /RL HIGHEST /F';
            }

            $res = run_cmd($cmd);
            echo json_encode([
                'success' => $res['code'] === 0,
                'message' => $res['code'] === 0 ? 'تم إنشاء المهمة المجدولة بنجاح' : ('فشل إنشاء المهمة: ' . $res['stderr']),
                'stdout' => $res['stdout'],
                'stderr' => $res['stderr'],
                'task_command' => $cmdLine,
                'ru' => !empty($ru)
            ]);
            break;

        case 'uninstall_task':
            $res = run_cmd('schtasks /Delete /TN "TimePay_BackupChecker" /F');
            echo json_encode([
                'success' => $res['code'] === 0,
                'message' => $res['code'] === 0 ? 'تم حذف المهمة المجدولة' : ('فشل حذف المهمة: ' . $res['stderr'])
            ]);
            break;

        case 'status_task':
            $res = run_cmd('schtasks /Query /TN "TimePay_BackupChecker" /V /FO LIST');
            echo json_encode([
                'success' => $res['code'] === 0,
                'installed' => $res['code'] === 0,
                'details' => $res['stdout']
            ]);
            break;

        case 'run_task_now':
            // Trigger the scheduled task immediately
            $res = run_cmd('schtasks /Run /TN "TimePay_BackupChecker"');
            echo json_encode([
                'success' => $res['code'] === 0,
                'message' => $res['code'] === 0 ? 'تم تشغيل المهمة الآن' : ('فشل تشغيل المهمة: ' . $res['stderr']),
                'stdout' => $res['stdout'],
                'stderr' => $res['stderr']
            ]);
            break;

        case 'diag':
            write_diag_log('diag ping received');
            echo json_encode(['success' => true, 'message' => 'diag written', 'file' => 'api/backup_task.log']);
            break;

        default:
            echo json_encode([
                'success' => false,
                'message' => 'إجراء غير صحيح'
            ]);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) { try { $pdo->rollBack(); } catch (Exception $ignore) {} }
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم: ' . $e->getMessage()
    ]);
}
?>
