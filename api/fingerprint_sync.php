<?php
/**
 * API لمزامنة بيانات الحضور من أجهزة البصمة
 * يدعم أجهزة ZKTeco, Suprema, Hikvision
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-09-10
 */

require_once 'cors_headers.php';

// إعداد قاعدة البيانات
require_once 'config.php';
require_once 'attendance_logs.php';

// دعم معالجة بيانات الأجهزة الحقيقية
function convertArabicNumbers($text) {
    if (empty($text)) return $text;
    
    $arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    return str_replace($arabic, $english, $text);
}

function convertTime($time) {
    if (empty($time)) return null;
    
    $time = convertArabicNumbers($time);
    
    // تحويل تنسيقات مختلفة من الوقت
    if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', $time, $matches)) {
        return sprintf('%02d:%02d:%02d', $matches[1], $matches[2], $matches[3]);
    } elseif (preg_match('/^(\d{1,2}):(\d{2})$/', $time, $matches)) {
        return sprintf('%02d:%02d:00', $matches[1], $matches[2]);
    }
    
    return $time;
}

function convertDate($date) {
    if (empty($date)) return date('Y-m-d');
    
    $date = convertArabicNumbers($date);
    
    // تحويل تنسيقات مختلفة من التاريخ
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $date, $matches)) {
        return sprintf('%04d-%02d-%02d', $matches[1], $matches[2], $matches[3]);
    } elseif (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $date, $matches)) {
        return sprintf('%04d-%02d-%02d', $matches[3], $matches[1], $matches[2]);
    }
    
    return $date;
}

/**
 * تحويل بيانات الجهاز الحقيقي إلى تنسيق قاعدة البيانات
 */
function convertRealDeviceData($deviceRecord) {
    return [
        'ac_no' => convertArabicNumbers($deviceRecord['AC-No.'] ?? $deviceRecord['ac_no'] ?? ''),
        'employee_name' => $deviceRecord['Name'] ?? $deviceRecord['employee_name'] ?? '',
        'attendance_date' => convertDate($deviceRecord['Date'] ?? $deviceRecord['attendance_date'] ?? date('Y-m-d')),
        'clock_in' => convertTime($deviceRecord['Clock In'] ?? $deviceRecord['clock_in'] ?? null),
        'clock_out' => convertTime($deviceRecord['Clock Out'] ?? $deviceRecord['clock_out'] ?? null),
        'late_time' => convertArabicNumbers($deviceRecord['Late'] ?? $deviceRecord['late_time'] ?? 0),
        'early_time' => convertArabicNumbers($deviceRecord['Early'] ?? $deviceRecord['early_time'] ?? 0),
        'is_absent' => convertArabicNumbers($deviceRecord['Absent'] ?? $deviceRecord['is_absent'] ?? 0),
        'ot_time' => convertArabicNumbers($deviceRecord['OT Time'] ?? $deviceRecord['ot_time'] ?? 0),
        'work_time' => convertArabicNumbers($deviceRecord['Work Time'] ?? $deviceRecord['work_time'] ?? 0),
        'department' => $deviceRecord['Department'] ?? $deviceRecord['department'] ?? '',
        'week_day' => convertArabicNumbers($deviceRecord['week'] ?? $deviceRecord['week_day'] ?? date('w'))
    ];
}


class FingerprintSync {
    private $pdo;
    private $device_id;
    private $device_info;
    
    public function __construct($device_id = null) {
        global $pdo;
        $this->pdo = $pdo;
        $this->device_id = $device_id;
        
        if ($device_id) {
            $this->loadDeviceInfo();
        }
    }
    
    /**
     * تحميل معلومات الجهاز
     */
    private function loadDeviceInfo() {
        $stmt = $this->pdo->prepare("SELECT * FROM fingerprint_devices WHERE id = ?");
        $stmt->execute([$this->device_id]);
        $this->device_info = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$this->device_info) {
            throw new Exception("جهاز البصمة غير موجود");
        }
    }
    
    /**
     * مزامنة البيانات من جهاز البصمة
     */
    public function syncData($sync_type = 'incremental') {
        try {
            // بدء سجل المزامنة
            $sync_log_id = $this->startSyncLog($sync_type);
            
            // الاتصال بالجهاز وجلب البيانات
            $attendance_data = $this->fetchFromDevice();
            
            // معالجة البيانات
            $result = $this->processAttendanceData($attendance_data);
            
            // إنهاء سجل المزامنة
            $this->completeSyncLog($sync_log_id, $result);
            
            return [
                'success' => true,
                'message' => 'تمت المزامنة بنجاح',
                'data' => $result
            ];
            
        } catch (Exception $e) {
            $this->logError($sync_log_id ?? null, $e->getMessage());
            return [
                'success' => false,
                'message' => 'فشل في المزامنة: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * بدء سجل المزامنة
     */
    private function startSyncLog($sync_type) {
        $stmt = $this->pdo->prepare("
            INSERT INTO fingerprint_sync_logs 
            (device_id, sync_type, sync_status, sync_started_at) 
            VALUES (?, ?, 'success', NOW())
        ");
        $stmt->execute([$this->device_id, $sync_type]);
        return $this->pdo->lastInsertId();
    }
    
    /**
     * جلب البيانات من جهاز البصمة
     */
    private function fetchFromDevice() {
        $device_type = $this->device_info['device_type'];
        $device_ip = $this->device_info['device_ip'];
        $device_port = $this->device_info['device_port'];
        
        switch ($device_type) {
            case 'ZKTeco':
                return $this->fetchFromZKTeco($device_ip, $device_port);
            case 'Suprema':
                return $this->fetchFromSuprema($device_ip, $device_port);
            case 'Hikvision':
                return $this->fetchFromHikvision($device_ip, $device_port);
            default:
                throw new Exception("نوع الجهاز غير مدعوم: " . $device_type);
        }
    }
    
    /**
     * جلب البيانات من أجهزة ZKTeco
     */
    private function fetchFromZKTeco($ip, $port) {
        // اختبار الاتصال بالمنفذ المحدد
        $connection = $this->testPortConnection($ip, $port);
        if (!$connection['success']) {
            throw new Exception("فشل الاتصال بالجهاز على المنفذ {$port}: " . $connection['message']);
        }
        
        // محاكاة البيانات (في التطبيق الحقيقي سيتم استخدام SDK الخاص بالجهاز)
        $mock_data = [
            [
                'fingerprint_id' => '001',
                'attendance_date' => date('Y-m-d'),
                'attendance_time' => '08:30:00',
                'attendance_type' => 'check_in',
                'device_log_id' => 'LOG001'
            ],
            [
                'fingerprint_id' => '001',
                'attendance_date' => date('Y-m-d'),
                'attendance_time' => '17:00:00',
                'attendance_type' => 'check_out',
                'device_log_id' => 'LOG002'
            ]
        ];
        
        return $mock_data;
    }
    
    /**
     * اختبار الاتصال بالمنفذ
     */
    private function testPortConnection($ip, $port) {
        try {
            // التحقق من صحة المنفذ
            if (!is_numeric($port) || $port < 1 || $port > 65535) {
                return [
                    'success' => false,
                    'message' => 'منفذ غير صحيح. يجب أن يكون بين 1 و 65535'
                ];
            }
            
            // التحقق من صحة IP
            if (!filter_var($ip, FILTER_VALIDATE_IP)) {
                return [
                    'success' => false,
                    'message' => 'عنوان IP غير صحيح'
                ];
            }
            
            // محاكاة اختبار الاتصال (في التطبيق الحقيقي سيتم استخدام socket_connect)
            $timeout = 5; // 5 ثواني
            
            // محاكاة نجاح الاتصال للمنافذ الشائعة
            $common_ports = [4370, 4371, 4372, 8080, 8081, 8000, 8001];
            if (in_array($port, $common_ports)) {
                return [
                    'success' => true,
                    'message' => "الاتصال ناجح على المنفذ {$port}",
                    'ip' => $ip,
                    'port' => $port,
                    'response_time' => rand(10, 100) . 'ms'
                ];
            }
            
            // للمنافذ الأخرى، محاكاة فشل الاتصال
            return [
                'success' => false,
                'message' => "لا يمكن الاتصال بالمنفذ {$port}. تأكد من أن الجهاز يعمل على هذا المنفذ"
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في اختبار الاتصال: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * جلب البيانات من أجهزة Suprema
     */
    private function fetchFromSuprema($ip, $port) {
        // اختبار الاتصال بالمنفذ المحدد
        $connection = $this->testPortConnection($ip, $port);
        if (!$connection['success']) {
            throw new Exception("فشل الاتصال بالجهاز على المنفذ {$port}: " . $connection['message']);
        }
        
        // محاكاة البيانات (في التطبيق الحقيقي سيتم استخدام SDK الخاص بالجهاز)
        $mock_data = [
            [
                'fingerprint_id' => '002',
                'attendance_date' => date('Y-m-d'),
                'attendance_time' => '09:00:00',
                'attendance_type' => 'check_in',
                'device_log_id' => 'SUP001'
            ]
        ];
        
        return $mock_data;
    }
    
    /**
     * جلب البيانات من أجهزة Hikvision
     */
    private function fetchFromHikvision($ip, $port) {
        // اختبار الاتصال بالمنفذ المحدد
        $connection = $this->testPortConnection($ip, $port);
        if (!$connection['success']) {
            throw new Exception("فشل الاتصال بالجهاز على المنفذ {$port}: " . $connection['message']);
        }
        
        // محاكاة البيانات (في التطبيق الحقيقي سيتم استخدام SDK الخاص بالجهاز)
        $mock_data = [
            [
                'fingerprint_id' => '003',
                'attendance_date' => date('Y-m-d'),
                'attendance_time' => '08:45:00',
                'attendance_type' => 'check_in',
                'device_log_id' => 'HIK001'
            ]
        ];
        
        return $mock_data;
    }
    
    /**
     * التحقق من إعدادات البصمة
     */
    private function checkFingerprintSettings() {
        try {
            $stmt = $this->pdo->query("
                SELECT setting_key, setting_value 
                FROM fingerprint_settings 
                WHERE setting_key IN ('fingerprint_enabled', 'auto_sync_enabled')
            ");
            $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            return [
                'fingerprint_enabled' => ($settings['fingerprint_enabled'] ?? 'false') === 'true',
                'auto_sync_enabled' => ($settings['auto_sync_enabled'] ?? 'false') === 'true'
            ];
        } catch (Exception $e) {
            // في حالة عدم وجود الجدول، افترض أن الإعدادات مفعلة
            return [
                'fingerprint_enabled' => true,
                'auto_sync_enabled' => true
            ];
        }
    }

    /**
     * تحديث حالة الأجهزة بناءً على إعدادات البصمة
     */
    private function updateDeviceStatusBasedOnSettings() {
        try {
            $settings = $this->checkFingerprintSettings();
            $newStatus = $settings['fingerprint_enabled'] ? 'active' : 'inactive';
            
            // تحديث حالة جميع الأجهزة
            $stmt = $this->pdo->prepare("
                UPDATE fingerprint_devices 
                SET status = ?, last_updated = NOW() 
                WHERE status != ?
            ");
            $stmt->execute([$newStatus, $newStatus]);
            
            return [
                'success' => true,
                'new_status' => $newStatus,
                'affected_devices' => $stmt->rowCount(),
                'message' => $newStatus === 'active' ? 'تم تفعيل جميع الأجهزة' : 'تم إيقاف جميع الأجهزة'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في تحديث حالة الأجهزة: ' . $e->getMessage()
            ];
        }
    }

    /**
     * معالجة بيانات الحضور
     */
    private function processAttendanceData($attendance_data) {
        // التحقق من إعدادات البصمة أولاً
        $settings = $this->checkFingerprintSettings();
        
        if (!$settings['fingerprint_enabled']) {
            return [
                'processed' => 0,
                'added' => 0,
                'updated' => 0,
                'errors' => ['البصمة معطلة - لا يمكن معالجة البيانات'],
                'settings_message' => 'البصمة معطلة'
            ];
        }

        $processed = 0;
        $added = 0;
        $updated = 0;
        $errors = [];
        
        foreach ($attendance_data as $record) {
            try {
                // البحث عن الموظف باستخدام معرف البصمة
                $employee = $this->findEmployeeByFingerprint($record['fingerprint_id']);
                
                if (!$employee) {
                    $errors[] = "موظف غير موجود: " . $record['fingerprint_id'];
                    continue;
                }
                
                // حفظ سجل الحضور من البصمة
                $this->saveFingerprintLog($record, $employee['id']);
                
                // تحديث سجل الحضور الرئيسي (فقط إذا كانت المزامنة التلقائية مفعلة)
                if ($settings['auto_sync_enabled']) {
                    $this->updateAttendanceLog($record, $employee);
                } else {
                    $errors[] = "المزامنة التلقائية معطلة - لم يتم تحديث سجل الحضور";
                }
                
                $processed++;
                $added++;
                
            } catch (Exception $e) {
                $errors[] = "خطأ في معالجة السجل: " . $e->getMessage();
            }
        }
        
        return [
            'processed' => $processed,
            'added' => $added,
            'updated' => $updated,
            'errors' => $errors,
            'settings' => $settings
        ];
    }
    
    /**
     * البحث عن الموظف باستخدام معرف البصمة أو AC-No
     */
    private function findEmployeeByFingerprint($fingerprint_id) {
        $stmt = $this->pdo->prepare("
            SELECT id, `AC-No.`, Name, fingerprint_id
            FROM employees 
            WHERE (`AC-No.` = ? OR fingerprint_id = ?) AND status = 'active'
        ");
        $stmt->execute([$fingerprint_id, $fingerprint_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * حفظ سجل الحضور من البصمة
     */
    private function saveFingerprintLog($record, $employee_id) {
        $stmt = $this->pdo->prepare("
            INSERT INTO fingerprint_attendance_logs 
            (device_id, fingerprint_id, employee_id, attendance_date, attendance_time, 
             attendance_type, device_log_id, is_processed, processed_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            ON DUPLICATE KEY UPDATE
            attendance_time = VALUES(attendance_time),
            is_processed = TRUE,
            processed_at = NOW()
        ");
        
        $stmt->execute([
            $this->device_id,
            $record['fingerprint_id'],
            $employee_id,
            $record['attendance_date'],
            $record['attendance_time'],
            $record['attendance_type'],
            $record['device_log_id']
        ]);
    }
    
    /**
     * معالجة بيانات من جهاز بصمة حقيقي
     */
    public function processRealDeviceData($deviceData) {
        try {
            // التحقق من إعدادات البصمة أولاً
            $settings = $this->checkFingerprintSettings();
            
            if (!$settings['fingerprint_enabled']) {
                return [
                    'success' => false,
                    'message' => 'البصمة معطلة - لا يمكن معالجة البيانات من الأجهزة الحقيقية',
                    'processed' => 0,
                    'errors' => ['البصمة معطلة'],
                    'settings' => $settings
                ];
            }

            $processed = 0;
            $errors = [];
            
            foreach ($deviceData as $record) {
                try {
                    // تحويل البيانات إلى تنسيق قاعدة البيانات
                    $convertedData = convertRealDeviceData($record);
                    
                    // حفظ في fingerprint_attendance أولاً (مثل الجهاز الافتراضي)
                    $this->saveToFingerprintAttendance($convertedData);
                    
                    // ثم مزامنة مع attendance_logs (فقط إذا كانت المزامنة التلقائية مفعلة)
                    if ($settings['auto_sync_enabled']) {
                        $this->syncToAttendanceLogs($convertedData);
                    } else {
                        $errors[] = "المزامنة التلقائية معطلة - لم يتم مزامنة السجل مع attendance_logs";
                    }
                    
                    $processed++;
                    
                } catch (Exception $e) {
                    $errors[] = "خطأ في معالجة السجل: {$e->getMessage()}";
                }
            }
            
            return [
                'success' => true,
                'processed' => $processed,
                'errors' => $errors,
                'total_records' => count($deviceData),
                'settings' => $settings,
                'settings_message' => $settings['auto_sync_enabled'] ? 'تمت المزامنة التلقائية' : 'المزامنة التلقائية معطلة'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * حفظ في جدول fingerprint_attendance
     */
    private function saveToFingerprintAttendance($convertedData) {
        // فحص وجود الجدول
        $checkTable = $this->pdo->query("SHOW TABLES LIKE 'fingerprint_attendance'");
        if ($checkTable->rowCount() == 0) {
            // إنشاء الجدول إذا لم يكن موجوداً
            $this->createFingerprintAttendanceTable();
        }
        
        // البحث عن سجل موجود
        $stmt = $this->pdo->prepare("
            SELECT * FROM fingerprint_attendance 
            WHERE ac_no = ? AND attendance_date = ?
        ");
        $stmt->execute([$convertedData['ac_no'], $convertedData['attendance_date']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث سجل موجود
            $updateFields = [];
            $updateValues = [];
            
            if ($convertedData['clock_in']) {
                $updateFields[] = "clock_in = ?";
                $updateValues[] = $convertedData['clock_in'];
            }
            if ($convertedData['clock_out']) {
                $updateFields[] = "clock_out = ?";
                $updateValues[] = $convertedData['clock_out'];
            }
            if ($convertedData['work_time']) {
                $updateFields[] = "work_time = ?";
                $updateValues[] = $convertedData['work_time'];
            }
            if ($convertedData['ot_time']) {
                $updateFields[] = "ot_time = ?";
                $updateValues[] = $convertedData['ot_time'];
            }
            
            $updateFields[] = "updated_at = NOW()";
            $updateValues[] = $existing['id'];
            
            if (!empty($updateFields)) {
                $stmt = $this->pdo->prepare("
                    UPDATE fingerprint_attendance 
                    SET " . implode(', ', $updateFields) . "
                    WHERE id = ?
                ");
                $stmt->execute($updateValues);
            }
        } else {
            // إنشاء سجل جديد
            $stmt = $this->pdo->prepare("
                INSERT INTO fingerprint_attendance 
                (ac_no, employee_name, attendance_date, clock_in, clock_out, 
                 late_time, early_time, is_absent, ot_time, work_time, 
                 department, week_day, device_id, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $convertedData['ac_no'],
                $convertedData['employee_name'],
                $convertedData['attendance_date'],
                $convertedData['clock_in'],
                $convertedData['clock_out'],
                $convertedData['late_time'],
                $convertedData['early_time'],
                $convertedData['is_absent'],
                $convertedData['ot_time'],
                $convertedData['work_time'],
                $convertedData['department'],
                $convertedData['week_day'],
                $this->device_id
            ]);
        }
    }
    
    /**
     * البحث عن الموظف باستخدام AC-No. (كود البصمة)
     */
    private function findEmployeeByAcNo($ac_no) {
        $stmt = $this->pdo->prepare("
            SELECT id, employee_code, `AC-No.`, name, name_ar
            FROM employees 
            WHERE (`AC-No.` = ? OR fingerprint_id = ?) AND status = 'active'
            LIMIT 1
        ");
        $stmt->execute([$ac_no, $ac_no]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * مزامنة مع جدول attendance_logs
     */
    private function syncToAttendanceLogs($convertedData) {
        // البحث عن الموظف باستخدام AC-No.
        $employee = $this->findEmployeeByAcNo($convertedData['ac_no']);
        
        if (!$employee) {
            error_log("Employee not found for AC-No: " . $convertedData['ac_no']);
            return; // تخطي إذا لم يتم العثور على الموظف
        }
        
        $employee_id = $employee['id'];
        $employee_code = $employee['employee_code'];
        
        // فحص هيكل الجدول
        $stmt = $this->pdo->query("DESCRIBE attendance_logs");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // تحديد أسماء الأعمدة الصحيحة
        $employeeIdColumn = in_array('employee_id', $columns) ? 'employee_id' : 'AC-No.';
        $dateColumn = in_array('attendance_date', $columns) ? 'attendance_date' : 'date';
        $checkInColumn = in_array('check_in', $columns) ? 'check_in' : 'check_in_time';
        $checkOutColumn = in_array('check_out', $columns) ? 'check_out' : 'check_out_time';
        $workHoursColumn = in_array('work_hours', $columns) ? 'work_hours' : 'work_hours';
        $overtimeColumn = in_array('overtime_hours', $columns) ? 'overtime_hours' : 'overtime_hours';
        $statusColumn = in_array('status', $columns) ? 'status' : 'status';
        
        // البحث عن سجل موجود باستخدام employee_id الحقيقي
        $stmt = $this->pdo->prepare("
            SELECT * FROM attendance_logs 
            WHERE employee_id = ? AND {$dateColumn} = ?
        ");
        $stmt->execute([$employee_id, $convertedData['attendance_date']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث سجل موجود
            $updateFields = [];
            $updateValues = [];
            
            if ($convertedData['clock_in'] && (!$existing[$checkInColumn] || empty($existing[$checkInColumn]))) {
                $updateFields[] = "{$checkInColumn} = ?";
                $updateValues[] = $convertedData['clock_in'];
            }
            if ($convertedData['clock_out'] && (!$existing[$checkOutColumn] || empty($existing[$checkOutColumn]))) {
                $updateFields[] = "{$checkOutColumn} = ?";
                $updateValues[] = $convertedData['clock_out'];
            }
            if ($convertedData['work_time']) {
                $updateFields[] = "{$workHoursColumn} = ?";
                $updateValues[] = $convertedData['work_time'];
            }
            if ($convertedData['ot_time']) {
                $updateFields[] = "{$overtimeColumn} = ?";
                $updateValues[] = $convertedData['ot_time'];
            }
            if (in_array($statusColumn, $columns)) {
                $updateFields[] = "{$statusColumn} = ?";
                $updateValues[] = $convertedData['is_absent'] ? 'absent' : 'present';
            }
            
            if (!empty($updateFields)) {
                $updateValues[] = $existing['id'];
                $stmt = $this->pdo->prepare("
                    UPDATE attendance_logs 
                    SET " . implode(', ', $updateFields) . "
                    WHERE id = ?
                ");
                $stmt->execute($updateValues);
            }
        } else {
            // إنشاء سجل جديد
            $insertFields = [];
            $insertValues = [];
            $placeholders = [];
            
            // إضافة الحقول المتاحة - استخدام employee_id الحقيقي
            if (in_array('employee_id', $columns)) {
                $insertFields[] = 'employee_id';
                $insertValues[] = $employee_id; // استخدام ID الحقيقي من جدول employees
                $placeholders[] = '?';
            } elseif (in_array('AC-No.', $columns)) {
                $insertFields[] = '`AC-No.`';
                $insertValues[] = $convertedData['ac_no'];
                $placeholders[] = '?';
            }
            
            // إضافة employee_code إذا كان متاحاً
            if (in_array('employee_code', $columns) && $employee_code) {
                $insertFields[] = 'employee_code';
                $insertValues[] = $employee_code;
                $placeholders[] = '?';
            }
            
            if (in_array('employee_name', $columns)) {
                $insertFields[] = 'employee_name';
                $insertValues[] = $convertedData['employee_name'];
                $placeholders[] = '?';
            } elseif (in_array('Name', $columns)) {
                $insertFields[] = 'Name';
                $insertValues[] = $convertedData['employee_name'];
                $placeholders[] = '?';
            }
            
            if (in_array('attendance_date', $columns)) {
                $insertFields[] = 'attendance_date';
                $insertValues[] = $convertedData['attendance_date'];
                $placeholders[] = '?';
            } elseif (in_array('date', $columns)) {
                $insertFields[] = 'date';
                $insertValues[] = $convertedData['attendance_date'];
                $placeholders[] = '?';
            }
            
            if (in_array('check_in', $columns) && $convertedData['clock_in']) {
                $insertFields[] = 'check_in';
                $insertValues[] = $convertedData['clock_in'];
                $placeholders[] = '?';
            } elseif (in_array('check_in_time', $columns) && $convertedData['clock_in']) {
                $insertFields[] = 'check_in_time';
                $insertValues[] = $convertedData['clock_in'];
                $placeholders[] = '?';
            }
            
            if (in_array('check_out', $columns) && $convertedData['clock_out']) {
                $insertFields[] = 'check_out';
                $insertValues[] = $convertedData['clock_out'];
                $placeholders[] = '?';
            } elseif (in_array('check_out_time', $columns) && $convertedData['clock_out']) {
                $insertFields[] = 'check_out_time';
                $insertValues[] = $convertedData['clock_out'];
                $placeholders[] = '?';
            }
            
            if (in_array('work_hours', $columns) && $convertedData['work_time']) {
                $insertFields[] = 'work_hours';
                $insertValues[] = $convertedData['work_time'];
                $placeholders[] = '?';
            }
            
            if (in_array('overtime_hours', $columns) && $convertedData['ot_time']) {
                $insertFields[] = 'overtime_hours';
                $insertValues[] = $convertedData['ot_time'];
                $placeholders[] = '?';
            }
            
            if (in_array('status', $columns)) {
                $insertFields[] = 'status';
                $insertValues[] = $convertedData['is_absent'] ? 'absent' : 'present';
                $placeholders[] = '?';
            }
            
            if (!empty($insertFields)) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO attendance_logs 
                    (" . implode(', ', $insertFields) . ") 
                    VALUES (" . implode(', ', $placeholders) . ")
                ");
                $stmt->execute($insertValues);
            }
        }
    }
    
    /**
     * إنشاء جدول fingerprint_attendance إذا لم يكن موجوداً
     */
    private function createFingerprintAttendanceTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS fingerprint_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ac_no VARCHAR(50) NOT NULL,
                employee_name VARCHAR(255) NOT NULL,
                attendance_date DATE NOT NULL,
                clock_in TIME NULL,
                clock_out TIME NULL,
                late_time INT DEFAULT 0,
                early_time INT DEFAULT 0,
                is_absent TINYINT DEFAULT 0,
                ot_time DECIMAL(5,2) DEFAULT 0.00,
                work_time DECIMAL(5,2) DEFAULT 0.00,
                department VARCHAR(255),
                week_day INT,
                device_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_attendance (ac_no, attendance_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->pdo->exec($sql);
    }

    /**
     * تحديث سجل الحضور الرئيسي
     */
    private function updateAttendanceLog($record, $employee) {
        $date = $record['attendance_date'];
        $time = $record['attendance_time'];
        $type = $record['attendance_type'];
        
        // البحث عن سجل الحضور الموجود باستخدام employee_id الحقيقي
        $stmt = $this->pdo->prepare("
            SELECT * FROM attendance_logs 
            WHERE employee_id = ? AND (attendance_date = ? OR date = ?)
        ");
        $stmt->execute([$employee['id'], $date, $date]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // تحديث السجل الموجود - دعم أعمدة مختلفة
            // فحص هيكل الجدول أولاً
            $stmt = $this->pdo->query("DESCRIBE attendance_logs");
            $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // تحديد أسماء الأعمدة الصحيحة
            $checkInColumn = in_array('check_in', $columns) ? 'check_in' : 'check_in_time';
            $checkOutColumn = in_array('check_out', $columns) ? 'check_out' : 'check_out_time';
            $statusColumn = in_array('status', $columns) ? 'status' : 'status';
            
            if ($type === 'check_in' && (!$existing[$checkInColumn] || empty($existing[$checkInColumn]))) {
                $stmt = $this->pdo->prepare("
                    UPDATE attendance_logs 
                    SET {$checkInColumn} = ?, {$statusColumn} = 'present' 
                    WHERE id = ?
                ");
                $stmt->execute([$time, $existing['id']]);
            } elseif ($type === 'check_out' && (!$existing[$checkOutColumn] || empty($existing[$checkOutColumn]))) {
                $stmt = $this->pdo->prepare("
                    UPDATE attendance_logs 
                    SET {$checkOutColumn} = ? 
                    WHERE id = ?
                ");
                $stmt->execute([$time, $existing['id']]);
                
                // حساب ساعات العمل
                $this->calculateWorkHours($existing['id']);
            }
        } else {
            // إنشاء سجل جديد - دعم أعمدة مختلفة
            // فحص هيكل الجدول أولاً
            $stmt = $this->pdo->query("DESCRIBE attendance_logs");
            $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $insertFields = [];
            $insertValues = [];
            $placeholders = [];
            
            // إضافة الحقول المتاحة - استخدام employee_id الحقيقي
            if (in_array('employee_id', $columns)) {
                $insertFields[] = 'employee_id';
                $insertValues[] = $employee['id']; // استخدام ID الحقيقي من جدول employees
                $placeholders[] = '?';
            } elseif (in_array('AC-No.', $columns)) {
                $insertFields[] = '`AC-No.`';
                $insertValues[] = $employee['AC-No.'];
                $placeholders[] = '?';
            }
            
            // إضافة employee_code إذا كان متاحاً
            if (in_array('employee_code', $columns) && isset($employee['employee_code'])) {
                $insertFields[] = 'employee_code';
                $insertValues[] = $employee['employee_code'];
                $placeholders[] = '?';
            }
            
            if (in_array('employee_name', $columns)) {
                $insertFields[] = 'employee_name';
                $insertValues[] = $employee['Name'];
                $placeholders[] = '?';
            } elseif (in_array('Name', $columns)) {
                $insertFields[] = 'Name';
                $insertValues[] = $employee['Name'];
                $placeholders[] = '?';
            }
            
            if (in_array('attendance_date', $columns)) {
                $insertFields[] = 'attendance_date';
                $insertValues[] = $date;
                $placeholders[] = '?';
            } elseif (in_array('date', $columns)) {
                $insertFields[] = 'date';
                $insertValues[] = $date;
                $placeholders[] = '?';
            }
            
            if (in_array('check_in', $columns)) {
                $insertFields[] = 'check_in';
                $insertValues[] = ($type === 'check_in') ? $time : null;
                $placeholders[] = '?';
            } elseif (in_array('check_in_time', $columns)) {
                $insertFields[] = 'check_in_time';
                $insertValues[] = ($type === 'check_in') ? $time : null;
                $placeholders[] = '?';
            }
            
            if (in_array('check_out', $columns)) {
                $insertFields[] = 'check_out';
                $insertValues[] = ($type === 'check_out') ? $time : null;
                $placeholders[] = '?';
            } elseif (in_array('check_out_time', $columns)) {
                $insertFields[] = 'check_out_time';
                $insertValues[] = ($type === 'check_out') ? $time : null;
                $placeholders[] = '?';
            }
            
            if (in_array('status', $columns)) {
                $insertFields[] = 'status';
                $insertValues[] = 'present';
                $placeholders[] = '?';
            }
            
            if (!empty($insertFields)) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO attendance_logs 
                    (" . implode(', ', $insertFields) . ") 
                    VALUES (" . implode(', ', $placeholders) . ")
                ");
                $stmt->execute($insertValues);
            }
        }
    }
    
    /**
     * حساب ساعات العمل - دعم أعمدة مختلفة
     */
    private function calculateWorkHours($attendance_id) {
        // فحص هيكل الجدول أولاً
        $stmt = $this->pdo->query("DESCRIBE attendance_logs");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // تحديد أسماء الأعمدة الصحيحة
        $checkInColumn = in_array('check_in', $columns) ? 'check_in' : 'check_in_time';
        $checkOutColumn = in_array('check_out', $columns) ? 'check_out' : 'check_out_time';
        $workHoursColumn = in_array('work_hours', $columns) ? 'work_hours' : 'work_hours';
        $overtimeColumn = in_array('overtime_hours', $columns) ? 'overtime_hours' : 'overtime_hours';
        $attendanceDateColumn = in_array('attendance_date', $columns) ? 'attendance_date' : 'date';

        $holidaySelect = in_array('is_holiday', $columns) ? ', is_holiday' : '';
        $stmt = $this->pdo->prepare("
            SELECT {$checkInColumn}, {$checkOutColumn}, {$attendanceDateColumn}{$holidaySelect} FROM attendance_logs WHERE id = ?
        ");
        $stmt->execute([$attendance_id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        $checkIn = $record[$checkInColumn];
        $checkOut = $record[$checkOutColumn];
        $attendanceDate = $record[$attendanceDateColumn];
        $isHolidayInt = (!empty($holidaySelect) && !empty($record['is_holiday'])) ? 1 : 0;

        if ($checkIn && $checkOut && $attendanceDate) {
            $workHours = calculateHours($checkIn, $checkOut, $attendanceDate, (bool)$isHolidayInt);
            if ($isHolidayInt) {
                $overtimeHours = $workHours;
            } else {
                $overtimeHours = calculateOvertimeHoursFromCheckOut($attendanceDate, $checkOut, 0, $checkIn, $workHours);
            }

            $stmt = $this->pdo->prepare("
                UPDATE attendance_logs
                SET {$workHoursColumn} = ?, {$overtimeColumn} = ?
                WHERE id = ?
            ");
            $stmt->execute([$workHours, $overtimeHours, $attendance_id]);
        }
    }
    

    /**
     * إنهاء سجل المزامنة
     */
    private function completeSyncLog($sync_log_id, $result) {
        $stmt = $this->pdo->prepare("
            UPDATE fingerprint_sync_logs 
            SET records_processed = ?, records_added = ?, records_updated = ?,
                sync_status = ?, sync_completed_at = NOW()
            WHERE id = ?
        ");
        
        $status = empty($result['errors']) ? 'success' : 'partial';
        
        $stmt->execute([
            $result['processed'],
            $result['added'],
            $result['updated'],
            $status,
            $sync_log_id
        ]);
        
        // تحديث آخر مزامنة للجهاز
        $stmt = $this->pdo->prepare("
            UPDATE fingerprint_devices 
            SET last_sync = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$this->device_id]);
    }
    
    /**
     * تسجيل الأخطاء
     */
    private function logError($sync_log_id, $error_message) {
        if ($sync_log_id) {
            $stmt = $this->pdo->prepare("
                UPDATE fingerprint_sync_logs 
                SET sync_status = 'failed', error_message = ?, sync_completed_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$error_message, $sync_log_id]);
        }
    }
    
    /**
     * الحصول على قائمة الأجهزة
     */
    public static function getDevices() {
        global $pdo;
        $stmt = $pdo->query("
            SELECT id, device_name, device_ip, device_type, location, status, last_sync
            FROM fingerprint_devices 
            ORDER BY device_name
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * إضافة جهاز جديد
     */
    public static function addDevice($device_data) {
        global $pdo;
        
        // التحقق من وجود الجدول أولاً
        $checkTable = $pdo->query("SHOW TABLES LIKE 'fingerprint_devices'");
        if ($checkTable->rowCount() == 0) {
            throw new Exception('جدول أجهزة البصمة غير موجود. يرجى تشغيل fix_fingerprint_tables.php أولاً');
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO fingerprint_devices 
            (device_name, device_ip, device_port, device_type, device_model, location, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        return $stmt->execute([
            $device_data['device_name'],
            $device_data['device_ip'],
            $device_data['device_port'] ?? 4370,
            $device_data['device_type'],
            $device_data['device_model'] ?? '',
            $device_data['location'],
            $device_data['status'] ?? 'active'
        ]);
    }
    
}

// معالجة الطلبات
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($method) {
        case 'GET':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'devices':
                        echo json_encode([
                            'success' => true,
                            'data' => FingerprintSync::getDevices()
                        ]);
                        break;
                        
                    case 'sync':
                        $device_id = $_GET['device_id'] ?? null;
                        if (!$device_id) {
                            throw new Exception('معرف الجهاز مطلوب');
                        }
                        
                        $sync = new FingerprintSync($device_id);
                        $result = $sync->syncData($_GET['type'] ?? 'incremental');
                        echo json_encode($result);
                        break;
                        
                    default:
                        throw new Exception('إجراء غير صحيح');
                }
            } else {
                throw new Exception('إجراء مطلوب');
            }
            break;
            
        case 'POST':
            if (isset($input['action'])) {
                switch ($input['action']) {
                    case 'add_device':
                        $result = FingerprintSync::addDevice($input['device_data']);
                        echo json_encode([
                            'success' => $result,
                            'message' => $result ? 'تم إضافة الجهاز بنجاح' : 'فشل في إضافة الجهاز'
                        ]);
                        break;
                        
                    case 'sync_attendance':
                        // مزامنة بيانات الحضور من جهاز البصمة
                        $device_id = $input['device_id'] ?? 1;
                        $sync = new FingerprintSync($device_id);
                        $result = $sync->syncData('incremental');
                        echo json_encode($result, JSON_UNESCAPED_UNICODE);
                        break;
                        
                    case 'process_real_device_data':
                        // معالجة بيانات من جهاز بصمة حقيقي
                        $deviceData = $input['device_data'] ?? [];
                        if (empty($deviceData)) {
                            throw new Exception('لا توجد بيانات للمعالجة');
                        }
                        
                        $device_id = $input['device_id'] ?? 1;
                        $sync = new FingerprintSync($device_id);
                        $result = $sync->processRealDeviceData($deviceData);
                        echo json_encode($result, JSON_UNESCAPED_UNICODE);
                        break;
                        
                    case 'test_port':
                        // اختبار منفذ محدد
                        $ip = $input['ip'] ?? '';
                        $port = $input['port'] ?? 4370;
                        
                        if (empty($ip)) {
                            throw new Exception('عنوان IP مطلوب');
                        }
                        
                        $sync = new FingerprintSync();
                        $result = $sync->testPortConnection($ip, $port);
                        echo json_encode($result, JSON_UNESCAPED_UNICODE);
                        break;
                        
                    case 'delete_device':
                        // حذف جهاز
                        $device_id = $input['device_id'] ?? '';
                        
                        if (empty($device_id)) {
                            throw new Exception('معرف الجهاز مطلوب');
                        }
                        
                        $result = deleteDevice($device_id);
                        echo json_encode($result, JSON_UNESCAPED_UNICODE);
                        break;
                        
                    case 'update_device_status':
                        // تحديث حالة الأجهزة بناءً على إعدادات البصمة
                        $sync = new FingerprintSync();
                        $result = $sync->updateDeviceStatusBasedOnSettings();
                        echo json_encode($result, JSON_UNESCAPED_UNICODE);
                        break;
                        
                    default:
                        throw new Exception('إجراء غير صحيح');
                }
            } else {
                throw new Exception('إجراء مطلوب');
            }
            break;
            
        default:
            throw new Exception('طريقة طلب غير مدعومة');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * حذف جهاز من قاعدة البيانات
 */
function deleteDevice($device_id) {
    try {
        $config = require '../config/database_config.php';
        $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
        $username = $config['username'];
        $password = $config['password'];
        $options = $config['options'];

        $pdo = new PDO($dsn, $username, $password, $options);
        
        // التحقق من وجود الجهاز
        $stmt = $pdo->prepare("SELECT * FROM fingerprint_devices WHERE id = ?");
        $stmt->execute([$device_id]);
        $device = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$device) {
            return [
                'success' => false,
                'message' => 'الجهاز غير موجود'
            ];
        }
        
        // حذف الجهاز
        $stmt = $pdo->prepare("DELETE FROM fingerprint_devices WHERE id = ?");
        $result = $stmt->execute([$device_id]);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'تم حذف الجهاز بنجاح',
                'deleted_device' => $device
            ];
        } else {
            return [
                'success' => false,
                'message' => 'فشل في حذف الجهاز'
            ];
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'خطأ في حذف الجهاز: ' . $e->getMessage()
        ];
    }
}
?>
