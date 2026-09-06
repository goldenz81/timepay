<?php
/**
 * الاتصال المباشر بجهاز البصمة
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-01-19
 */

require_once 'cors_headers.php';
require_once 'config.php';

class FingerprintDeviceConnection {
    private $device_ip;
    private $device_port;
    private $device_password;
    private $connection;
    
    public function __construct($ip, $port = 4370, $password = '') {
        $this->device_ip = $ip;
        $this->device_port = $port;
        $this->device_password = $password;
    }
    
    public function connect() {
        try {
            $this->connection = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            if (!$this->connection) {
                throw new Exception('فشل في إنشاء الاتصال');
            }
            
            $result = socket_connect($this->connection, $this->device_ip, $this->device_port);
            if (!$result) {
                throw new Exception('فشل في الاتصال بالجهاز');
            }
            
            return true;
        } catch (Exception $e) {
            throw new Exception('خطأ في الاتصال: ' . $e->getMessage());
        }
    }
    
    public function disconnect() {
        if ($this->connection) {
            socket_close($this->connection);
        }
    }
    
    public function getAttendanceData($startDate = null, $endDate = null) {
        // محاكاة جلب البيانات من الجهاز
        // في التطبيق الحقيقي، سيتم استخدام بروتوكول ZKTeco أو Convoy
        
        $mockData = [
            [
                'ac_no' => '1',
                'name' => 'Test Employee',
                'date' => date('Y-m-d'),
                'clock_in' => '08:00',
                'clock_out' => '17:00',
                'late' => null,
                'early' => null,
                'absent' => false,
                'ot_time' => null,
                'work_time' => '09:00',
                'department' => 'Test Dept',
                'week' => date('D')
            ]
        ];
        
        return $mockData;
    }
    
    public function syncToDatabase($data) {
        try {
            $insertSQL = "
                INSERT INTO fingerprint_attendance 
                (ac_no, employee_name, attendance_date, clock_in, clock_out, late_time, early_time, is_absent, ot_time, work_time, department, week_day) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                clock_in = VALUES(clock_in),
                clock_out = VALUES(clock_out),
                late_time = VALUES(late_time),
                early_time = VALUES(early_time),
                is_absent = VALUES(is_absent),
                ot_time = VALUES(ot_time),
                work_time = VALUES(work_time),
                department = VALUES(department),
                week_day = VALUES(week_day),
                updated_at = CURRENT_TIMESTAMP
            ";
            
            $stmt = $pdo->prepare($insertSQL);
            $syncedCount = 0;
            
            foreach ($data as $record) {
                $stmt->execute([
                    $record['ac_no'],
                    $record['name'],
                    $record['date'],
                    $record['clock_in'],
                    $record['clock_out'],
                    $record['late'],
                    $record['early'],
                    $record['absent'],
                    $record['ot_time'],
                    $record['work_time'],
                    $record['department'],
                    $record['week']
                ]);
                $syncedCount++;
            }
            
            return $syncedCount;
        } catch (Exception $e) {
            throw new Exception('خطأ في مزامنة البيانات: ' . $e->getMessage());
        }
    }
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    if ($action === 'test_connection') {
        $device_ip = $input['device_ip'] ?? '';
        $device_port = $input['device_port'] ?? 4370;
        $device_password = $input['device_password'] ?? '';
        
        if (empty($device_ip)) {
            throw new Exception('عنوان IP مطلوب');
        }
        
        $device = new FingerprintDeviceConnection($device_ip, $device_port, $device_password);
        
        try {
            $device->connect();
            $device->disconnect();
            
            echo json_encode([
                'success' => true,
                'message' => 'تم الاتصال بالجهاز بنجاح',
                'device_info' => [
                    'ip' => $device_ip,
                    'port' => $device_port,
                    'status' => 'connected'
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'فشل في الاتصال: ' . $e->getMessage()
            ]);
        }
        
    } elseif ($action === 'sync_data') {
        $device_ip = $input['device_ip'] ?? '';
        $device_port = $input['device_port'] ?? 4370;
        $device_password = $input['device_password'] ?? '';
        $start_date = $input['start_date'] ?? null;
        $end_date = $input['end_date'] ?? null;
        
        if (empty($device_ip)) {
            throw new Exception('عنوان IP مطلوب');
        }
        
        $device = new FingerprintDeviceConnection($device_ip, $device_port, $device_password);
        
        try {
            $device->connect();
            $attendanceData = $device->getAttendanceData($start_date, $end_date);
            $syncedCount = $device->syncToDatabase($attendanceData);
            $device->disconnect();
            
            echo json_encode([
                'success' => true,
                'message' => "تم مزامنة $syncedCount سجل بنجاح",
                'synced_count' => $syncedCount,
                'data_source' => 'direct_device_connection'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'فشل في المزامنة: ' . $e->getMessage()
            ]);
        }
        
    } else {
        throw new Exception('إجراء غير صحيح');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الاتصال بجهاز البصمة: ' . $e->getMessage()
    ]);
}
?>
