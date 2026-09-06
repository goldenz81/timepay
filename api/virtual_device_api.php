<?php
// إخفاء أخطاء PHP لمنع HTML من الظهور
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $config = require '../config/database_config.php';
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $username = $config['username'];
    $password = $config['password'];
    $options = $config['options'];
    
    $pdo = new PDO($dsn, $username, $password, $options);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'check_in':
            handleCheckIn($pdo, $input);
            break;
            
        case 'check_out':
            handleCheckOut($pdo, $input);
            break;
            
        case 'get_recent_logs':
            getRecentLogs($pdo, $input);
            break;
            
        case 'import_fingerprint_file':
            importFingerprintFile($pdo, $input);
            break;
            
        case 'sync_to_attendance_logs':
            syncToAttendanceLogs($pdo, $input);
            break;
            
        case 'get_last_sync':
            getLastSync($pdo, $input);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Action not supported']);
    }
    
} catch (Exception $e) {
    // إيقاف عرض الأخطاء لمنع HTML من الظهور
    error_reporting(0);
    ini_set('display_errors', 0);
    
    echo json_encode([
        'success' => false, 
        'message' => 'خطأ في الخادم: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ], JSON_UNESCAPED_UNICODE);
}

function handleCheckIn($pdo, $input) {
    try {
        // التحقق من البيانات المطلوبة
        if (empty($input['AC-No.']) || empty($input['Name'])) {
            throw new Exception('رقم الموظف والاسم مطلوبان');
        }
        
        // تحويل بيانات ملف البصمة إلى تنسيق قاعدة البيانات
        $acNo = convertArabicNumbers($input['AC-No.']);
        $name = $input['Name'];
        $date = convertDate($input['Date'] ?? date('Y-m-d'));
        $clockIn = convertTime($input['Clock In'] ?? date('H:i:s'));
        $department = $input['Department'] ?? '';
        $week = convertArabicNumbers($input['week'] ?? date('w'));
        
        // التحقق من وجود سجل لهذا الموظف في نفس اليوم
        $stmt = $pdo->prepare("
            SELECT id FROM fingerprint_attendance 
            WHERE ac_no = ? AND attendance_date = ?
        ");
        $stmt->execute([$acNo, $date]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // تحديث سجل موجود
            $stmt = $pdo->prepare("
                UPDATE fingerprint_attendance 
                SET clock_in = ?, employee_name = ?, department = ?, week_day = ?
                WHERE id = ?
            ");
            $stmt->execute([$clockIn, $name, $department, $week, $existing['id']]);
        } else {
            // إنشاء سجل جديد
            $stmt = $pdo->prepare("
                INSERT INTO fingerprint_attendance 
                (ac_no, employee_name, attendance_date, clock_in, department, week_day, is_absent, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
            ");
            $stmt->execute([$acNo, $name, $date, $clockIn, $department, $week]);
        }
        
        echo json_encode([
            'success' => true, 
            'message' => 'تم تسجيل الدخول بنجاح',
            'data' => [
                'employee_name' => $name,
                'clock_in' => $clockIn,
                'date' => $date
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function handleCheckOut($pdo, $input) {
    try {
        // التحقق من البيانات المطلوبة
        if (empty($input['AC-No.']) || empty($input['Name'])) {
            throw new Exception('رقم الموظف والاسم مطلوبان');
        }
        
        // تحويل بيانات ملف البصمة إلى تنسيق قاعدة البيانات
        $acNo = convertArabicNumbers($input['AC-No.']);
        $name = $input['Name'];
        $date = convertDate($input['Date'] ?? date('Y-m-d'));
        $clockOut = convertTime($input['Clock Out'] ?? date('H:i:s'));
        $department = $input['Department'] ?? '';
        $week = convertArabicNumbers($input['week'] ?? date('w'));
        
        // البحث عن سجل الدخول لهذا الموظف في نفس اليوم
        $stmt = $pdo->prepare("
            SELECT id, clock_in FROM fingerprint_attendance 
            WHERE ac_no = ? AND attendance_date = ?
        ");
        $stmt->execute([$acNo, $date]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // تحديث سجل موجود
            $stmt = $pdo->prepare("
                UPDATE fingerprint_attendance 
                SET clock_out = ?, employee_name = ?, department = ?, week_day = ?
                WHERE id = ?
            ");
            $stmt->execute([$clockOut, $name, $department, $week, $existing['id']]);
            
            // حساب ساعات العمل إذا كان هناك وقت دخول
            if ($existing['clock_in']) {
                $workHours = calculateWorkHours($existing['clock_in'], $clockOut);
                $stmt = $pdo->prepare("
                    UPDATE fingerprint_attendance 
                    SET work_time = ?
                    WHERE id = ?
                ");
                $stmt->execute([$workHours, $existing['id']]);
            }
        } else {
            // إنشاء سجل جديد للخروج فقط
            $stmt = $pdo->prepare("
                INSERT INTO fingerprint_attendance 
                (ac_no, employee_name, attendance_date, clock_out, department, week_day, is_absent, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
            ");
            $stmt->execute([$acNo, $name, $date, $clockOut, $department, $week]);
        }
        
        echo json_encode([
            'success' => true, 
            'message' => 'تم تسجيل الخروج بنجاح',
            'data' => [
                'employee_name' => $name,
                'clock_out' => $clockOut,
                'date' => $date
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getRecentLogs($pdo, $input) {
    try {
        $limit = $input['limit'] ?? 10;
        
        // جلب آخر سجلات الحضور من جدول البصمة
        $stmt = $pdo->prepare("
            SELECT 
                id,
                ac_no as 'AC-No.',
                employee_name as Name,
                attendance_date as Date,
                clock_in as 'Clock In',
                clock_out as 'Clock Out',
                department as Department,
                is_absent,
                created_at
            FROM fingerprint_attendance 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'count' => count($logs)
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function calculateWorkHours($clockIn, $clockOut) {
    try {
        $inTime = new DateTime($clockIn);
        $outTime = new DateTime($clockOut);
        $diff = $outTime->diff($inTime);
        
        $hours = $diff->h + ($diff->i / 60) + ($diff->s / 3600);
        return round($hours, 2);
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * تحويل بيانات ملف البصمة الحقيقي إلى تنسيق قاعدة البيانات
 */
function convertFingerprintData($input) {
    return [
        'ac_no' => convertArabicNumbers($input['AC-No.'] ?? ''),
        'employee_name' => $input['Name'] ?? '',
        'attendance_date' => convertDate($input['Date'] ?? date('Y-m-d')),
        'clock_in' => convertTime($input['Clock In'] ?? null),
        'clock_out' => convertTime($input['Clock Out'] ?? null),
        'late_time' => convertArabicNumbers($input['Late'] ?? 0),
        'early_time' => convertArabicNumbers($input['Early'] ?? 0),
        'is_absent' => convertArabicNumbers($input['Absent'] ?? 0),
        'ot_time' => convertArabicNumbers($input['OT Time'] ?? 0),
        'work_time' => convertArabicNumbers($input['Work Time'] ?? 0),
        'department' => $input['Department'] ?? '',
        'week_day' => convertArabicNumbers($input['week'] ?? date('w'))
    ];
}

/**
 * تحويل الأرقام العربية إلى إنجليزية
 */
function convertArabicNumbers($text) {
    $arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($arabic, $english, $text);
}

/**
 * تحويل الوقت من تنسيقات مختلفة إلى H:i:s
 */
function convertTime($time) {
    if (empty($time)) {
        return null;
    }
    
    // تحويل الأرقام العربية إلى إنجليزية
    $time = convertArabicNumbers($time);
    
    // إزالة المسافات الزائدة
    $time = trim($time);
    
    // إذا كان الوقت بصيغة H:i:s
    if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $time)) {
        return $time;
    }
    
    // إذا كان الوقت بصيغة H:i
    if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
        return $time . ':00';
    }
    
    // إذا كان الوقت بصيغة H فقط
    if (preg_match('/^\d{1,2}$/', $time)) {
        return $time . ':00:00';
    }
    
    // محاولة تحليل الوقت باستخدام strtotime
    $timestamp = strtotime($time);
    if ($timestamp !== false) {
        return date('H:i:s', $timestamp);
    }
    
    return null;
}

/**
 * تحويل التاريخ من تنسيقات مختلفة إلى Y-m-d
 */
function convertDate($date) {
    if (empty($date)) {
        return date('Y-m-d');
    }
    
    // تحويل الأرقام العربية إلى إنجليزية
    $date = convertArabicNumbers($date);
    
    // إذا كان التاريخ يحتوي على / أو - أو مسافات
    if (strpos($date, '/') !== false || strpos($date, '-') !== false || strpos($date, ' ') !== false) {
        $timestamp = strtotime(str_replace(['/', ' '], ['-', ' '], $date));
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }
    }
    
    // إذا كان التاريخ بالفعل بصيغة Y-m-d
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return $date;
    }
    
    // افتراضي
    return date('Y-m-d');
}

/**
 * استيراد ملف البصمة الحقيقي
 */
function importFingerprintFile($pdo, $input) {
    try {
        if (empty($input['data']) || !is_array($input['data'])) {
            throw new Exception('بيانات الملف مطلوبة');
        }
        
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        
        foreach ($input['data'] as $index => $row) {
            try {
                // تحويل بيانات الصف إلى تنسيق قاعدة البيانات
                $data = convertFingerprintData($row);
                
                // التحقق من البيانات الأساسية
                if (empty($data['ac_no']) || empty($data['employee_name'])) {
                    $skipped++;
                    continue;
                }
                
                // التحقق من وجود سجل موجود
                $stmt = $pdo->prepare("
                    SELECT id FROM fingerprint_attendance 
                    WHERE ac_no = ? AND attendance_date = ?
                ");
                $stmt->execute([$data['ac_no'], $data['attendance_date']]);
                $existing = $stmt->fetch();
                
                if ($existing) {
                    // تحديث سجل موجود
                    $stmt = $pdo->prepare("
                        UPDATE fingerprint_attendance 
                        SET 
                            employee_name = ?,
                            clock_in = ?,
                            clock_out = ?,
                            late_time = ?,
                            early_time = ?,
                            is_absent = ?,
                            ot_time = ?,
                            work_time = ?,
                            department = ?,
                            week_day = ?,
                            updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $data['employee_name'],
                        $data['clock_in'],
                        $data['clock_out'],
                        $data['late_time'],
                        $data['early_time'],
                        $data['is_absent'],
                        $data['ot_time'],
                        $data['work_time'],
                        $data['department'],
                        $data['week_day'],
                        $existing['id']
                    ]);
                    $updated++;
                } else {
                    // إنشاء سجل جديد
                    $stmt = $pdo->prepare("
                        INSERT INTO fingerprint_attendance 
                        (ac_no, employee_name, attendance_date, clock_in, clock_out, 
                         late_time, early_time, is_absent, ot_time, work_time, 
                         department, week_day, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ");
                    $stmt->execute([
                        $data['ac_no'],
                        $data['employee_name'],
                        $data['attendance_date'],
                        $data['clock_in'],
                        $data['clock_out'],
                        $data['late_time'],
                        $data['early_time'],
                        $data['is_absent'],
                        $data['ot_time'],
                        $data['work_time'],
                        $data['department'],
                        $data['week_day']
                    ]);
                    $imported++;
                }
                
            } catch (Exception $e) {
                $errors[] = "صف " . ($index + 1) . ": " . $e->getMessage();
                $skipped++;
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'تم استيراد الملف بنجاح',
            'imported_count' => $imported,
            'updated_count' => $updated,
            'skipped_count' => $skipped,
            'errors' => $errors
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * مزامنة بيانات البصمة مع جدول attendance_logs
 */
function syncToAttendanceLogs($pdo, $input) {
    try {
        // فحص هيكل جدول attendance_logs الموجود
        $stmt = $pdo->query("DESCRIBE attendance_logs");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // تحديد أسماء الأعمدة الصحيحة
        $employeeIdColumn = in_array('employee_id', $columns) ? 'employee_id' : 'employee_id';
        $checkInColumn = in_array('check_in', $columns) ? 'check_in' : 'check_in_time';
        $checkOutColumn = in_array('check_out', $columns) ? 'check_out' : 'check_out_time';
        $workHoursColumn = in_array('work_hours', $columns) ? 'work_hours' : 'work_hours';
        $overtimeColumn = in_array('overtime_hours', $columns) ? 'overtime_hours' : 'overtime_hours';
        
        $date = $input['date'] ?? date('Y-m-d');
        $limit = $input['limit'] ?? 100;
        
        // جلب البيانات من fingerprint_attendance (بدون device_id - قد لا يكون موجوداً في جدول الجهاز الافتراضي)
        $stmt = $pdo->prepare("
            SELECT 
                ac_no,
                employee_name,
                attendance_date,
                clock_in,
                clock_out,
                late_time,
                early_time,
                is_absent,
                ot_time,
                work_time,
                department,
                week_day,
                created_at
            FROM fingerprint_attendance 
            WHERE attendance_date = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$date, $limit]);
        $fingerprintData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $synced = 0;
        $updated = 0;
        $errors = [];
        
        foreach ($fingerprintData as $record) {
            try {
                // البحث عن الموظف باستخدام AC-No.
                $empStmt = $pdo->prepare("
                    SELECT id, employee_code, `AC-No.`, name, name_ar
                    FROM employees 
                    WHERE (`AC-No.` = ? OR fingerprint_id = ?) AND status = 'active'
                    LIMIT 1
                ");
                $empStmt->execute([$record['ac_no'], $record['ac_no']]);
                $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$employee) {
                    error_log("Employee not found for AC-No: " . $record['ac_no']);
                    continue; // تخطي إذا لم يتم العثور على الموظف
                }
                
                $employee_id = $employee['id'];
                $employee_code = $employee['employee_code'];
                
                // التحقق من وجود سجل في attendance_logs باستخدام employee_id الحقيقي
                $stmt = $pdo->prepare("
                    SELECT id FROM attendance_logs 
                    WHERE employee_id = ? AND attendance_date = ?
                ");
                $stmt->execute([$employee_id, $record['attendance_date']]);
                $existing = $stmt->fetch();
                
                if ($existing) {
                    // تحديث سجل موجود - استخدام الأعمدة الصحيحة
                    $updateFields = [];
                    $updateValues = [];
                    $hasChanges = false;
                    
                    // إضافة الحقول المتاحة فقط
                    if (in_array('check_in', $columns) && $record['clock_in']) {
                        $updateFields[] = "check_in = ?";
                        $updateValues[] = $record['clock_in'];
                        $hasChanges = true;
                    }
                    if (in_array('check_out', $columns) && $record['clock_out']) {
                        $updateFields[] = "check_out = ?";
                        $updateValues[] = $record['clock_out'];
                        $hasChanges = true;
                    }
                    
                    // حساب ساعات العمل إذا كان هناك وقت دخول وخروج
                    $workHours = '0.00';
                    if ($record['clock_in'] && $record['clock_out']) {
                        $workHours = calculateWorkHours($record['clock_in'], $record['clock_out']);
                    } elseif ($record['clock_in'] && !$record['clock_out']) {
                        // إذا كان هناك وقت دخول فقط، احسب الساعات حتى الوقت الحالي
                        $currentTime = date('H:i:s');
                        $workHours = calculateWorkHours($record['clock_in'], $currentTime);
                    }
                    
                    if (in_array('work_hours', $columns)) {
                        $updateFields[] = "work_hours = ?";
                        $updateValues[] = $workHours;
                        $hasChanges = true;
                    }
                    if (in_array('overtime_hours', $columns)) {
                        $updateFields[] = "overtime_hours = ?";
                        $updateValues[] = $record['ot_time'] ?: '0.00';
                        $hasChanges = true;
                    }
                    if (in_array('status', $columns)) {
                        $updateFields[] = "status = ?";
                        $updateValues[] = $record['is_absent'] ? 'absent' : 'present';
                        $hasChanges = true;
                    }
                    
                    $updateValues[] = $existing['id'];
                    
                    if ($hasChanges && !empty($updateFields)) {
                        $stmt = $pdo->prepare("
                            UPDATE attendance_logs 
                            SET " . implode(', ', $updateFields) . "
                            WHERE id = ?
                        ");
                        $stmt->execute($updateValues);
                        $updated++;
                    }
                } else {
                    // إنشاء سجل جديد - استخدام الأعمدة المتاحة فقط
                    $insertFields = [];
                    $insertValues = [];
                    $placeholders = [];
                    
                    // حساب ساعات العمل
                    $workHours = '0.00';
                    if ($record['clock_in'] && $record['clock_out']) {
                        $workHours = calculateWorkHours($record['clock_in'], $record['clock_out']);
                    } elseif ($record['clock_in'] && !$record['clock_out']) {
                        // إذا كان هناك وقت دخول فقط، احسب الساعات حتى الوقت الحالي
                        $currentTime = date('H:i:s');
                        $workHours = calculateWorkHours($record['clock_in'], $currentTime);
                    }
                    
                    // البحث عن الموظف باستخدام AC-No.
                    $empStmt = $pdo->prepare("
                        SELECT id, employee_code, `AC-No.`, name, name_ar
                        FROM employees 
                        WHERE (`AC-No.` = ? OR fingerprint_id = ?) AND status = 'active'
                        LIMIT 1
                    ");
                    $empStmt->execute([$record['ac_no'], $record['ac_no']]);
                    $employee = $empStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$employee) {
                        error_log("Employee not found for AC-No: " . $record['ac_no']);
                        continue; // تخطي إذا لم يتم العثور على الموظف
                    }
                    
                    $employee_id = $employee['id'];
                    $employee_code = $employee['employee_code'];
                    
                    // إضافة الحقول الأساسية المتاحة - استخدام employee_id الحقيقي
                    if (in_array('employee_id', $columns)) {
                        $insertFields[] = 'employee_id';
                        $insertValues[] = $employee_id; // استخدام ID الحقيقي من جدول employees
                        $placeholders[] = '?';
                    }
                    
                    // إضافة employee_code إذا كان متاحاً
                    if (in_array('employee_code', $columns) && $employee_code) {
                        $insertFields[] = 'employee_code';
                        $insertValues[] = $employee_code;
                        $placeholders[] = '?';
                    }
                    if (in_array('attendance_date', $columns)) {
                        $insertFields[] = 'attendance_date';
                        $insertValues[] = $record['attendance_date'];
                        $placeholders[] = '?';
                    }
                    if (in_array('check_in', $columns) && $record['clock_in']) {
                        $insertFields[] = 'check_in';
                        $insertValues[] = $record['clock_in'];
                        $placeholders[] = '?';
                    }
                    if (in_array('check_out', $columns) && $record['clock_out']) {
                        $insertFields[] = 'check_out';
                        $insertValues[] = $record['clock_out'];
                        $placeholders[] = '?';
                    }
                    if (in_array('work_hours', $columns)) {
                        $insertFields[] = 'work_hours';
                        $insertValues[] = $workHours;
                        $placeholders[] = '?';
                    }
                    if (in_array('overtime_hours', $columns)) {
                        $insertFields[] = 'overtime_hours';
                        $insertValues[] = $record['ot_time'] ?: '0.00';
                        $placeholders[] = '?';
                    }
                    if (in_array('status', $columns)) {
                        $insertFields[] = 'status';
                        $insertValues[] = $record['is_absent'] ? 'absent' : 'present';
                        $placeholders[] = '?';
                    }
                    
                    if (!empty($insertFields)) {
                        $stmt = $pdo->prepare("
                            INSERT INTO attendance_logs 
                            (" . implode(', ', $insertFields) . ") 
                            VALUES (" . implode(', ', $placeholders) . ")
                        ");
                        $stmt->execute($insertValues);
                        $synced++;
                    }
                }
                
            } catch (Exception $e) {
                $errors[] = "خطأ في مزامنة الموظف {$record['employee_name']} (ID: {$record['ac_no']}): " . $e->getMessage();
                // إضافة معلومات تشخيصية إضافية
                error_log("Sync Error: " . $e->getMessage() . " - Record: " . json_encode($record));
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'تمت المزامنة بنجاح',
            'synced_count' => $synced,
            'updated_count' => $updated,
            'total_records' => count($fingerprintData),
            'errors' => $errors,
            'debug_info' => [
                'date_searched' => $date,
                'fingerprint_records_found' => count($fingerprintData),
                'sample_record' => !empty($fingerprintData) ? $fingerprintData[0] : null,
                'attendance_logs_columns' => $columns,
                'columns_used' => [
                    'employee_id_column' => $employeeIdColumn,
                    'check_in_column' => $checkInColumn,
                    'check_out_column' => $checkOutColumn,
                    'work_hours_column' => $workHoursColumn,
                    'overtime_column' => $overtimeColumn
                ],
                'sync_summary' => [
                    'records_processed' => count($fingerprintData),
                    'new_records_created' => $synced,
                    'existing_records_updated' => $updated,
                    'errors_encountered' => count($errors)
                ]
            ]
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * الحصول على آخر مزامنة من قاعدة البيانات
 */
function getLastSync($pdo, $input) {
    try {
        // التحقق من وجود الجدول
        $stmt = $pdo->query("SHOW TABLES LIKE 'fingerprint_attendance'");
        if ($stmt->rowCount() === 0) {
            echo json_encode([
                'success' => false, 
                'message' => 'جدول fingerprint_attendance غير موجود',
                'last_sync' => null
            ]);
            return;
        }
        
        // الحصول على آخر مزامنة
        $stmt = $pdo->query("
            SELECT 
                MAX(sync_date) as last_sync,
                COUNT(*) as total_records
            FROM fingerprint_attendance 
            WHERE sync_date IS NOT NULL
        ");
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && $result['last_sync']) {
            echo json_encode([
                'success' => true,
                'last_sync' => $result['last_sync'],
                'total_records' => $result['total_records'],
                'formatted_date' => date('Y-m-d H:i:s', strtotime($result['last_sync']))
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'last_sync' => null,
                'total_records' => 0,
                'message' => 'لا توجد مزامنة سابقة'
            ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false, 
            'message' => $e->getMessage(),
            'last_sync' => null
        ]);
    }
}
?>
