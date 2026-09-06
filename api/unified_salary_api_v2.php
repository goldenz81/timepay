<?php
// منع إخراج أخطاء PHP كـ HTML حتى لا يكسر استجابة JSON
@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include error log configuration
require_once __DIR__ . '/../config/error_log_config.php';

// Include database configuration
try {
    require_once __DIR__ . '/../models/Database.php';
    require_once __DIR__ . '/dynamic_system/DynamicFormulaEngine.php';
    require_once __DIR__ . '/advance_fifo_helpers.php';
    require_once __DIR__ . '/feature_flags.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحميل إعدادات قاعدة البيانات',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

class UnifiedSalaryAPIv2 {
    private $conn;
    private $formulaEngine;
    private $logFile;
    
    /**
     * دالة مساعدة لكتابة السجلات في ملف داخل المشروع
     */
    private function writeLog($message, $level = 'INFO') {
        try {
            // تحديد مسار ملف السجل في root المشروع
            $logDir = __DIR__ . '/../logs';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            $this->logFile = $logDir . '/salary_calculations.log';
            
            // تنسيق الرسالة مع التاريخ والوقت
            $timestamp = date('Y-m-d H:i:s');
            $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
            
            // كتابة في الملف
            file_put_contents($this->logFile, $logMessage, FILE_APPEND | LOCK_EX);
            
            // أيضاً كتابة في error_log العادي للتوافق
            error_log($message);
        } catch (Exception $e) {
            // في حالة فشل الكتابة، استخدم error_log فقط
            error_log("Failed to write to log file: " . $e->getMessage());
            error_log($message);
        }
    }
    
    public function __construct() {
        try {
            $this->conn = Database::connect();
            if ($this->conn) {
                $this->formulaEngine = new DynamicFormulaEngine($this->conn);
            }
        } catch (Exception $e) {
            // إذا فشل الاتصال بقاعدة البيانات، سنستخدم البيانات التجريبية
            $this->conn = null;
            $this->formulaEngine = null;
        }
    }
    
    public function handleRequest($input = null) {
        try {
            // إذا تم تمرير البيانات مباشرة، استخدمها
            if ($input === null) {
                // في CLI، استخدم stdin، وإلا استخدم php://input
                if (php_sapi_name() === 'cli') {
                    $input = json_decode(stream_get_contents(STDIN), true) ?: [];
                } else {
                    $input = json_decode(file_get_contents('php://input'), true) ?: [];
                }
            }
            
            $action = $input['action'] ?? $_GET['action'] ?? '';
            
            // Debug logging
            error_log('API Debug - Action: ' . $action);
            error_log('API Debug - Input: ' . json_encode($input));
            
            switch ($action) {
                case 'get_weekly_salary_data':
                    error_log('API Debug - Calling getWeeklySalaryData');
                    return $this->getWeeklySalaryData($input);
                case 'get_monthly_salary_data':
                    return $this->getMonthlySalaryData($input);
                case 'upsert_weekly_attendance_bonus':
                    return $this->upsertWeeklyAttendanceBonus($input);
                case 'update_employee_special_bonus':
                    return $this->updateEmployeeSpecialBonus($input);
                case 'upsert_monthly_special_bonus':
                    return $this->upsertMonthlySpecialBonus($input);
                case 'update_employee_transport_allowance':
                    return $this->updateEmployeeTransportAllowance($input);
                case 'update_employee_bayat_days':
                    return $this->updateEmployeeBayatDays($input);
                case 'upsert_monthly_transport_allowance':
                    return $this->upsertMonthlyTransportAllowance($input);
                case 'get_weekly_formulas':
                    return $this->getWeeklyFormulas();
                case 'get_monthly_formulas':
                    return $this->getMonthlyFormulas();
                case 'get_weekly_variables':
                    return $this->getWeeklyVariables();
                case 'get_monthly_variables':
                    return $this->getMonthlyVariables();
                case 'create_weekly_formula':
                    return $this->createWeeklyFormula($input);
                case 'create_monthly_formula':
                    return $this->createMonthlyFormula($input);
                case 'create_weekly_variable':
                    return $this->createWeeklyVariable($input);
                case 'create_monthly_variable':
                    return $this->createMonthlyVariable($input);
                case 'defer_advance_installment':
                    return $this->deferAdvanceInstallment($input);
                default:
                    return $this->errorResponse('إجراء غير معروف', 400);
            }
        } catch (Exception $e) {
            return $this->errorResponse('خطأ في الخادم: ' . $e->getMessage(), 500);
        }
    }
    
    private function getWeeklySalaryData($input) {
        error_log('getWeeklySalaryData called with: ' . json_encode($input));
        $startDate = $input['start_date'] ?? date('Y-m-d');
        $endDate = $input['end_date'] ?? date('Y-m-d');
        
        if (!$this->conn) {
            return $this->errorResponse('لا يمكن الاتصال بقاعدة البيانات', 500);
        }
        
        try {
            // جلب بيانات الموظفين الأسبوعيين من employees مع attendance_logs
            $stmt = $this->conn->prepare("
                SELECT 
                    e.id as employee_id,
                    COALESCE(NULLIF(e.name_ar, ''), e.name) as employee_name,
                    e.employee_code,
                    e.department,
                    e.cost_center,
                    e.location,
                    e.position,
                    cc.color as cost_center_color,
                    d.description as department_description,
                    e.base_salary,
                    e.discrimination_incentive_allowance,
                    e.salary_type,
                    e.is_insured,
                    COUNT(a.id) as attendance_days,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
                    AVG(CASE WHEN a.late_minutes > 0 THEN a.late_minutes ELSE 0 END) as avg_late_minutes,
                    SUM(CASE WHEN a.overtime_hours > 0 THEN a.overtime_hours ELSE 0 END) as total_overtime_hours,
                    SUM(CASE WHEN a.is_holiday = 0 AND a.overtime_hours > 0 THEN 1 ELSE 0 END) as overtime_days_normal,
                    SUM(CASE WHEN a.is_holiday = 1 AND a.overtime_hours > 0 THEN 1 ELSE 0 END) as overtime_days_holidays,
                    SUM(CASE WHEN a.is_holiday = 0 THEN a.overtime_hours ELSE 0 END) as regular_overtime_hours,
                    SUM(CASE WHEN a.is_holiday = 1 THEN a.overtime_hours ELSE 0 END) as holiday_overtime_hours,
                    SUM(a.late_hours_calculated) as late_hours_calculated,
                    SUM(a.grace_period_late_hours_calculated) as grace_period_late_hours_calculated,
                    SUM(a.early_leave_minutes) as total_early_leave_minutes,
                    SUM(a.work_hours) as total_work_hours
                FROM employees e
                LEFT JOIN attendance_logs a ON e.id = a.employee_id 
                    AND DATE(a.attendance_date) BETWEEN ? AND ?
                LEFT JOIN cost_centers cc ON e.cost_center = cc.name
                LEFT JOIN departments d ON e.department = d.name
                WHERE e.status = 'active' AND e.salary_type = 'Weekly'
                GROUP BY e.id, e.name, e.employee_code, e.department, e.cost_center, e.location, e.position, cc.color, d.description, e.base_salary, e.discrimination_incentive_allowance, e.salary_type, e.is_insured
                ORDER BY e.name
            ");
            
            $stmt->execute([$startDate, $endDate]);
            $employees = $stmt->fetchAll();
            
            // Debug: Log first result
            if (!empty($employees)) {
                error_log('First weekly salary result: ' . json_encode($employees[0]));
                // تسجيل تفصيلي للقيم المتعلقة بالساعات الإضافية
                $firstEmp = $employees[0];
                error_log("Overtime values from DB: regular_overtime_hours={$firstEmp['regular_overtime_hours']}, holiday_overtime_hours={$firstEmp['holiday_overtime_hours']}, total_overtime_hours={$firstEmp['total_overtime_hours']}");
                error_log("Early leave values from DB: total_early_leave_minutes={$firstEmp['total_early_leave_minutes']}");
            }
            
            ensureMealAllowanceEnabledVariable($this->conn);
            $mealAllowanceEnabled = isMealAllowanceEnabled(
                $this->getSystemVar('meal_allowance_enabled', '1')
            );
            
            $weeklyData = [];
            foreach ($employees as $emp) {
                // إعداد السياق للمحرك الديناميكي
                $context = [
                    'employee_id' => $emp['employee_id'],
                    'base_salary' => $emp['base_salary'],
                    'salary_type' => 'Weekly',
                    'is_insured' => isset($emp['is_insured']) ? intval($emp['is_insured']) : 0,
                    'present_days' => $emp['present_days'],
                    'absent_days' => $emp['absent_days'],
                    'late_days' => $emp['late_days'],
                    'avg_late_minutes' => $emp['avg_late_minutes'] ?? 0,
                    'total_overtime_hours' => $emp['total_overtime_hours'] ?? 0,
                    'overtime_days_normal' => $emp['overtime_days_normal'] ?? 0,
                    'overtime_days_holidays' => $emp['overtime_days_holidays'] ?? 0,
                    'regular_overtime_hours' => $emp['regular_overtime_hours'] ?? 0,
                    'holiday_overtime_hours' => $emp['holiday_overtime_hours'] ?? 0,
                    'overtime_hours_work' => $emp['regular_overtime_hours'] ?? 0,  // إضافة متغير مطلوب
                    'overtime_hours_holidays' => $emp['holiday_overtime_hours'] ?? 0,  // إضافة متغير مطلوب
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'employee_code' => $emp['employee_code'],  // إضافة كود الموظف للمعادلة
                    'employee_id' => $emp['employee_id'],  // إضافة معرف الموظف للمعادلة
                    'late_hours_calculated' => $emp['late_hours_calculated'] ?? 0,  // إضافة ساعات التأخير المحسوبة
                    'grace_period_late_hours_calculated' => $emp['grace_period_late_hours_calculated'] ?? 0,  // إضافة فترة السماح
                    'early_leave_minutes' => $emp['total_early_leave_minutes'] ?? 0  // إضافة دقائق الانصراف المبكر
                ];
                
                // لا نحتاج لجلب متغيرات من system_variables لأن المكافآت الخاصة تُحفظ في جدول منفصل
                
                // تهيئة results قبل استخدامه
                $results = [];
                $hasAttendanceInPeriod = false;
                
                // حساب أيام الانتظام (أيام الحضور في الوقت المحدد)
                // ملاحظة مهمة: grace_period لا يُستخدم في حساب أيام الانتظام
                // grace_period فقط خاص بحساب التأخير وساعاته
                // أيام الانتظام = الحضور في official_start_time أو قبله فقط (بدون grace_period)
                if ($mealAllowanceEnabled) {
                try {
                    // الحصول على official_start_time من system_variables (إدارة متغيرات النظام)
                    // ملاحظة: القيمة الافتراضية ('08:00:00') تُستخدم فقط كـ fallback في حالة عدم وجود المتغير في قاعدة البيانات
                    // القيمة الفعلية تُجلب دائماً من إدارة متغيرات النظام (system_variables)
                    $official_start_time = $this->getSystemVar('official_start_time', '08:00:00');
                    
                    // تنظيف وتنسيق official_start_time للتأكد من أنه بتنسيق TIME الصحيح (HH:MM:SS)
                    $official_start_time = trim($official_start_time);
                    // إذا كان الوقت بدون ثواني، أضف :00
                    if (preg_match('/^\d{1,2}:\d{2}$/', $official_start_time)) {
                        $official_start_time .= ':00';
                    }
                    // التأكد من التنسيق الصحيح (HH:MM:SS)
                    if (!preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $official_start_time)) {
                        error_log("Warning: Invalid official_start_time format: {$official_start_time}, using default: 08:00:00");
                        $official_start_time = '08:00:00';
                    }
                    
                    // تسجيل القيم المستخدمة للتصحيح
                    error_log("On-time days calculation - employee_id: {$emp['employee_id']}, official_start_time: {$official_start_time}, period: {$startDate} to {$endDate}");
                    error_log("Note: grace_period is NOT used in on-time days calculation - only official_start_time is used");
                    
                    // التحقق من وجود سجلات حضور في attendance_logs للفترة المحددة
                    $stmt_check = $this->conn->prepare("
                        SELECT COUNT(*) as total_records,
                               SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                               SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
                               SUM(CASE WHEN is_holiday = 1 THEN 1 ELSE 0 END) as holiday_count,
                               SUM(CASE WHEN check_in IS NULL THEN 1 ELSE 0 END) as null_check_in_count,
                               SUM(CASE 
                                     WHEN check_in IS NOT NULL 
                                      AND check_out IS NOT NULL 
                                      AND COALESCE(work_hours, 0) > 0
                                     THEN 1 ELSE 0 
                                   END) as actual_attendance_count
                        FROM attendance_logs 
                        WHERE employee_id = ? 
                        AND DATE(attendance_date) BETWEEN ? AND ?
                    ");
                    $stmt_check->execute([$emp['employee_id'], $startDate, $endDate]);
                    $checkData = $stmt_check->fetch(PDO::FETCH_ASSOC);
                    $hasAttendanceInPeriod = ((int)($checkData['actual_attendance_count'] ?? 0)) > 0;
                    error_log("Attendance records check for employee {$emp['employee_id']}: total={$checkData['total_records']}, present={$checkData['present_count']}, late={$checkData['late_count']}, holidays={$checkData['holiday_count']}, null_check_in={$checkData['null_check_in_count']}");
                    
                    // استعلام مباشر لرؤية جميع السجلات بالتفصيل
                    $stmt_all_records = $this->conn->prepare("
                        SELECT 
                            attendance_date,
                            check_in,
                            TIME(check_in) as check_in_time,
                            status,
                            is_holiday,
                            notes,
                            CASE 
                                WHEN TIME(check_in) <= TIME(?) THEN 'YES' ELSE 'NO' 
                            END as is_before_official_time
                        FROM attendance_logs 
                        WHERE employee_id = ? 
                        AND DATE(attendance_date) BETWEEN ? AND ?
                        ORDER BY attendance_date
                    ");
                    $stmt_all_records->execute([$official_start_time, $emp['employee_id'], $startDate, $endDate]);
                    $allRecords = $stmt_all_records->fetchAll(PDO::FETCH_ASSOC);
                    error_log("ALL attendance records for employee {$emp['employee_id']} (period: {$startDate} to {$endDate}, official_start_time: {$official_start_time}): " . json_encode($allRecords, JSON_UNESCAPED_UNICODE));
                    
                    // حساب أيام الانتظام: الموظف حضر في official_start_time أو قبله فقط (بدون grace_period)
                    // المنطق: الموظف يستحق الوجبة إذا حضر في official_start_time أو قبله (بغض النظر عن status)
                    // لأن status قد يكون 'late' لكن check_in = 08:00:00 (في الوقت المحدد) - يجب أن يُحسب
                    // حساب أيام الانتظام: الموظف يستحق الوجبة إذا:
                    // 1. check_in IS NOT NULL
                    // 2. TIME(check_in) <= TIME(official_start_time) (بدون grace_period) - هذا هو الشرط الأساسي
                    // 3. (is_holiday = 0 OR is_holiday IS NULL)
                    // 4. notes لا تحتوي على "عدم استحقاق الوجبة"
                    // 5. status != 'absent' (أي present أو late أو أي شيء آخر)
                    // ملاحظة مهمة: استخدام <= للتأكد من أن 08:00:00 = 08:00:00 يُحسب
                    $stmt3 = $this->conn->prepare("
                        SELECT COUNT(*) as on_time_days
                        FROM attendance_logs 
                        WHERE employee_id = ? 
                        AND DATE(attendance_date) BETWEEN ? AND ?
                        AND check_in IS NOT NULL
                        AND TIME(check_in) <= TIME(?)
                        AND (is_holiday = 0 OR is_holiday IS NULL)
                        AND (notes IS NULL OR notes NOT LIKE '%عدم استحقاق الوجبة%')
                        AND status != 'absent'
                    ");
                    $stmt3->execute([$emp['employee_id'], $startDate, $endDate, $official_start_time]);
                    $onTimeDays = $stmt3->fetchColumn() ?: 0;
                    
                    error_log("CRITICAL DEBUG: on_time_days query result (prepared) = {$onTimeDays} for employee_id={$emp['employee_id']}, official_start_time={$official_start_time}, period={$startDate} to {$endDate}");
                    
                    // استعلام مباشر للتحقق من النتيجة (بدون استخدام prepared statement للتحقق)
                    $directQuery = "
                        SELECT COUNT(*) as on_time_days
                        FROM attendance_logs 
                        WHERE employee_id = {$emp['employee_id']}
                        AND DATE(attendance_date) BETWEEN '{$startDate}' AND '{$endDate}'
                        AND check_in IS NOT NULL
                        AND TIME(check_in) <= TIME('{$official_start_time}')
                        AND (is_holiday = 0 OR is_holiday IS NULL)
                        AND (notes IS NULL OR notes NOT LIKE '%عدم استحقاق الوجبة%')
                        AND status != 'absent'
                    ";
                    $directResult = $this->conn->query($directQuery);
                    $directOnTimeDays = $directResult ? $directResult->fetchColumn() : 0;
                    error_log("Direct query result (for debugging): on_time_days={$directOnTimeDays}");
                    error_log("Direct query SQL: {$directQuery}");
                    
                    // إذا كان الاستعلام المباشر يعيد قيمة أكبر من الاستعلام الرئيسي، استخدم الاستعلام المباشر
                    if ($directOnTimeDays > $onTimeDays) {
                        error_log("WARNING: Direct query returned {$directOnTimeDays} but prepared statement returned {$onTimeDays}, using direct query result");
                        $onTimeDays = $directOnTimeDays;
                    }
                    
                    // استعلام تفصيلي للتحقق من كل سجل على حدة
                    $stmt_detail = $this->conn->prepare("
                        SELECT 
                            attendance_date,
                            check_in,
                            TIME(check_in) as check_in_time,
                            TIME(?) as official_time,
                            status,
                            is_holiday,
                            notes,
                            CASE 
                                WHEN status = 'present' 
                                    AND TIME(check_in) <= TIME(?) 
                                    AND (is_holiday = 0 OR is_holiday IS NULL)
                                    AND (notes IS NULL OR notes NOT LIKE '%عدم استحقاق الوجبة%')
                                THEN 1 
                                ELSE 0 
                            END as should_count
                        FROM attendance_logs 
                        WHERE employee_id = ? 
                        AND DATE(attendance_date) BETWEEN ? AND ?
                        AND status = 'present'
                        AND check_in IS NOT NULL
                        ORDER BY attendance_date
                    ");
                    $stmt_detail->execute([$emp['employee_id'], $startDate, $endDate, $official_start_time, $official_start_time]);
                    $detailRecords = $stmt_detail->fetchAll(PDO::FETCH_ASSOC);
                    error_log("Detailed attendance records for on_time_days calculation (employee_id={$emp['employee_id']}, official_start_time={$official_start_time}): " . json_encode($detailRecords));
                    
                    // حساب عدد السجلات التي يجب أن تُحسب
                    $shouldCount = 0;
                    foreach ($detailRecords as $record) {
                        if ($record['should_count'] == 1) {
                            $shouldCount++;
                        }
                    }
                    error_log("Expected on_time_days count (from detail records): {$shouldCount}, actual count from query: {$onTimeDays}");
                    
                    // إذا كان هناك اختلاف، استخدم القيمة الأكبر (query count أو detail records count)
                    // ملاحظة: query count عادة أكثر دقة لأنه يستخدم COUNT(*) مباشرة
                    if ($shouldCount != $onTimeDays) {
                        if ($shouldCount > $onTimeDays) {
                            error_log("WARNING: Detail records count ({$shouldCount}) is greater than query count ({$onTimeDays}), using detail records count");
                            $onTimeDays = $shouldCount;
                        } else {
                            error_log("WARNING: Query count ({$onTimeDays}) is greater than detail records count ({$shouldCount}), keeping query count");
                            // لا تغيير $onTimeDays - استخدم القيمة الحالية (من query count)
                        }
                    }
                    
                    // تسجيل تفصيلي للتحقق من الاستعلام
                    error_log("SQL Query executed for on_time_days: employee_id={$emp['employee_id']}, startDate={$startDate}, endDate={$endDate}, official_start_time={$official_start_time}");
                    error_log("SQL Query result (on_time_days count - FINAL): {$onTimeDays}");
                    error_log("Note: Only status='present' AND TIME(check_in) <= TIME(official_start_time) are counted (grace_period NOT used)");
                    
                    $context['on_time_days'] = $onTimeDays;
                    // إضافة on_time_days إلى results مباشرة بعد حسابه
                    $results['on_time_days'] = $onTimeDays;
                    
                    // حساب regularity_days مباشرة من on_time_days (بدون معادلة - الحساب المباشر أدق)
                    $results['regularity_days'] = $onTimeDays;
                    $context['regularity_days'] = $onTimeDays;
                    
                    // حساب regularity_pay مباشرة هنا (قبل أي حسابات أخرى)
                    $mealAllowance = $context['meal_allowance_per_day'] ?? 5;
                    $results['regularity_pay'] = $onTimeDays * $mealAllowance;
                    $context['regularity_pay'] = $results['regularity_pay'];
                    
                    error_log("IMMEDIATE assignment after calculation: on_time_days={$onTimeDays}, regularity_days={$results['regularity_days']}, regularity_pay={$results['regularity_pay']}, meal_allowance={$mealAllowance}");
                    
                    // تسجيل للتصحيح
                    error_log("On-time days calculation for employee {$emp['employee_id']}: {$onTimeDays} days (period: {$startDate} to {$endDate}, official time: {$official_start_time})");
                    error_log("Regularity days set directly from on_time_days: {$onTimeDays}");
                    error_log("Results array after on_time_days calculation: on_time_days={$results['on_time_days']}, regularity_days={$results['regularity_days']}");
                    
                    // تسجيل تفصيلي للسجلات التي تم فحصها
                    $stmt_debug = $this->conn->prepare("
                        SELECT attendance_date, check_in, status, is_holiday, notes,
                               TIME(check_in) as check_in_time, TIME(?) as official_time,
                               CASE 
                                   WHEN TIME(check_in) <= TIME(?) 
                                       AND (is_holiday = 0 OR is_holiday IS NULL)
                                       AND (notes IS NULL OR notes NOT LIKE '%عدم استحقاق الوجبة%')
                                   THEN 1 
                                   ELSE 0 
                               END as is_on_time
                        FROM attendance_logs 
                        WHERE employee_id = ? 
                        AND DATE(attendance_date) BETWEEN ? AND ?
                        AND status = 'present'
                        AND check_in IS NOT NULL
                        AND (is_holiday = 0 OR is_holiday IS NULL)
                    ");
                    $stmt_debug->execute([$emp['employee_id'], $startDate, $endDate, $official_start_time, $official_start_time]);
                    $debugRecords = $stmt_debug->fetchAll(PDO::FETCH_ASSOC);
                    error_log("Debug records for on-time days (NO grace_period used, excluding 'عدم استحقاق الوجبة'): " . json_encode($debugRecords));
                    
                    // تسجيل عدد السجلات التي يجب أن تُحسب
                    $shouldCount = 0;
                    foreach ($debugRecords as $record) {
                        if ($record['is_on_time'] == 1) {
                            $shouldCount++;
                        }
                    }
                    error_log("Expected on_time_days count (from debug records): {$shouldCount}");
                } catch (Exception $e) {
                    error_log("Error calculating on-time days: " . $e->getMessage());
                    $context['on_time_days'] = 0;
                    $results['on_time_days'] = 0;
                    // في حالة الخطأ، تعيين regularity_days و regularity_pay إلى 0
                    $results['regularity_days'] = 0;
                    $context['regularity_days'] = 0;
                    $results['regularity_pay'] = 0;
                    $context['regularity_pay'] = 0;
                }
                } else {
                    try {
                        $stmt_check = $this->conn->prepare("
                            SELECT SUM(CASE 
                                WHEN check_in IS NOT NULL 
                                 AND check_out IS NOT NULL 
                                 AND COALESCE(work_hours, 0) > 0
                                THEN 1 ELSE 0 
                              END) as actual_attendance_count
                            FROM attendance_logs 
                            WHERE employee_id = ? 
                            AND DATE(attendance_date) BETWEEN ? AND ?
                        ");
                        $stmt_check->execute([$emp['employee_id'], $startDate, $endDate]);
                        $checkData = $stmt_check->fetch(PDO::FETCH_ASSOC);
                        $hasAttendanceInPeriod = ((int)($checkData['actual_attendance_count'] ?? 0)) > 0;
                    } catch (Exception $e) {
                        error_log("Error checking attendance for meal-disabled employee {$emp['employee_id']}: " . $e->getMessage());
                        $hasAttendanceInPeriod = false;
                    }
                    zeroMealAllowanceInSalaryResults($results, $context);
                }
                
                        // استخدام المعادلات من النظام المبسط فقط - لا توجد معادلات مبرمجة
                        
                        // جلب المعادلات من النظام المبسط
                        $formulas = $this->getDynamicFormulas();
                        
                        // بدل المواصلات - إن وُجد إدخال يدوي من manual_adjustments نستخدمه، وإلا من الحضور
                        $manualTransport = $this->getEmployeeTransportAllowanceManual($emp['employee_id'], $startDate, $endDate);
                        $transportAllowance = $manualTransport !== null ? $manualTransport : $this->getActualTransportAllowance($emp['employee_code'], $startDate, $endDate);
                        
                        // المكافأة الخاصة - جلب من جدول employee_special_bonuses
                        $specialBonusWeekly = $this->getEmployeeSpecialBonus($emp['employee_id'], $startDate, $endDate);
                        
                        // جلب المتغيرات من قاعدة البيانات
                        $stmt_vars = $this->conn->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
                        $systemVariables = $stmt_vars->fetchAll(PDO::FETCH_KEY_PAIR);
                        
                        // إعداد السياق الأساسي قبل الحسابات
                        $context['base_salary'] = $emp['base_salary'];
                        $context['discrimination_incentive_allowance'] = $emp['discrimination_incentive_allowance'] ?? 0;
                        $context['daily_work_hours'] = $systemVariables['daily_work_hours'] ?? 10;
                        $context['weekly_work_days'] = $systemVariables['weekly_work_days'] ?? 6; // عدد أيام العمل في الأسبوع
                        $context['overtime_rate'] = $systemVariables['overtime_rate'] ?? 1.5; // للتوافق مع المعادلات القديمة
                        $context['regular_overtime_multiplier'] = $systemVariables['regular_overtime_multiplier'] ?? 1.5; // مضاعف الأضافي في العمل
                        $context['holiday_work_multiplier'] = $systemVariables['holiday_work_multiplier'] ?? 2.0; // مضاعف الأضافي في العطلة
                        $context['holiday_overtime_rate'] = $systemVariables['holiday_overtime_rate'] ?? 2.0; // للتوافق مع المعادلات القديمة
                        $context['punctuality_bonus_rate'] = $systemVariables['punctuality_bonus_rate'] ?? 10;
                        $context['meal_allowance_per_day'] = $systemVariables['meal_allowance_per_day'] ?? 5; // مكافأة الانتظام اليومية
                        $context['transport_allowance'] = $transportAllowance;
                        $context['special_bonus'] = $specialBonusWeekly;
                        $bayatDays = $this->getEmployeeBayatDays($emp['employee_id'], $startDate, $endDate);
                        $bayatMultiplier = floatval($systemVariables['bayat_multiplier'] ?? 2.0);
                        $bayatHoursPerDay = floatval($systemVariables['bayat_hours_per_day'] ?? 10.0);
                        $context['bayat_days'] = $bayatDays;
                        $context['bayat_multiplier'] = $bayatMultiplier;
                        $context['bayat_hours_per_day'] = $bayatHoursPerDay;
                        // جلب السلفة (advance_amount) من manual_adjustments للفترة الحالية
                        $advanceAmount = $this->getEmployeeAdvanceAmount($emp['employee_id'], $startDate, $endDate);
                        $context['advance_amount'] = $advanceAmount;
                        $context['advance'] = $advanceAmount; // للتوافق مع الأسماء القديمة
                        
                        // المستقطع من السلف: حصراً من حقل «المستقطع من السلف (لهذا الأسبوع)» — بدون خصم تلقائي من الأقساط
                        $manualDeducted = $this->getEmployeeAdvanceDeductedManual($emp['employee_id'], $startDate, $endDate);
                        $advanceInstallment = $manualDeducted !== null ? $manualDeducted : 0;
                        $advanceInstallmentNumber = 0;
                        $totalInstallments = 0;
                        $advanceInstallmentIsPaid = $advanceInstallment > 0 ? 1 : 0;
                        $context['advance_installment'] = $advanceInstallment;
                        $context['advance_installment_amount'] = $advanceInstallment;
                        $context['advance_installment_number'] = $advanceInstallmentNumber;
                        $context['total_installments'] = $totalInstallments;
                        $context['advance_installment_is_paid'] = $advanceInstallmentIsPaid;
                        
                        // إضافة القيم إلى results أيضاً
                        $results['advance_installment'] = $advanceInstallment;
                        $results['advance_installment_amount'] = $advanceInstallment;
                        $results['advance_installment_number'] = $advanceInstallmentNumber;
                        $results['total_installments'] = $totalInstallments;
                        $results['advance_installment_is_paid'] = $advanceInstallmentIsPaid;
                        
                        // إضافة ساعات الإضافي إلى السياق قبل الحسابات
                        // استخدام total_overtime_hours (يشمل الأيام العادية والعطلات) في الحسابات
                        $context['overtime_hours_work'] = $emp['total_overtime_hours'] ?? 0; // استخدام total بدلاً من regular
                        $context['regular_overtime_hours'] = $emp['regular_overtime_hours'] ?? 0; // الساعات الإضافية في الأيام العادية فقط
                        $context['holiday_overtime_hours'] = $emp['holiday_overtime_hours'] ?? 0; // الساعات الإضافية في أيام العطلات
                        $context['total_overtime_hours'] = $emp['total_overtime_hours'] ?? 0; // إجمالي الساعات الإضافية
                        $context['overtime_hours'] = $emp['total_overtime_hours'] ?? 0; // للتوافق مع المعادلات القديمة - استخدام total
                        
                        // حساب القيم الأساسية أولاً (التي لا تعتمد على قيم أخرى محسوبة)
                        $results['daily_wage'] = $this->calculateFormula($formulas['daily_wage'] ?? '', $context);
                        $context['daily_wage'] = $results['daily_wage']; // إضافة إلى السياق فوراً
                        
                        $results['weekly_wage'] = $this->calculateFormula($formulas['weekly_wage'] ?? '', $context);
                        $context['weekly_wage'] = $results['weekly_wage']; // إضافة إلى السياق فوراً
                        
                        // حساب القيم التي تعتمد على القيم الأساسية
                        $results['hourly_wage'] = $this->calculateFormula($formulas['hourly_wage'] ?? '', $context);
                        $context['hourly_wage'] = $results['hourly_wage']; // إضافة إلى السياق فوراً
                        
                        // الأجر اليومي لخصم الغياب فقط: يشمل (الأساسي + التمييز والحوافز + مكافأة خاصة) ÷ أيام العمل الأسبوعية
                        $baseForAbsence = ($context['base_salary'] ?? 0) + ($context['discrimination_incentive_allowance'] ?? 0) + ($context['special_bonus'] ?? 0);
                        $weeklyWorkDays = $context['weekly_work_days'] ?? 6;
                        $context['daily_wage_for_absence'] = $weeklyWorkDays > 0 ? ($baseForAbsence / $weeklyWorkDays) : 0;
                        $results['daily_wage_for_absence'] = $context['daily_wage_for_absence'];
                        
                        // حساب ساعات الإضافي (إجمالي الساعات الإضافية)
                        $results['overtime_hours'] = $this->calculateFormula($formulas['overtime_hours'] ?? 'regular_overtime_hours + holiday_overtime_hours', $context);
                        $context['overtime_hours'] = $results['overtime_hours']; // إضافة إلى السياق فوراً
                        
                        // حساب القيم التي تعتمد على القيم السابقة
                        // حساب أجر الإضافي بناءً على نوع اليوم:
                        // - الساعات الإضافية في الأيام العادية × regular_overtime_multiplier
                        // - الساعات الإضافية في أيام العطلات × holiday_work_multiplier
                        $overtimeFormula = $formulas['overtime_pay'] 
                                        ?? '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)';
                        
                        // التأكد من أن جميع القيم موجودة في السياق
                        if (!isset($context['holiday_overtime_hours'])) {
                            $context['holiday_overtime_hours'] = $emp['holiday_overtime_hours'] ?? 0;
                        }
                        if (!isset($context['regular_overtime_multiplier'])) {
                            $context['regular_overtime_multiplier'] = $systemVariables['regular_overtime_multiplier'] ?? 1.5;
                        }
                        if (!isset($context['holiday_work_multiplier'])) {
                            $context['holiday_work_multiplier'] = $systemVariables['holiday_work_multiplier'] ?? 2.0;
                        }
                        
                        // تسجيل للتصحيح
                        error_log("=== Overtime calculation for employee {$emp['employee_id']} ===");
                        error_log("Formula: {$overtimeFormula}");
                        error_log("From DB - regular_overtime_hours={$emp['regular_overtime_hours']}, holiday_overtime_hours={$emp['holiday_overtime_hours']}, total_overtime_hours={$emp['total_overtime_hours']}");
                        error_log("Context values: regular_overtime_hours={$context['regular_overtime_hours']}, holiday_overtime_hours={$context['holiday_overtime_hours']}, hourly_wage={$context['hourly_wage']}, regular_multiplier={$context['regular_overtime_multiplier']}, holiday_multiplier={$context['holiday_work_multiplier']}");
                        error_log("System variables: regular_overtime_multiplier={$systemVariables['regular_overtime_multiplier']}, holiday_work_multiplier={$systemVariables['holiday_work_multiplier']}");
                        error_log("Full context keys: " . implode(', ', array_keys($context)));
                        
                        // حساب أجر الإضافي مباشرة للتأكد من النتيجة الصحيحة
                        $regularOvertimePay = $context['regular_overtime_hours'] * $context['hourly_wage'] * $context['regular_overtime_multiplier'];
                        $holidayOvertimePay = $context['holiday_overtime_hours'] * $context['hourly_wage'] * $context['holiday_work_multiplier'];
                        $directOvertimePay = $regularOvertimePay + $holidayOvertimePay;
                        
                        // استخدام الحساب المباشر بدلاً من المعادلة الديناميكية للتأكد من النتيجة الصحيحة
                        $results['overtime_pay'] = round($directOvertimePay, 2);
                        $context['overtime_pay'] = $results['overtime_pay']; // إضافة إلى السياق فوراً
                        $results['bayat_hours'] = round(($bayatDays * $bayatHoursPerDay * $bayatMultiplier), 2);
                        $context['bayat_hours'] = $results['bayat_hours'];
                        $results['bayat_pay'] = round($results['bayat_hours'] * ($context['hourly_wage'] ?? 0), 2);
                        $context['bayat_pay'] = $results['bayat_pay'];
                        
                        // تسجيل النتيجة للتصحيح
                        error_log("Direct calculation: regular={$context['regular_overtime_hours']}×{$context['hourly_wage']}×{$context['regular_overtime_multiplier']}={$regularOvertimePay}, holiday={$context['holiday_overtime_hours']}×{$context['hourly_wage']}×{$context['holiday_work_multiplier']}={$holidayOvertimePay}, total={$results['overtime_pay']}");
                        error_log("=== End Overtime calculation ===\n");
                        
                        $results['holiday_overtime_pay'] = $this->calculateFormula($formulas['holiday_overtime_pay'] ?? '', $context);
                        $context['holiday_overtime_pay'] = $results['holiday_overtime_pay']; // إضافة إلى السياق فوراً
                        
                        // ملاحظة: on_time_days تم حسابه بالفعل في بداية الدالة (بدون grace_period، status = 'present' فقط)
                        // لا حاجة لإعادة حسابه هنا - القيمة موجودة بالفعل في $context['on_time_days'] و $results['on_time_days']
                        // التأكد من أن on_time_days موجود في السياق (يجب أن يكون موجوداً بالفعل من الحساب السابق)
                        if (!isset($context['on_time_days'])) {
                            error_log("Warning: on_time_days not found in context for employee {$emp['employee_id']}, setting to 0");
                                $context['on_time_days'] = 0;
                                $results['on_time_days'] = 0;
                        }
                        
                        // التأكد من أن meal_allowance_per_day موجود في السياق
                        if (!isset($context['meal_allowance_per_day'])) {
                            $context['meal_allowance_per_day'] = $systemVariables['meal_allowance_per_day'] ?? 5;
                        }
                        
                        // حساب regularity_days (أيام الانتظام) - الحساب المباشر من on_time_days (أدق من المعادلة)
                        // ملاحظة: regularity_days يجب أن يكون مساوياً لـ on_time_days مباشرة
                        if ($mealAllowanceEnabled) {
                        if (!isset($results['regularity_days'])) {
                            $results['regularity_days'] = $context['on_time_days'] ?? 0;
                            $context['regularity_days'] = $results['regularity_days'];
                        }
                        
                        // حساب regularity_pay (أجر الانتظام) - الحساب المباشر (أدق من المعادلة)
                        // ملاحظة: الحساب المباشر أسرع وأدق من استخدام المعادلة
                        $onTimeDays = $context['on_time_days'] ?? 0;
                        $mealAllowance = $context['meal_allowance_per_day'] ?? 5;
                        $results['regularity_pay'] = $onTimeDays * $mealAllowance;
                        $context['regularity_pay'] = $results['regularity_pay'];
                        
                        // تسجيل للتصحيح
                        error_log("Regularity pay calculation (direct) - on_time_days={$onTimeDays}, meal_allowance_per_day={$mealAllowance}, result={$results['regularity_pay']}");
                        
                        // إضافة للتوافق مع الأسماء القديمة
                        $results['punctuality_bonus'] = $results['regularity_pay'];
                        $results['attendance_bonus_value'] = $results['regularity_pay'];
                        $context['punctuality_bonus'] = $results['regularity_pay'];
                        $context['attendance_bonus_value'] = $results['regularity_pay'];
                        
                        // تسجيل للتصحيح (محدث لاستخدام الحساب المباشر)
                        error_log("Regularity pay calculation for employee {$emp['employee_id']}: direct calculation (on_time_days * meal_allowance_per_day), on_time_days={$context['on_time_days']}, meal_allowance_per_day={$context['meal_allowance_per_day']}, result={$results['regularity_pay']}");
                        } else {
                            zeroMealAllowanceInSalaryResults($results, $context);
                        }
                        
                        // التأكد من وجود absent_days في السياق قبل حساب absence_deduction
                        if (!isset($context['absent_days'])) {
                            $context['absent_days'] = $emp['absent_days'] ?? 0;
                        }
                        
                        // خصم الغياب = أيام الغياب × الأجر اليومي للغياب (أساسي + تمييز وحوافز + مكافأة خاصة) — ثابت ليكون من المدخلات الثلاثة فقط
                        $absenceFormula = 'absent_days * daily_wage_for_absence';
                        error_log("Calculating absence_deduction for employee {$emp['employee_id']}: absent_days={$context['absent_days']}, daily_wage_for_absence={$context['daily_wage_for_absence']}, formula={$absenceFormula}");
                        
                        $results['absence_deduction'] = $this->calculateFormula($absenceFormula, $context);
                        
                        // تسجيل للتصحيح
                        error_log("Absence deduction result for employee {$emp['employee_id']}: {$results['absence_deduction']}");
                        $context['absence_deduction'] = $results['absence_deduction']; // إضافة إلى السياق فوراً
                        
                        // حساب ساعات التأخير في الوقت الحقيقي مثل API الحضور
                        $totalLateHours = 0;

                        // الحصول على سجلات الحضور للموظف في الأسبوع الحالي
                        $attendanceStmt = $this->conn->prepare("
                            SELECT check_in, check_out, work_hours, is_holiday, is_excused
                            FROM attendance_logs
                            WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?
                        ");
                        $attendanceStmt->execute([$emp['employee_id'], $startDate, $endDate]);
                        $attendanceRecords = $attendanceStmt->fetchAll(PDO::FETCH_ASSOC);

                        foreach ($attendanceRecords as $record) {
                            $isHoliday = !empty($record['is_holiday']) ? (int)$record['is_holiday'] : 0;
                            $isExcused = !empty($record['is_excused']) ? (int)$record['is_excused'] : 0;

                            $checkIn = trim((string)($record['check_in'] ?? ''));
                            $checkOut = trim((string)($record['check_out'] ?? ''));
                            $hasValidCheckIn = ($checkIn !== '' && $checkIn !== '00:00' && $checkIn !== '00:00:00');
                            $hasValidCheckOut = ($checkOut !== '' && $checkOut !== '00:00' && $checkOut !== '00:00:00');
                            $isIncomplete = ($hasValidCheckIn xor $hasValidCheckOut);
                            $hasActualWork = ((float)($record['work_hours'] ?? 0)) > 0;

                            if (!$isHoliday && !$isIncomplete && $hasValidCheckIn && $hasActualWork) {
                                // حساب التأخير في أيام العمل الرسمية
                                $officialStart = $this->getSystemVar('official_start_time', '08:30:00');
                                $graceMinutesCfg = (int)$this->getSystemVar('grace_period', 5);
                                $graceLate = $this->computeGracePeriodLateMinutes($checkIn, $officialStart, $graceMinutesCfg);

                                if ($isExcused) {
                                    // إذا كان بإذن: حساب التأخير بدون مضاعفات
                                    $totalLateHours += $this->computeLatePenaltyHoursWithExcuse($graceLate);
                                } else {
                                    // بدون إذن: حساب التأخير بالمضاعفات
                                    $totalLateHours += $this->computeLatePenaltyHours($graceLate, $this->conn);
                                }
                            }
                        }

                        // إضافة late_hours إلى السياق
                        $context['late_hours'] = $totalLateHours;
                        
                        // تسجيل للتصحيح
                        $lateDeductionFormula = $formulas['late_deduction'] ?? 'late_hours * hourly_wage';
                        error_log("Calculating late_deduction for employee {$emp['employee_id']}: late_hours={$lateHours}, hourly_wage={$context['hourly_wage']}, formula={$lateDeductionFormula}");
                        
                        $results['late_deduction'] = $this->calculateFormula($lateDeductionFormula, $context);
                        
                        // تسجيل للتصحيح
                        error_log("Late deduction result for employee {$emp['employee_id']}: {$results['late_deduction']}");
                        
                        $context['late_deduction'] = $results['late_deduction']; // إضافة إلى السياق فوراً
                        
                        // حساب خصم الانصراف المبكر - يُحسب دائماً إذا سجل خروج قبل موعد انتهاء العمل (الإذن خاص بتسجيل الحضور فقط وليس للانصراف المبكر)
                        $earlyLeaveMinutes = $emp['total_early_leave_minutes'] ?? 0;
                        
                        // تسجيل للتصحيح
                        error_log("=== Early Leave Calculation for employee {$emp['employee_id']} ===");
                        error_log("total_early_leave_minutes from DB: {$earlyLeaveMinutes}");
                        
                        // تحويل الدقائق إلى ساعات (بدون مضاعف - الانصراف المبكر يُحسب مباشرة)
                        $earlyLeaveHours = 0;
                        if ($earlyLeaveMinutes > 0) {
                            if ($earlyLeaveMinutes >= 60) {
                                // إذا انصرف مبكراً ساعة كاملة أو أكثر: يُحسب مباشرة بدون مضاعف
                                $earlyLeaveHours = $earlyLeaveMinutes / 60.0;
                                error_log("Early leave >= 60 minutes: {$earlyLeaveMinutes} / 60.0 = {$earlyLeaveHours} hours");
                            } elseif ($earlyLeaveMinutes > 30) {
                                // إذا انصرف مبكراً أكثر من 30 دقيقة وأقل من 60 دقيقة: يُحسب كساعة واحدة
                                $earlyLeaveHours = 1.0;
                                error_log("Early leave > 30 and < 60 minutes: 1.0 hour");
                            } else {
                                // إذا انصرف مبكراً 30 دقيقة أو أقل: يُحسب كنصف ساعة
                                $earlyLeaveHours = 0.5;
                                error_log("Early leave <= 30 minutes: 0.5 hour");
                            }
                        } else {
                            error_log("No early leave minutes, skipping calculation");
                        }
                        
                        $context['early_leave_minutes'] = $earlyLeaveMinutes;
                        $context['early_leave_hours'] = $earlyLeaveHours;
                        
                        // حساب خصم الانصراف المبكر
                        $earlyLeaveDeductionFormula = $formulas['early_leave_deduction'] ?? 'early_leave_hours * hourly_wage';
                        error_log("Early leave deduction formula: {$earlyLeaveDeductionFormula}");
                        error_log("Context values: early_leave_hours={$earlyLeaveHours}, hourly_wage={$context['hourly_wage']}");
                        
                        $results['early_leave_deduction'] = $this->calculateFormula($earlyLeaveDeductionFormula, $context);
                        $context['early_leave_deduction'] = $results['early_leave_deduction'];
                        
                        // تسجيل للتصحيح
                        error_log("Final early_leave_deduction result: {$results['early_leave_deduction']}");
                        error_log("=== End Early Leave Calculation ===");
                        
                        // حساب التأمين: فقط إذا كان الموظف مؤمن عليه (is_insured = 1)
                        // استخدام weekly_insurance_amount من system_variables
                        $isInsured = isset($emp['is_insured']) ? intval($emp['is_insured']) : 0;
                        if ($isInsured == 1) {
                            // إذا كان مؤمن عليه، استخدم weekly_insurance_amount
                            $weeklyInsuranceAmount = (float)($systemVariables['weekly_insurance_amount'] ?? 0);
                            $results['insurance_deduction'] = $weeklyInsuranceAmount;
                            
                            // تسجيل للتصحيح
                            error_log("Calculating insurance_deduction for employee {$emp['employee_id']}: is_insured={$isInsured}, weekly_insurance_amount={$weeklyInsuranceAmount}, insurance_deduction={$results['insurance_deduction']}");
                        } else {
                            // إذا لم يكن مؤمن عليه، التأمين = 0
                            $results['insurance_deduction'] = 0;
                            
                            // تسجيل للتصحيح
                            error_log("Calculating insurance_deduction for employee {$emp['employee_id']}: is_insured={$isInsured}, insurance_deduction=0 (not insured)");
                        }
                        $context['insurance_deduction'] = $results['insurance_deduction']; // إضافة إلى السياق فوراً
                        
                        // إضافة البيانات الأساسية للموظف
                        $results['id'] = $emp['employee_id'];
                        $results['employee_id'] = $emp['employee_id'];
                        $results['name'] = $emp['employee_name'];
                        $results['employee_code'] = $emp['employee_code'];
                        $results['department'] = $emp['department'];
                        $results['department_description'] = $emp['department_description'] ?? '';
                        $results['cost_center'] = $emp['cost_center'] ?? '';
                        $results['cost_center_color'] = $emp['cost_center_color'] ?? '';
                        $results['location'] = $emp['location'] ?? '';
                        $results['position'] = $emp['position'] ?? '';
                        $results['salary_type'] = 'Weekly';
                        $results['is_insured'] = isset($emp['is_insured']) ? intval($emp['is_insured']) : 0;
                        $results['base_salary'] = round($emp['base_salary'], 2);
                        $results['discrimination_incentive_allowance'] = round($emp['discrimination_incentive_allowance'] ?? 0, 2);
                        
                        // إضافة القيم المحسوبة يدوياً
                        $results['transport_allowance'] = $transportAllowance;
                        $results['special_bonus_weekly'] = $specialBonusWeekly;
                        $results['bayat_days'] = $bayatDays;
                        $results['bayat_multiplier'] = $bayatMultiplier;
                        $results['bayat_hours_per_day'] = $bayatHoursPerDay;
                        $results['advance_amount'] = $advanceAmount;
                        $results['advance_installment'] = $advanceInstallment;
                        $results['advance_installment_amount'] = $advanceInstallment;
                        $results['advance_installment_number'] = $advanceInstallmentNumber;
                        $results['total_installments'] = $totalInstallments;
                        $results['advance_installment_is_paid'] = $advanceInstallmentIsPaid;
                        
                        // إضافة ساعات الإضافي إلى النتائج
                        // استخدام total_overtime_hours (يشمل الأيام العادية والعطلات) بدلاً من regular_overtime_hours فقط
                        $results['overtime_hours_work'] = $emp['total_overtime_hours'] ?? 0; // استخدام total بدلاً من regular
                        $results['regular_overtime_hours'] = $emp['regular_overtime_hours'] ?? 0; // الساعات الإضافية في الأيام العادية فقط
                        $results['holiday_overtime_hours'] = $emp['holiday_overtime_hours'] ?? 0; // الساعات الإضافية في أيام العطلات
                        $results['total_overtime_hours'] = $emp['total_overtime_hours'] ?? 0; // إجمالي الساعات الإضافية
                        $results['overtime_hours'] = $emp['total_overtime_hours'] ?? 0; // للتوافق مع الأعمدة القديمة - استخدام total
                        $results['work_hours'] = round($emp['total_work_hours'] ?? 0, 2); // إجمالي ساعات العمل
                        
                        // إضافة أيام الغياب إلى النتائج
                        $results['absent_days'] = $emp['absent_days'] ?? 0;
                        $results['absence_days'] = $emp['absent_days'] ?? 0; // للتوافق مع الأسماء المختلفة
                        
                        // إضافة أيام الغياب إلى النتائج
                        $results['absent_days'] = $emp['absent_days'] ?? 0;
                        $results['absence_days'] = $emp['absent_days'] ?? 0; // للتوافق مع الأسماء المختلفة
                        
                        // إضافة ساعات التأخير إلى النتائج
                        // استخدام ساعات التأخير المحسوبة في الوقت الحقيقي من $context
                        $lateHours = $context['late_hours'] ?? 0;
                        error_log("Setting late_hours for employee {$emp['employee_id']}: calculated_late_hours={$lateHours}");
                        $results['late_hours'] = (float)$lateHours;
                        
                        // إضافة early_leave_deduction إلى النتائج بشكل صريح
                        $results['early_leave_deduction'] = $results['early_leave_deduction'] ?? 0;
                        $results['early_leave_minutes'] = $emp['total_early_leave_minutes'] ?? 0;
                        $results['early_leave_hours'] = $context['early_leave_hours'] ?? 0;
                        error_log("Adding early_leave_deduction to results for employee {$emp['employee_id']}: early_leave_deduction={$results['early_leave_deduction']}, early_leave_minutes={$results['early_leave_minutes']}, early_leave_hours={$results['early_leave_hours']}");
                        
                        // ملاحظة: on_time_days و regularity_days تم حسابهما بالفعل في بداية الدالة (بدون grace_period، status = 'present' فقط)
                        // لا حاجة لإعادة حسابهما هنا - القيم موجودة بالفعل في $context و $results
                        // التأكد من أن القيم موجودة في النتائج النهائية
                        $results['on_time_days_calculation'] = $results['on_time_days'] ?? $context['on_time_days'] ?? 0;
                            
                        // تسجيل نهائي للتحقق من القيم قبل الإرجاع
                        error_log("Final values before returning for employee {$emp['employee_id']}: on_time_days={$results['on_time_days']}, regularity_days={$results['regularity_days']}, regularity_pay={$results['regularity_pay']}");
                        
                        // إضافة القيم الأساسية للسياق
                        $context['overtime_hours_work'] = $emp['regular_overtime_hours'] ?? 0;
                        $context['regular_overtime_hours'] = $emp['regular_overtime_hours'] ?? 0;
                        $context['total_overtime_hours'] = $emp['total_overtime_hours'] ?? 0;
                        
                        // استخدام المعادلات الديناميكية لإجمالي المستحقات والمستقطعات
                        // السلفة (advance_amount) لا تُضاف للمستحقات لأنها تُعطى باليد
                        $results['total_entitlements'] = $this->calculateFormula($formulas['total_entitlements'] ?? 'base_salary + discrimination_incentive_allowance + transport_allowance + special_bonus + overtime_pay + punctuality_bonus + bayat_pay', $context);
                        $context['total_entitlements'] = $results['total_entitlements']; // إضافة إلى السياق فوراً
                        
                        // إضافة advance_installment في معادلة total_deductions
                        $results['total_deductions'] = $this->calculateFormula($formulas['total_deductions'] ?? 'absence_deduction + late_deduction + early_leave_deduction + insurance_deduction + advance_installment', $context);
                        $context['total_deductions'] = $results['total_deductions']; // إضافة إلى السياق فوراً
                        
                        // تسجيل للتصحيح
                        $netSalaryFormula = $formulas['net_salary'] ?? 'total_entitlements - total_deductions';
                        error_log("Calculating net_salary for employee {$emp['employee_id']}: total_entitlements={$results['total_entitlements']}, total_deductions={$results['total_deductions']}, formula={$netSalaryFormula}");
                        
                        $results['net_salary'] = $this->calculateFormula($netSalaryFormula, $context);
                        
                        // تسجيل للتصحيح
                        error_log("Net salary result for employee {$emp['employee_id']}: {$results['net_salary']}");

                        // لا توجد أي سجلات حضور/انصراف في الفترة: صافي المرتب = صفر
                        if (!$hasAttendanceInPeriod) {
                            $results['daily_wage'] = 0;
                            $results['weekly_wage'] = 0;
                            $results['hourly_wage'] = 0;
                            $results['regularity_days'] = 0;
                            $results['regularity_pay'] = 0;
                            $results['on_time_days'] = 0;
                            $results['overtime_hours'] = 0;
                            $results['overtime_hours_work'] = 0;
                            $results['regular_overtime_hours'] = 0;
                            $results['holiday_overtime_hours'] = 0;
                            $results['total_overtime_hours'] = 0;
                            $results['overtime_pay'] = 0;
                            $results['bayat_hours'] = 0;
                            $results['bayat_pay'] = 0;
                            $results['absence_deduction'] = 0;
                            $results['late_deduction'] = 0;
                            $results['early_leave_deduction'] = 0;
                            $results['insurance_deduction'] = 0;
                            $results['advance_installment'] = 0;
                            $results['advance_installment_amount'] = 0;
                            $results['total_entitlements'] = 0;
                            $results['total_deductions'] = 0;
                            $results['net_salary'] = 0;
                        }
                        
                // استخدام النتائج المحسوبة مباشرة
                $attendanceRate = $emp['attendance_days'] > 0 ? 
                    (($emp['present_days'] / $emp['attendance_days']) * 100) : 0;
                
                // التأكد من أن on_time_days و regularity_days و regularity_pay موجودة في النتائج النهائية
                // (يجب أن تكون موجودة بالفعل من الحسابات السابقة)
                if (!isset($results['on_time_days']) || $results['on_time_days'] === null) {
                    error_log("Warning: on_time_days missing in final results for employee {$emp['employee_id']}, setting to 0");
                    $results['on_time_days'] = 0;
                }
                if (!isset($results['regularity_days']) || $results['regularity_days'] === null) {
                    error_log("Warning: regularity_days missing in final results for employee {$emp['employee_id']}, setting to on_time_days");
                    $results['regularity_days'] = $results['on_time_days'] ?? 0;
                }
                if (!isset($results['regularity_pay']) || $results['regularity_pay'] === null) {
                    error_log("Warning: regularity_pay missing in final results for employee {$emp['employee_id']}, calculating now");
                    if ($mealAllowanceEnabled) {
                        $onTimeDays = $results['on_time_days'] ?? 0;
                        $mealAllowance = $context['meal_allowance_per_day'] ?? 5;
                        $results['regularity_pay'] = $onTimeDays * $mealAllowance;
                    } else {
                        $results['regularity_pay'] = 0;
                    }
                }
                
                // إجبار القيم النهائية للتأكد من وجودها (حتى لو كانت 0)
                // ملاحظة: هذه القيم يجب أن تكون موجودة بالفعل من الحسابات السابقة
                if ($mealAllowanceEnabled && (!isset($results['on_time_days']) || $results['on_time_days'] === null)) {
                    error_log("CRITICAL: on_time_days is missing or null for employee {$emp['employee_id']}, forcing recalculation");
                    // إعادة حساب on_time_days مباشرة
                    try {
                        $official_start_time = $this->getSystemVar('official_start_time', '08:00:00');
                        $official_start_time = trim($official_start_time);
                        if (preg_match('/^\d{1,2}:\d{2}$/', $official_start_time)) {
                            $official_start_time .= ':00';
                        }
                        $stmt_force = $this->conn->prepare("
                            SELECT COUNT(*) as on_time_days
                            FROM attendance_logs 
                            WHERE employee_id = ? 
                            AND DATE(attendance_date) BETWEEN ? AND ?
                            AND status = 'present'
                            AND check_in IS NOT NULL
                            AND TIME(check_in) <= TIME(?)
                            AND (is_holiday = 0 OR is_holiday IS NULL)
                        ");
                        $stmt_force->execute([$emp['employee_id'], $startDate, $endDate, $official_start_time]);
                        $forcedOnTimeDays = $stmt_force->fetchColumn() ?: 0;
                        $results['on_time_days'] = $forcedOnTimeDays;
                        $results['regularity_days'] = $forcedOnTimeDays;
                        $onTimeDays = $forcedOnTimeDays;
                        $mealAllowance = $context['meal_allowance_per_day'] ?? 5;
                        $results['regularity_pay'] = $onTimeDays * $mealAllowance;
                        error_log("FORCED recalculation: on_time_days={$forcedOnTimeDays}, regularity_days={$forcedOnTimeDays}, regularity_pay={$results['regularity_pay']}");
                    } catch (Exception $e) {
                        error_log("Error in forced recalculation: " . $e->getMessage());
                        $results['on_time_days'] = 0;
                        $results['regularity_days'] = 0;
                        $results['regularity_pay'] = 0;
                    }
                }
                
                if (!$mealAllowanceEnabled) {
                    zeroMealAllowanceInSalaryResults($results, $context);
                }
                
                // تسجيل نهائي للتحقق من القيم قبل الإضافة إلى weeklyData
                error_log("Adding to weeklyData for employee {$emp['employee_id']}: on_time_days={$results['on_time_days']}, regularity_days={$results['regularity_days']}, regularity_pay={$results['regularity_pay']}");
                error_log("Full results keys for employee {$emp['employee_id']}: " . implode(', ', array_keys($results)));
                
                // استخدام النتائج الديناميكية فقط - لا توجد عواميد ثابتة
                $weeklyData[] = $results;
            }
            
            return $this->successResponse($weeklyData, 'تم تحميل بيانات الراتب الأسبوعي من قاعدة البيانات');
            
        } catch (Exception $e) {
            error_log("Error in getWeeklySalaryData: " . $e->getMessage());
            return $this->errorResponse('خطأ في جلب بيانات الراتب الأسبوعي: ' . $e->getMessage(), 500);
        }
    }
    
    // جلب المعادلات من النظام المبسط
    private function getDynamicFormulas() {
        try {
            // محاولة جلب المعادلات من عمود formula مباشرة (إذا كان موجوداً)
            // أو من جدول dynamic_formulas عبر formula_id
            $stmt = $this->conn->prepare("
                SELECT 
                    we.column_key,
                    COALESCE(
                        we.formula,
                        df.formula_expression,
                        CASE 
                            WHEN we.is_calculated = 1 THEN
                                CASE we.column_key
                                    WHEN 'daily_wage' THEN 'base_salary / weekly_work_days'
                                    WHEN 'weekly_wage' THEN 'base_salary'
                                    WHEN 'hourly_wage' THEN 'daily_wage / daily_work_hours'
                                    WHEN 'overtime_hours' THEN 'regular_overtime_hours + holiday_overtime_hours'
                                    WHEN 'overtime_pay' THEN '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)'
                                    WHEN 'bayat_hours' THEN 'bayat_days * bayat_hours_per_day * bayat_multiplier'
                                    WHEN 'bayat_pay' THEN 'bayat_hours * hourly_wage'
                                    WHEN 'regularity_pay' THEN 'on_time_days * meal_allowance_per_day'
                                    WHEN 'total_entitlements' THEN 'base_salary + discrimination_incentive_allowance + transport_allowance + special_bonus + overtime_pay + punctuality_bonus + bayat_pay'
                                    ELSE NULL
                                END
                            ELSE NULL
                        END
                    ) as formula
                FROM weekly_wage_entitlements we
                LEFT JOIN dynamic_formulas df ON we.formula_id = df.id AND df.is_active = 1
                WHERE we.is_calculated = 1
                AND COALESCE(we.formula, df.formula_expression, '') != ''
                
                UNION ALL
                
                SELECT 
                    wd.column_key,
                    COALESCE(
                        wd.formula,
                        df.formula_expression,
                        CASE 
                            WHEN wd.is_calculated = 1 THEN
                                CASE wd.column_key
                                    WHEN 'absence_deduction' THEN 'absent_days * daily_wage'
                                    WHEN 'late_deduction' THEN 'late_hours * hourly_wage'
                                    WHEN 'early_leave_deduction' THEN 'early_leave_hours * hourly_wage'
                                    WHEN 'insurance_deduction' THEN 'weekly_insurance_amount'
                                    WHEN 'advance_deduction' THEN 'advance_payment'
                                    WHEN 'total_deductions' THEN 'absence_deduction + late_deduction + early_leave_deduction + insurance_deduction + advance_deduction'
                                    ELSE NULL
                                END
                            ELSE NULL
                        END
                    ) as formula
                FROM weekly_wage_deductions wd
                LEFT JOIN dynamic_formulas df ON wd.formula_id = df.id AND df.is_active = 1
                WHERE wd.is_calculated = 1
                AND COALESCE(wd.formula, df.formula_expression, '') != ''
                
                UNION ALL
                
                SELECT 
                    nw.column_key,
                    COALESCE(
                        nw.formula,
                        df.formula_expression,
                        CASE 
                            WHEN nw.is_calculated = 1 THEN
                                CASE nw.column_key
                                    WHEN 'total_entitlements' THEN 'base_salary + discrimination_incentive_allowance + transport_allowance + special_bonus + overtime_pay + punctuality_bonus + bayat_pay'
                                    WHEN 'total_deductions' THEN 'absence_deduction + late_deduction + early_leave_deduction + insurance_deduction'
                                    WHEN 'net_salary' THEN 'total_entitlements - total_deductions'
                                    ELSE NULL
                                END
                            ELSE NULL
                        END
                    ) as formula
                FROM net_weekly_wage nw
                LEFT JOIN dynamic_formulas df ON nw.formula_id = df.id AND df.is_active = 1
                WHERE nw.is_calculated = 1
                AND COALESCE(nw.formula, df.formula_expression, '') != ''
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // تحويل إلى مصفوفة key-value
            $formulas = [];
            foreach ($results as $row) {
                if (!empty($row['formula'])) {
                    $formulas[$row['column_key']] = $row['formula'];
                }
            }
            
            // تسجيل المعادلات المحملة للتصحيح
            error_log("Loaded dynamic formulas: " . json_encode(array_keys($formulas)));
            
            return $formulas;
        } catch (Exception $e) {
            error_log("Error getting dynamic formulas: " . $e->getMessage());
            // في حالة الخطأ، إرجاع معادلات افتراضية
            return [
                'daily_wage' => 'base_salary / weekly_work_days',
                'weekly_wage' => 'base_salary',
                'hourly_wage' => 'daily_wage / daily_work_hours',
                'overtime_hours' => 'regular_overtime_hours + holiday_overtime_hours',
                'overtime_pay' => '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)',
                'regularity_pay' => 'on_time_days * meal_allowance_per_day',
                'bayat_hours' => 'bayat_days * bayat_hours_per_day * bayat_multiplier',
                'bayat_pay' => 'bayat_hours * hourly_wage',
                'total_entitlements' => 'base_salary + discrimination_incentive_allowance + transport_allowance + special_bonus + overtime_pay + punctuality_bonus + bayat_pay',
                'total_deductions' => 'absence_deduction + late_deduction + early_leave_deduction + insurance_deduction + advance_installment',
                'net_salary' => 'total_entitlements - total_deductions'
            ];
        }
    }
    
    // حساب المعادلة باستخدام السياق
    private function calculateFormula($formula, $context) {
        if (empty($formula) || $formula === '0') {
            return 0;
        }
        
        try {
            // تحويل الرموز العربية إلى الإنجليزية أولاً
            $expression = str_replace(['×', '÷'], ['*', '/'], $formula);
            
            // ترتيب المفاتيح حسب الطول (الأطول أولاً) لتجنب الاستبدال الجزئي
            // مثال: regular_overtime_hours يجب أن يُستبدل قبل regular_overtime
            $keys = array_keys($context);
            usort($keys, function($a, $b) {
                return strlen($b) - strlen($a);
            });
            
            // استبدال المتغيرات في المعادلة
            foreach ($keys as $key) {
                $value = $context[$key] ?? 0;
                // التأكد من أن القيمة رقمية
                $numericValue = is_numeric($value) ? (float)$value : 0;
                // استبدال المتغير فقط إذا كان كلمة كاملة (باستخدام word boundaries)
                $expression = preg_replace('/\b' . preg_quote($key, '/') . '\b/', $numericValue, $expression);
            }
            
            // التحقق من وجود متغيرات غير معرفة قبل الاستبدال
            preg_match_all('/\b[a-zA-Z_][a-zA-Z0-9_]*\b/', $expression, $matches);
            $undefinedVars = [];
            foreach ($matches[0] as $var) {
                if (!isset($context[$var])) {
                    $undefinedVars[] = $var;
                }
            }
            
            if (!empty($undefinedVars)) {
                error_log("Warning: Undefined variables in formula '{$formula}': " . implode(', ', $undefinedVars));
                error_log("Available context keys: " . implode(', ', array_keys($context)));
            }
            
            // إزالة أي متغيرات غير معرفة (لكن فقط إذا كانت كلمات كاملة)
            $expression = preg_replace('/\b[a-zA-Z_][a-zA-Z0-9_]*\b/', '0', $expression);
            
            // تسجيل للتصحيح
            error_log("Formula calculation: '{$formula}' -> '{$expression}'");
            
            // تقييم المعادلة
            $result = eval("return $expression;");
            $finalResult = is_numeric($result) ? round((float)$result, 2) : 0;
            
            error_log("Formula result: {$finalResult}");
            return $finalResult;
        } catch (Exception $e) {
            error_log("Error calculating formula '$formula': " . $e->getMessage());
            return 0;
        }
    }
    
    
    private function getMonthlySalaryData($input) {
        $startDate = $input['start_date'] ?? date('Y-m-d');
        $endDate = $input['end_date'] ?? date('Y-m-d');
        
        if (!$this->conn) {
            return $this->errorResponse('لا يمكن الاتصال بقاعدة البيانات', 500);
        }
        
        try {
            // جلب بيانات الموظفين مع معلومات الحضور للراتب الشهري
            $stmt = $this->conn->prepare("
                SELECT 
                    e.id as employee_id,
                    COALESCE(NULLIF(e.name_ar, ''), e.name) as employee_name,
                    e.employee_code,
                    e.department,
                    e.position,
                    e.location,
                    e.base_salary,
                    e.discrimination_incentive_allowance,
                    e.salary_type,
                    e.is_insured,
                    d.name as department_name,
                    d.description as department_description,
                    COUNT(a.id) as attendance_days,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
                    AVG(CASE WHEN a.late_minutes > 0 THEN a.late_minutes ELSE 0 END) as avg_late_minutes,
                    SUM(a.late_hours_calculated) as late_hours_calculated,
                    SUM(a.grace_period_late_hours_calculated) as grace_period_late_hours_calculated,
                    SUM(a.early_leave_minutes) as total_early_leave_minutes,
                    SUM(CASE WHEN a.overtime_hours > 0 THEN a.overtime_hours ELSE 0 END) as total_overtime_hours,
                    SUM(CASE WHEN a.is_holiday = 0 AND a.overtime_hours > 0 THEN 1 ELSE 0 END) as overtime_days_normal,
                    SUM(CASE WHEN a.is_holiday = 1 AND a.overtime_hours > 0 THEN 1 ELSE 0 END) as overtime_days_holidays,
                    SUM(CASE WHEN a.is_holiday = 0 THEN a.overtime_hours ELSE 0 END) as regular_overtime_hours,
                    SUM(CASE WHEN a.is_holiday = 1 THEN a.overtime_hours ELSE 0 END) as holiday_overtime_hours,
                    SUM(a.work_hours) as total_work_hours
                FROM employees e
                LEFT JOIN departments d ON e.department = d.name
                LEFT JOIN attendance_logs a ON e.id = a.employee_id 
                    AND DATE(a.attendance_date) BETWEEN ? AND ?
                WHERE e.status = 'active' AND e.salary_type = 'Monthly'
                GROUP BY e.id, e.name, e.employee_code, e.department, e.position, e.location, e.base_salary, e.discrimination_incentive_allowance, e.salary_type, e.is_insured, d.name, d.description
                ORDER BY e.name
            ");
            
            $stmt->execute([$startDate, $endDate]);
            $employees = $stmt->fetchAll();
            
            // Debug: Log first result
            if (!empty($employees)) {
                $this->writeLog('First monthly salary result: ' . json_encode($employees[0]));
            }
            
            $monthlyData = [];
            foreach ($employees as $emp) {
                // إعداد السياق للمحرك الديناميكي
                $context = [
                    'employee_id' => $emp['employee_id'],
                    'base_salary' => $emp['base_salary'],
                    'salary_type' => 'Monthly',
                    'is_insured' => isset($emp['is_insured']) ? intval($emp['is_insured']) : 0,
                    'present_days' => $emp['present_days'],
                    'absent_days' => $emp['absent_days'],
                    'late_days' => $emp['late_days'],
                    'avg_late_minutes' => $emp['avg_late_minutes'] ?? 0,
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ];
                
                // جلب المتغيرات من قاعدة البيانات
                $stmt_vars = $this->conn->query("SELECT variable_key, variable_value FROM system_variables WHERE is_active = 1");
                $systemVariables = $stmt_vars->fetchAll(PDO::FETCH_KEY_PAIR);
                
                // إضافة المتغيرات الأساسية إلى السياق
                $context['daily_work_hours'] = $systemVariables['daily_work_hours'] ?? 8;
                $context['weekly_work_days'] = $systemVariables['weekly_work_days'] ?? 6;
                $context['monthly_work_days'] = $systemVariables['monthly_work_days'] ?? 26;
                $context['overtime_rate'] = $systemVariables['overtime_rate'] ?? 1.5;
                $context['regular_overtime_multiplier'] = $systemVariables['regular_overtime_multiplier'] ?? 1.5;
                $context['holiday_work_multiplier'] = $systemVariables['holiday_work_multiplier'] ?? 2.0;
                $context['holiday_overtime_rate'] = $systemVariables['holiday_overtime_rate'] ?? 2.0; // للتوافق مع المعادلات
                $context['regular_overtime_rate'] = $systemVariables['regular_overtime_rate'] ?? 1.5; // للتوافق مع المعادلات
                $context['punctuality_bonus_rate'] = $systemVariables['punctuality_bonus_rate'] ?? 10;
                $context['meal_allowance_per_day'] = $systemVariables['meal_allowance_per_day'] ?? 5;
                $context['insurance_rate'] = $systemVariables['insurance_rate'] ?? ($systemVariables['social_insurance_rate'] ?? 0.14); // معدل التأمين (14% افتراضي)
                $context['weekly_insurance_amount'] = $systemVariables['weekly_insurance_amount'] ?? 0; // مبلغ التأمين الأسبوعي
                $context['monthly_insurance_amount'] = $systemVariables['monthly_insurance_amount'] ?? 0; // مبلغ التأمين الشهري
                
                // حساب المتغيرات المشتقة للشهري (إذا كانت المعادلات تحتاجها)
                // ملاحظة: هذه القيم ستُحسب من المعادلات، لكن نضيفها هنا كقيم افتراضية
                $context['daily_wage'] = $emp['base_salary'] / ($context['monthly_work_days'] ?? 26);
                $context['hourly_wage'] = $context['daily_wage'] / ($context['daily_work_hours'] ?? 8);
                $context['weekly_wage'] = $context['daily_wage'] * ($context['weekly_work_days'] ?? 6);
                
                        // تسجيل للتصحيح
                        $this->writeLog("Initial context values: base_salary={$emp['base_salary']}, monthly_work_days={$context['monthly_work_days']}, daily_wage={$context['daily_wage']}, hourly_wage={$context['hourly_wage']}");
                
                // جلب السلفة (advance_amount) من manual_adjustments للفترة الحالية
                $advanceAmount = $this->getEmployeeAdvanceAmount($emp['employee_id'], $startDate, $endDate);
                $context['advance_amount'] = $advanceAmount;
                $context['advance'] = $advanceAmount; // للتوافق مع الأسماء القديمة
                
                // المستقطع من السلف: حصراً من الإدخال اليدوي في تفاصيل الراتب — بدون خصم تلقائي من الأقساط
                $manualDeducted = $this->getEmployeeAdvanceDeductedManual($emp['employee_id'], $startDate, $endDate);
                $advanceInstallment = $manualDeducted !== null ? $manualDeducted : 0;
                $advanceInstallmentNumber = 0;
                $totalInstallments = 0;
                $advanceInstallmentIsPaid = $advanceInstallment > 0 ? 1 : 0;
                $context['advance_installment'] = $advanceInstallment;
                $context['advance_installment_amount'] = $advanceInstallment;
                $context['advance_installment_number'] = $advanceInstallmentNumber;
                $context['total_installments'] = $totalInstallments;
                $context['advance_installment_is_paid'] = $advanceInstallmentIsPaid;
                
                // إضافة ساعات الإضافي إلى السياق (للشهري) - من قاعدة البيانات
                $context['regular_overtime_hours'] = $emp['regular_overtime_hours'] ?? 0;
                $context['holiday_overtime_hours'] = $emp['holiday_overtime_hours'] ?? 0;
                $context['total_overtime_hours'] = $emp['total_overtime_hours'] ?? 0;
                $context['overtime_hours_work'] = $emp['regular_overtime_hours'] ?? 0; // للتوافق مع المعادلات
                $context['overtime_hours'] = 0; // سيتم حسابها من المعادلات (regular_overtime_hours + holiday_overtime_hours)
                
                // حساب ساعات التأخير في الوقت الحقيقي مثل API الحضور
                $totalLateHours = 0;

                // الحصول على سجلات الحضور للموظف في الفترة المحددة
                $attendanceStmt = $this->conn->prepare("
                    SELECT check_in, check_out, work_hours, is_holiday, is_excused
                    FROM attendance_logs
                    WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?
                ");
                $attendanceStmt->execute([$emp['employee_id'], $startDate, $endDate]);
                $attendanceRecords = $attendanceStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($attendanceRecords as $record) {
                    $isHoliday = !empty($record['is_holiday']) ? (int)$record['is_holiday'] : 0;
                    $isExcused = !empty($record['is_excused']) ? (int)$record['is_excused'] : 0;

                    $checkIn = trim((string)($record['check_in'] ?? ''));
                    $checkOut = trim((string)($record['check_out'] ?? ''));
                    $hasValidCheckIn = ($checkIn !== '' && $checkIn !== '00:00' && $checkIn !== '00:00:00');
                    $hasValidCheckOut = ($checkOut !== '' && $checkOut !== '00:00' && $checkOut !== '00:00:00');
                    $isIncomplete = ($hasValidCheckIn xor $hasValidCheckOut);
                    $hasActualWork = ((float)($record['work_hours'] ?? 0)) > 0;

                    if (!$isHoliday && !$isIncomplete && $hasValidCheckIn && $hasActualWork) {
                        // حساب التأخير في أيام العمل الرسمية
                        $officialStart = $this->getSystemVar('official_start_time', '08:30:00');
                        $graceMinutesCfg = (int)$this->getSystemVar('grace_period', 5);
                        $graceLate = $this->computeGracePeriodLateMinutes($checkIn, $officialStart, $graceMinutesCfg);

                        if ($isExcused) {
                            // إذا كان بإذن: حساب التأخير بدون مضاعفات
                            $totalLateHours += $this->computeLatePenaltyHoursWithExcuse($graceLate);
                        } else {
                            // بدون إذن: حساب التأخير بالمضاعفات
                            $totalLateHours += $this->computeLatePenaltyHours($graceLate, $this->conn);
                        }
                    }
                }

                $context['late_hours'] = $totalLateHours;
                $context['late_hours_calculated'] = $emp['late_hours_calculated'] ?? 0;
                $context['grace_period_late_hours_calculated'] = $emp['grace_period_late_hours_calculated'] ?? 0;
                
                // حساب خصم الانصراف المبكر - يُحسب دائماً إذا سجل خروج قبل موعد انتهاء العمل (الإذن خاص بتسجيل الحضور فقط وليس للانصراف المبكر)
                $earlyLeaveMinutes = $emp['total_early_leave_minutes'] ?? 0;
                
                // تحويل الدقائق إلى ساعات (بدون مضاعف - الانصراف المبكر يُحسب مباشرة)
                $earlyLeaveHours = 0;
                if ($earlyLeaveMinutes > 0) {
                    if ($earlyLeaveMinutes >= 60) {
                        // إذا انصرف مبكراً ساعة كاملة أو أكثر: يُحسب مباشرة بدون مضاعف
                        $earlyLeaveHours = $earlyLeaveMinutes / 60.0;
                    } elseif ($earlyLeaveMinutes > 30) {
                        // إذا انصرف مبكراً أكثر من 30 دقيقة وأقل من 60 دقيقة: يُحسب كساعة واحدة
                        $earlyLeaveHours = 1.0;
                    } else {
                        // إذا انصرف مبكراً 30 دقيقة أو أقل: يُحسب كنصف ساعة
                        $earlyLeaveHours = 0.5;
                    }
                }
                
                $context['early_leave_minutes'] = $earlyLeaveMinutes;
                $context['early_leave_hours'] = $earlyLeaveHours;
                $context['early_leave_deduction'] = 0; // سيتم حسابها من المعادلات
                
                // جلب بدل المواصلات والمكافأة الخاصة (مثل الأسبوعية) — بدل المواصلات يدوي إن وُجد
                $manualTransportMonthly = $this->getEmployeeTransportAllowanceManual($emp['employee_id'], $startDate, $endDate);
                $transportAllowance = $manualTransportMonthly !== null ? $manualTransportMonthly : $this->getActualTransportAllowance($emp['employee_code'], $startDate, $endDate);
                $specialBonus = $this->getEmployeeSpecialBonus($emp['employee_id'], $startDate, $endDate);
                
                // إضافة المتغيرات الأخرى المطلوبة
                $context['discrimination_incentive_allowance'] = $emp['discrimination_incentive_allowance'] ?? 0;
                $context['transport_allowance'] = $transportAllowance;
                $context['special_bonus'] = $specialBonus;
                // الأجر اليومي لخصم الغياب فقط (شهري): أساسي + تمييز وحوافز + مكافأة خاصة ÷ أيام العمل الشهرية
                $baseForAbsenceMonthly = ($emp['base_salary'] ?? 0) + ($context['discrimination_incentive_allowance'] ?? 0) + ($context['special_bonus'] ?? 0);
                $monthlyWorkDays = $context['monthly_work_days'] ?? 26;
                $context['daily_wage_for_absence'] = $monthlyWorkDays > 0 ? ($baseForAbsenceMonthly / $monthlyWorkDays) : 0;
                $context['overtime_pay'] = 0; // سيتم حسابها من المعادلات
                $context['holiday_overtime_pay'] = 0; // أجر الإضافي في العطلات (سيتم حسابها من المعادلات)
                $context['on_time_days'] = $emp['present_days'] ?? 0; // أيام الانتظام
                $context['absence_deduction'] = 0; // سيتم حسابها من المعادلات
                $context['late_deduction'] = 0; // سيتم حسابها من المعادلات
                $context['insurance_deduction'] = 0; // سيتم حسابها من المعادلات
                $context['net_monthly_amount'] = 0; // سيتم حسابها من المعادلات
                $context['punctuality_bonus'] = 0; // مكافأة الانتظام (سيتم حسابها من المعادلات)
                $context['absence_deduction'] = 0; // خصم الغياب (سيتم حسابها من المعادلات)
                $context['late_deduction'] = 0; // خصم التأخير (سيتم حسابها من المعادلات)
                $context['insurance_deduction'] = 0; // خصم التأمين (سيتم حسابها من المعادلات)
                $context['advance'] = $advanceAmount; // السلفة (للتوافق مع المعادلات)
                
                // استخدام DynamicFormulaEngine للحسابات
                if ($this->formulaEngine) {
                    try {
                        // جلب المعادلات من جداول تعريف الأعمدة الشهرية (مثل الأسبوعية)
                        // ملاحظة: إزالة LEFT JOIN مع dynamic_formulas لأن الجدول غير موجود
                        $stmt = $this->conn->prepare("
                            SELECT 
                                mse.column_key as formula_key,
                                COALESCE(mse.formula, '') as formula_expression
                            FROM monthly_salary_entitlements_columns mse
                            WHERE mse.is_calculated = 1
                            AND COALESCE(mse.formula, '') != ''
                            AND COALESCE(mse.formula, '') != mse.column_key
                            
                            UNION ALL
                            
                            SELECT 
                                msd.column_key as formula_key,
                                COALESCE(msd.formula, '') as formula_expression
                            FROM monthly_salary_deductions_columns msd
                            WHERE msd.is_calculated = 1
                            AND COALESCE(msd.formula, '') != ''
                            AND COALESCE(msd.formula, '') != msd.column_key
                            
                            UNION ALL
                            
                            SELECT 
                                nms.column_key as formula_key,
                                COALESCE(nms.formula, '') as formula_expression
                            FROM net_monthly_salary nms
                            WHERE nms.is_calculated = 1
                            AND COALESCE(nms.formula, '') != ''
                            AND COALESCE(nms.formula, '') != nms.column_key
                            
                            UNION ALL
                            
                            SELECT 
                                sf.formula_key,
                                sf.formula_expression
                            FROM salary_formulas sf
                            WHERE sf.is_active = 1 
                            AND (sf.formula_type = 'monthly' OR sf.formula_type = 'both')
                            AND NOT EXISTS (
                                SELECT 1 FROM monthly_salary_entitlements_columns mse2 
                                WHERE mse2.column_key = sf.formula_key AND mse2.is_calculated = 1
                            )
                            AND NOT EXISTS (
                                SELECT 1 FROM monthly_salary_deductions_columns msd2 
                                WHERE msd2.column_key = sf.formula_key AND msd2.is_calculated = 1
                            )
                            AND NOT EXISTS (
                                SELECT 1 FROM net_monthly_salary nms2 
                                WHERE nms2.column_key = sf.formula_key AND nms2.is_calculated = 1
                            )
                            ORDER BY formula_key ASC
                        ");
                        $stmt->execute();
                        $formulasData = $stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        // تسجيل جميع المعادلات المحملة للتصحيح
                        $this->writeLog("Monthly formulas data loaded: " . json_encode($formulasData));
                        
                        // استخراج formula_key فقط للتحقق
                        $requiredFormulas = array_column($formulasData, 'formula_key');
                        
                        // استخراج المتغيرات المطلوبة من جميع المعادلات
                        // هذا يضمن أن جميع المتغيرات المطلوبة (مثل overtime_pay في total_entitlements) يتم حسابها
                        $allFormulas = [];
                        foreach ($formulasData as $row) {
                            if (empty($row['formula_key'])) continue;
                            $formulaExpression = $row['formula_expression'] ?? '';
                            if (!empty($formulaExpression)) {
                                $allFormulas[$row['formula_key']] = $formulaExpression;
                            }
                        }
                        
                        // قائمة المتغيرات الأساسية المعرفة مسبقاً (لا تحتاج إلى حساب)
                        $baseVariables = [
                            'base_salary', 'transport_allowance', 'special_bonus', 'punctuality_bonus', 'advance_amount',
                            'regular_overtime_hours', 'holiday_overtime_hours', 'hourly_wage', 'daily_wage',
                            'regular_overtime_multiplier', 'holiday_work_multiplier', 'monthly_work_days', 'daily_work_hours',
                            'absent_days', 'late_hours', 'insurance_rate', 'advance_installment_amount', 'early_leave_minutes',
                            'early_leave_hours', 'on_time_days', 'meal_allowance_per_day', 'monthly_insurance_amount'
                        ];
                        
                        // قائمة الكلمات المفتاحية والثوابت
                        $keywords = ['if', 'then', 'else', 'and', 'or', 'not', 'abs', 'round', 'floor', 'ceil', 'max', 'min', 
                                    'sum', 'avg', 'count', 'sqrt', 'pow', 'log', 'exp', 'sin', 'cos', 'tan', 'asin', 'acos', 
                                    'atan', 'pi', 'e', 'true', 'false', 'null'];
                        
                        // استخراج جميع المتغيرات المطلوبة من المعادلات
                        $requiredVariables = [];
                        $processedVars = [];
                        
                        // استخراج المتغيرات من جميع المعادلات بشكل متكرر
                        $maxIterations = 10;
                        $iteration = 0;
                        while ($iteration < $maxIterations) {
                            $newVars = [];
                            foreach ($allFormulas as $formulaKey => $formulaExpression) {
                                if (empty($formulaExpression)) continue;
                                
                                // استخراج جميع المتغيرات من المعادلة
                                preg_match_all('/\b[a-zA-Z_][a-zA-Z0-9_]*\b/', $formulaExpression, $matches);
                                foreach ($matches[0] as $var) {
                                    // تجاهل الكلمات المفتاحية والثوابت والمتغيرات الأساسية
                                    if (in_array($var, $keywords) || in_array($var, $baseVariables)) {
                                        continue;
                                    }
                                    
                                    // إذا كان المتغير موجوداً في المعادلات الأخرى ولم يتم إضافته بعد
                                    if (isset($allFormulas[$var]) && !in_array($var, $requiredFormulas) && !in_array($var, $requiredVariables) && !in_array($var, $processedVars)) {
                                        $newVars[] = $var;
                                        $processedVars[] = $var;
                                    }
                                }
                            }
                            
                            if (empty($newVars)) break;
                            $requiredVariables = array_merge($requiredVariables, $newVars);
                            $iteration++;
                        }
                        
                        // إضافة المتغيرات المطلوبة إلى requiredFormulas
                        $requiredFormulas = array_merge($requiredFormulas, $requiredVariables);
                        
                        // تسجيل للتصحيح
                        $this->writeLog("Extracted required variables: " . json_encode($requiredVariables));
                        $this->writeLog("All formulas keys: " . json_encode(array_keys($allFormulas)));
                        
                        // إزالة التكرار والقيم الفارغة
                        $requiredFormulas = array_filter(array_unique($requiredFormulas));
                        $requiredFormulas = array_values($requiredFormulas); // إعادة ترقيم المصفوفة
                        
                        // تسجيل المعادلات المحملة للتصحيح
                        $this->writeLog("Monthly formulas keys loaded: " . json_encode($requiredFormulas));
                        $this->writeLog("Total formulas count: " . count($requiredFormulas));
                        
                        // ترتيب المعادلات حسب التبعيات (يجب حساب المعادلات الأساسية أولاً)
                        $formulaOrder = [
                            'daily_wage',
                            'hourly_wage',
                            'overtime_hours', // يجب حسابها قبل overtime_pay
                            'overtime_pay',
                            'holiday_overtime_pay',
                            'punctuality_bonus',
                            // حساب المستقطعات الأساسية أولاً
                            'absence_deduction', // خصم الغياب
                            'late_deduction', // خصم التأخير
                            'early_leave_deduction', // خصم الانصراف المبكر - يجب حسابها قبل total_deductions
                            'insurance_deduction', // خصم التأمين
                            'total_entitlements',
                            'total_deductions', // يعتمد على absence_deduction + late_deduction + insurance_deduction + early_leave_deduction + advance_installment
                            'net_salary'
                        ];
                        
                        // ترتيب المعادلات المطلوبة حسب الترتيب المحدد
                        $orderedFormulas = [];
                        foreach ($formulaOrder as $key) {
                            if (in_array($key, $requiredFormulas)) {
                                $orderedFormulas[] = $key;
                            }
                        }
                        // إضافة أي معادلات أخرى غير موجودة في القائمة
                        foreach ($requiredFormulas as $key) {
                            if (!in_array($key, $orderedFormulas)) {
                                $orderedFormulas[] = $key;
                            }
                        }
                        
                        // تحويل المعادلات إلى مصفوفة key-value (مثل الراتب الأسبوعي)
                        $formulas = [];
                        foreach ($formulasData as $row) {
                            if (!empty($row['formula_expression']) && !empty($row['formula_key'])) {
                                $formulas[$row['formula_key']] = $row['formula_expression'];
                            }
                        }
                        
                        // تسجيل المعادلات المحملة للتصحيح
                        error_log("Monthly formulas loaded: " . json_encode(array_keys($formulas)));
                        error_log("Monthly formulas count: " . count($formulas));
                        error_log("Ordered formulas: " . json_encode($orderedFormulas));
                        error_log("Context keys before calculation: " . json_encode(array_keys($context)));
                        error_log("Context sample values: base_salary={$context['base_salary']}, regular_overtime_hours={$context['regular_overtime_hours']}, holiday_overtime_hours={$context['holiday_overtime_hours']}");
                        
                        // حساب المعادلات بالترتيب الصحيح وتحديث السياق بعد كل حساب (مثل الراتب الأسبوعي)
                        $results = [];
                        $errors = [];
                        
                        // إذا لم توجد معادلات، نرجع البيانات الأساسية فقط
                        if (empty($orderedFormulas)) {
                            $this->writeLog("Warning: No formulas found for monthly salary calculation", "WARNING");
                            $results = [];
                        } else {
                            foreach ($orderedFormulas as $formulaKey) {
                                try {
                                    // استخدام calculateFormula مباشرة (مثل الراتب الأسبوعي)
                                    $formula = $formulas[$formulaKey] ?? '';
                                    if (empty($formula)) {
                                        $this->writeLog("Warning: Formula not found for key: $formulaKey", "WARNING");
                                        // محاولة استخدام معادلة افتراضية
                                        $defaultFormulas = [
                                            'daily_wage' => 'base_salary / monthly_work_days',
                                            'hourly_wage' => 'daily_wage / daily_work_hours',
                                            'overtime_hours' => 'regular_overtime_hours + holiday_overtime_hours',
                                            'overtime_pay' => '(regular_overtime_hours * hourly_wage * regular_overtime_multiplier) + (holiday_overtime_hours * hourly_wage * holiday_work_multiplier)',
                                            'bayat_hours' => 'bayat_days * bayat_hours_per_day * bayat_multiplier',
                                            'bayat_pay' => 'bayat_hours * hourly_wage',
                                            'total_entitlements' => 'base_salary + discrimination_incentive_allowance + transport_allowance + special_bonus + overtime_pay + punctuality_bonus + bayat_pay',
                                            'total_deductions' => 'absence_deduction + late_deduction + early_leave_deduction + insurance_deduction + advance_installment',
                                            'net_salary' => 'total_entitlements - total_deductions'
                                        ];
                                        $formula = $defaultFormulas[$formulaKey] ?? '';
                                        if (empty($formula)) {
                                            $results[$formulaKey] = 0;
                                            $context[$formulaKey] = 0;
                                            continue;
                                        }
                                        $this->writeLog("Using default formula for $formulaKey: $formula");
                                    }
                                    
                                    $result = $this->calculateFormula($formula, $context);
                                    $results[$formulaKey] = $result;
                                    // إضافة النتيجة إلى السياق فوراً لاستخدامها في المعادلات التالية
                                    $context[$formulaKey] = $result;
                                    
                                    // تسجيل للتصحيح
                                    $this->writeLog("Calculated formula $formulaKey: formula='$formula', result=$result");
                                    
                                    // تسجيل تفصيلي لـ total_entitlements
                                    if ($formulaKey === 'total_entitlements') {
                                        $this->writeLog("=== Total Entitlements Calculation ===");
                                        $this->writeLog("Formula: $formula");
                                        $this->writeLog("Context values: base_salary={$context['base_salary']}, transport_allowance={$context['transport_allowance']}, special_bonus={$context['special_bonus']}, overtime_pay={$context['overtime_pay']}, punctuality_bonus={$context['punctuality_bonus']}");
                                        $this->writeLog("Result: $result");
                                        $this->writeLog("=== End Total Entitlements Calculation ===");
                                    }
                                } catch (Exception $e) {
                                    $errors[$formulaKey] = $e->getMessage();
                                    $this->writeLog("Error evaluating formula $formulaKey: " . $e->getMessage(), "ERROR");
                                    $this->writeLog("Stack trace: " . $e->getTraceAsString(), "ERROR");
                                    // إذا فشلت معادلة مهمة، نضع قيمة افتراضية 0
                                    $results[$formulaKey] = 0;
                                    $context[$formulaKey] = 0;
                                }
                            }
                            
                            // تسجيل الأخطاء فقط إذا كانت كثيرة أو مهمة
                            if (!empty($errors)) {
                                $this->writeLog("Formula errors: " . json_encode($errors), "ERROR");
                            }
                            if (!empty($errors) && count($errors) > count($orderedFormulas) / 2) {
                                $this->writeLog("Warning: Many formula errors: " . json_encode($errors), "WARNING");
                            }
                            
                            // تسجيل النتائج النهائية
                            $this->writeLog("Results after calculation: " . json_encode(array_keys($results)));
                            $this->writeLog("Sample results: daily_wage={$results['daily_wage']}, hourly_wage={$results['hourly_wage']}, overtime_hours={$results['overtime_hours']}, overtime_pay={$results['overtime_pay']}");
                        }
                        
                        // إضافة البيانات الأساسية للموظف
                        $results['id'] = $emp['employee_id'];
                        $results['employee_id'] = $emp['employee_id'];
                        $results['name'] = $emp['employee_name'];
                        $results['employee_code'] = $emp['employee_code'];
                        $results['department'] = $emp['department_name'] ?? $emp['department'];
                        $results['department_description'] = $emp['department_description'] ?? '';
                        $results['position'] = $emp['position'] ?? '';
                        $results['location'] = $emp['location'] ?? '';
                        $results['salary_type'] = 'Monthly';
                        $results['base_salary'] = round($emp['base_salary'], 2);
                        $results['basic_monthly_salary'] = round($emp['base_salary'], 2); // للتوافق مع الواجهة
                        $results['discrimination_incentive_allowance'] = round($emp['discrimination_incentive_allowance'] ?? 0, 2);
                        $results['advance_amount'] = $advanceAmount;
                        $results['advance_installment'] = $advanceInstallment;
                        $results['advance_installment_amount'] = $advanceInstallment;
                        $results['advance_installment_number'] = $advanceInstallmentNumber;
                        $results['total_installments'] = $totalInstallments;
                        $results['advance_installment_is_paid'] = $advanceInstallmentIsPaid;
                        
                        // إضافة القيم الأساسية من السياق إلى النتائج
                        $results['transport_allowance'] = $transportAllowance;
                        $results['special_bonus'] = $specialBonus;
                        
                        // إضافة جميع القيم المحسوبة من المعادلات إلى النتائج
                        // ملاحظة: القيم المحسوبة من المعادلات موجودة بالفعل في $results من الحلقة السابقة
                        // لكن نضيفها مرة أخرى للتأكد من وجودها
                        
                        // القيم الأساسية (يتم حسابها من المعادلات أو من السياق)
                        if (!isset($results['daily_wage']) || $results['daily_wage'] == 0) {
                            $results['daily_wage'] = $context['daily_wage'] ?? ($emp['base_salary'] / ($context['monthly_work_days'] ?? 26));
                        }
                        if (!isset($results['hourly_wage']) || $results['hourly_wage'] == 0) {
                            $results['hourly_wage'] = $context['hourly_wage'] ?? ($results['daily_wage'] / ($context['daily_work_hours'] ?? 8));
                        }
                        if (!isset($results['weekly_wage']) || $results['weekly_wage'] == 0) {
                            $results['weekly_wage'] = $context['weekly_wage'] ?? ($results['daily_wage'] * ($context['weekly_work_days'] ?? 6));
                        }
                        
                        // ساعات الإضافي (من قاعدة البيانات أو من المعادلات)
                        $results['regular_overtime_hours'] = $emp['regular_overtime_hours'] ?? 0;
                        $results['holiday_overtime_hours'] = $emp['holiday_overtime_hours'] ?? 0;
                        $results['total_overtime_hours'] = $emp['total_overtime_hours'] ?? 0;
                        $results['work_hours'] = round($emp['total_work_hours'] ?? 0, 2); // إجمالي ساعات العمل
                        
                        // إذا لم تُحسب من المعادلات، استخدم القيم من قاعدة البيانات
                        if (!isset($results['overtime_hours']) || $results['overtime_hours'] == 0) {
                            $results['overtime_hours'] = $context['overtime_hours'] ?? (($emp['regular_overtime_hours'] ?? 0) + ($emp['holiday_overtime_hours'] ?? 0));
                        }
                        
                        // استخدام القيم المحسوبة من المعادلات أولاً، ثم من السياق
                        $results['overtime_pay'] = $results['overtime_pay'] ?? $context['overtime_pay'] ?? 0;
                        $results['punctuality_bonus'] = $results['punctuality_bonus'] ?? $context['punctuality_bonus'] ?? 0;
                        
                        // دائماً إعادة حساب total_entitlements يدوياً للتأكد من صحته
                        // هذا يضمن أن overtime_pay يتم إضافته بشكل صحيح
                        // ملاحظة: لا نضيف punctuality_bonus لأنه لا يظهر في قائمة المستحقات
                        $baseSalary = $results['base_salary'] ?? $context['base_salary'] ?? $emp['base_salary'] ?? 0;
                        $transportAllowance = $results['transport_allowance'] ?? $context['transport_allowance'] ?? 0;
                        $specialBonus = $results['special_bonus'] ?? $context['special_bonus'] ?? 0;
                        $overtimePay = $results['overtime_pay'] ?? $context['overtime_pay'] ?? 0;
                        $bayatPay = $results['bayat_pay'] ?? $context['bayat_pay'] ?? 0;
                        $discriminationIncentive = $results['discrimination_incentive_allowance'] ?? $context['discrimination_incentive_allowance'] ?? $emp['discrimination_incentive_allowance'] ?? 0;
                        // السلفة (advance_amount) لا تُضاف للمستحقات لأنها تُعطى باليد
                        
                        $results['total_entitlements'] = $baseSalary + $transportAllowance + $specialBonus + $overtimePay + $discriminationIncentive + $bayatPay;
                        $context['total_entitlements'] = $results['total_entitlements'];
                        
                        $this->writeLog("Recalculated total_entitlements: base_salary={$baseSalary}, transport_allowance={$transportAllowance}, special_bonus={$specialBonus}, overtime_pay={$overtimePay}, discrimination_incentive_allowance={$discriminationIncentive}, total={$results['total_entitlements']}");
                        
                        // تسجيل للتصحيح
                        $this->writeLog("Final results after formulas: daily_wage={$results['daily_wage']}, hourly_wage={$results['hourly_wage']}, overtime_hours={$results['overtime_hours']}, overtime_pay={$results['overtime_pay']}, total_entitlements={$results['total_entitlements']}");
                        
                        // إضافة قيم المستقطعات (استخدام الأسماء الموحدة فقط)
                        $results['absent_days'] = $emp['absent_days'] ?? 0;
                        // خصم الغياب = أيام الغياب × الأجر اليومي للغياب (أساسي + تمييز وحوافز + مكافأة خاصة) — لا من الأساسي فقط
                        $dailyWageForAbsence = $context['daily_wage_for_absence'] ?? 0;
                        $results['absence_deduction'] = $results['absent_days'] * $dailyWageForAbsence;
                        $context['absence_deduction'] = $results['absence_deduction'];
                        
                        $results['late_hours'] = $context['late_hours'] ?? 0;
                        // حساب late_deduction (الاسم الموحد)
                        $results['late_deduction'] = $results['late_deduction'] ?? $context['late_deduction'] ?? ($results['late_hours'] * ($results['hourly_wage'] ?? $context['hourly_wage'] ?? 0));
                        $context['late_deduction'] = $results['late_deduction'];
                        
                        // حساب insurance_deduction (الاسم الموحد)
                        // دائماً إعادة حساب التأمين بناءً على is_insured بغض النظر عن القيمة المحسوبة من المعادلات
                        $isInsured = intval($emp['is_insured'] ?? 0);
                        $monthlyInsuranceAmount = floatval($context['monthly_insurance_amount'] ?? 0);
                        
                        // فرض إعادة حساب التأمين بناءً على حالة التأمين فقط
                        if ($isInsured == 1) {
                            $results['insurance_deduction'] = $monthlyInsuranceAmount;
                            $this->writeLog("Calculating insurance_deduction for employee {$emp['employee_id']}: is_insured={$isInsured}, monthly_insurance_amount={$monthlyInsuranceAmount}, insurance_deduction={$results['insurance_deduction']}");
                        } else {
                            $results['insurance_deduction'] = 0;
                            $this->writeLog("Calculating insurance_deduction for employee {$emp['employee_id']}: is_insured={$isInsured}, insurance_deduction=0 (not insured)");
                        }
                        $context['insurance_deduction'] = $results['insurance_deduction'];
                        
                        // دائماً إعادة حساب total_deductions يدوياً للتأكد من صحته
                        $absenceDeduction = $results['absence_deduction'] ?? 0;
                        $lateDeduction = $results['late_deduction'] ?? 0;
                        $insuranceDeduction = $results['insurance_deduction'] ?? 0;
                        $advanceInstallment = $results['advance_installment'] ?? 0;
                        $earlyLeaveDeduction = $results['early_leave_deduction'] ?? 0;
                        
                        $results['total_deductions'] = $absenceDeduction + $lateDeduction + $insuranceDeduction + $advanceInstallment + $earlyLeaveDeduction;
                        $context['total_deductions'] = $results['total_deductions'];
                        
                        $this->writeLog("Recalculated total_deductions: absence_deduction={$absenceDeduction}, late_deduction={$lateDeduction}, insurance_deduction={$insuranceDeduction}, advance_installment={$advanceInstallment}, early_leave_deduction={$earlyLeaveDeduction}, total={$results['total_deductions']}");
                        
                        // إضافة صافي المرتب (دائماً إعادة حسابه للتأكد من صحته)
                        $results['net_monthly_amount'] = $results['total_entitlements'] - $results['total_deductions'];
                        $results['net_salary'] = $results['net_monthly_amount'];
                        $context['net_salary'] = $results['net_monthly_amount'];
                        
                        $this->writeLog("Recalculated net_salary: total_entitlements={$results['total_entitlements']}, total_deductions={$results['total_deductions']}, net={$results['net_monthly_amount']}");
                        
} catch (Exception $e) {
                        // في حالة فشل المحرك الديناميكي، نرجع تحذير واضح مع تفاصيل الخطأ
                        $this->writeLog("Error in monthly salary calculation: " . $e->getMessage(), "ERROR");
                        $this->writeLog("Stack trace: " . $e->getTraceAsString(), "ERROR");
                        
                        // إرجاع البيانات الأساسية فقط بدون المعادلات
                        $results = [];
                        $results['id'] = $emp['employee_id'];
                        $results['employee_id'] = $emp['employee_id'];
                        $results['name'] = $emp['employee_name'];
                        $results['employee_code'] = $emp['employee_code'];
                        $results['department'] = $emp['department_name'] ?? $emp['department'];
                        $results['department_description'] = $emp['department_description'] ?? '';
                        $results['position'] = $emp['position'] ?? '';
                        $results['location'] = $emp['location'] ?? '';
                        $results['salary_type'] = 'Monthly';
                        $results['base_salary'] = round($emp['base_salary'], 2);
                        $results['basic_monthly_salary'] = round($emp['base_salary'], 2);
                        $results['advance_amount'] = $advanceAmount;
                        $results['advance_installment'] = $advanceInstallment;
                        $results['advance_installment_amount'] = $advanceInstallment;
                        $results['advance_installment_number'] = $advanceInstallmentNumber;
                        $results['total_installments'] = $totalInstallments;
                        $results['advance_installment_is_paid'] = $advanceInstallmentIsPaid;
                        
                        // إضافة القيم الأساسية من السياق
                        // حساب total_entitlements يدوياً إذا لم يتم حسابه من المعادلات
                        // ملاحظة: لا نضيف punctuality_bonus لأنه لا يظهر في قائمة المستحقات
                        if (!isset($results['total_entitlements']) || $results['total_entitlements'] == 0) {
                            $results['total_entitlements'] = ($results['base_salary'] ?? $context['base_salary'] ?? 0) 
                                                           + ($results['discrimination_incentive_allowance'] ?? $context['discrimination_incentive_allowance'] ?? $emp['discrimination_incentive_allowance'] ?? 0)
                                                           + ($results['transport_allowance'] ?? $context['transport_allowance'] ?? 0)
                                                           + ($results['special_bonus'] ?? $context['special_bonus'] ?? 0)
                                                           + ($results['overtime_pay'] ?? $context['overtime_pay'] ?? 0)
                                                           + ($results['bayat_pay'] ?? $context['bayat_pay'] ?? 0)
                                                           + ($results['advance_amount'] ?? $context['advance_amount'] ?? 0);
                        } else {
                            $results['total_entitlements'] = $results['total_entitlements'];
                        }
                        
                        // حساب total_deductions يدوياً إذا لم يتم حسابه من المعادلات
                        if (!isset($results['total_deductions']) || $results['total_deductions'] == 0) {
                            $results['total_deductions'] = ($results['absence_deduction'] ?? $context['absence_deduction'] ?? 0)
                                                          + ($results['late_deduction'] ?? $context['late_deduction'] ?? 0)
                                                          + ($results['early_leave_deduction'] ?? $context['early_leave_deduction'] ?? 0)
                                                          + ($results['insurance_deduction'] ?? $context['insurance_deduction'] ?? 0)
                                                          + ($results['advance_installment'] ?? $context['advance_installment'] ?? 0);
                        } else {
                            $results['total_deductions'] = $results['total_deductions'];
                        }
                        
                        $results['net_monthly_amount'] = $context['net_salary'] ?? ($results['total_entitlements'] - $results['total_deductions']);
                        
                        // تسجيل التحذير ولكن لا نوقف العملية
                        $this->writeLog("Warning: Formula engine failed, using basic data only", "WARNING");
                    }
                } else {
                    // في حالة عدم توفر المحرك، نرجع خطأ
                    throw new Exception("محرك المعادلات الديناميكية غير متوفر");
                }
                $attendanceRate = $emp['attendance_days'] > 0 ? 
                    (($emp['present_days'] / $emp['attendance_days']) * 100) : 0;
                
                // استخدام النتائج الديناميكية فقط - لا توجد عواميد ثابتة
                $monthlyData[] = $results;
            }
            
            return $this->successResponse($monthlyData, 'تم تحميل بيانات الراتب الشهري من قاعدة البيانات');
            
} catch (Throwable $e) {
            $this->writeLog("Error in getMonthlySalaryData: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine(), "ERROR");
            return $this->errorResponse('خطأ في جلب بيانات الراتب الشهري: ' . $e->getMessage(), 500);
        }
    }
    
    
    private function upsertWeeklyAttendanceBonus($input) {
        $employeeId = $input['employee_id'] ?? null;
        $weekStart = $input['week_start'] ?? null;
        $weekEnd = $input['week_end'] ?? null;
        $amount = floatval($input['amount'] ?? 0);
        
        if (!$employeeId || !$weekStart || !$weekEnd) {
            return $this->errorResponse('بيانات غير مكتملة', 400);
        }
        
        // محاكاة حفظ البيانات
        $result = [
            'employee_id' => $employeeId,
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'attendance_bonus' => $amount,
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        return $this->successResponse($result, 'تم حفظ مكافأة الانتظام بنجاح');
    }
    
    private function updateEmployeeSpecialBonus($input) {
        $employeeId = $input['employee_id'] ?? null;
        $specialBonusWeekly = floatval($input['special_bonus_weekly'] ?? 0);
        $weekStart = $input['week_start'] ?? null;
        $weekEnd = $input['week_end'] ?? null;
        
        if (!$employeeId) {
            return $this->errorResponse('معرف الموظف مطلوب', 400);
        }
        
        if (!$weekStart || !$weekEnd) {
            return $this->errorResponse('تاريخ البداية والنهاية مطلوبان', 400);
        }
        
        try {
            // جلب employee_code من employee_id
            $stmt = $this->conn->prepare("SELECT employee_code FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee) {
                return $this->errorResponse('الموظف غير موجود', 404);
            }
            
            // حفظ المكافأة الخاصة في جدول manual_adjustments
            // استخدام ON DUPLICATE KEY UPDATE مع UNIQUE KEY على (employee_id, period_start, period_end, adj_key)
            $stmt = $this->conn->prepare('
                INSERT INTO manual_adjustments 
                (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    amount = VALUES(amount),
                    updated_at = NOW()
            ');
    
            $stmt->execute([
                $employeeId,
                $weekStart,
                $weekEnd,
                'special_bonus',
                $specialBonusWeekly
            ]);
            
            $result = [
                'employee_id' => $employeeId,
                'special_bonus_weekly' => $specialBonusWeekly,
                'period_start' => $weekStart,
                'period_end' => $weekEnd,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            return $this->successResponse($result, 'تم حفظ المكافأة الخاصة بنجاح');
            
        } catch (Exception $e) {
            error_log("خطأ في حفظ المكافأة الخاصة: " . $e->getMessage());
            return $this->errorResponse('خطأ في حفظ المكافأة الخاصة: ' . $e->getMessage(), 500);
        }
    }
    
    
    private function upsertMonthlySpecialBonus($input) {
        if (!$this->conn) {
            return $this->errorResponse('لا يمكن الاتصال بقاعدة البيانات', 500);
        }
        
        $employeeId = $input['employee_id'] ?? null;
        $monthStart = $input['month_start'] ?? null;
        $monthEnd = $input['month_end'] ?? null;
        $amount = floatval($input['amount'] ?? $input['special_bonus'] ?? 0);
        
        if (!$employeeId || !$monthStart || !$monthEnd) {
            return $this->errorResponse('بيانات غير مكتملة (employee_id, month_start, month_end مطلوبة)', 400);
        }
        
        try {
            // جلب employee_code من employee_id للتحقق من وجود الموظف
            $stmt = $this->conn->prepare("SELECT employee_code FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee) {
                return $this->errorResponse('الموظف غير موجود', 404);
            }
            
            // حفظ المكافأة الخاصة في جدول manual_adjustments
            // استخدام ON DUPLICATE KEY UPDATE مع UNIQUE KEY على (employee_id, period_start, period_end, adj_key)
            $stmt = $this->conn->prepare('
                INSERT INTO manual_adjustments 
                (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    amount = VALUES(amount),
                    updated_at = NOW()
            ');
    
            $stmt->execute([
                $employeeId,
                $monthStart,
                $monthEnd,
                'special_bonus',
                $amount
            ]);
            
            $result = [
                'employee_id' => $employeeId,
                'month_start' => $monthStart,
                'month_end' => $monthEnd,
                'amount' => $amount,
                'special_bonus' => $amount,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            return $this->successResponse($result, 'تم حفظ المكافأة الخاصة بنجاح');
            
        } catch (PDOException $e) {
            $this->writeLog("خطأ PDO في حفظ المكافأة الخاصة الشهرية: " . $e->getMessage(), "ERROR");
            return $this->errorResponse('خطأ في قاعدة البيانات: ' . $e->getMessage(), 500);
        } catch (Exception $e) {
            $this->writeLog("خطأ في حفظ المكافأة الخاصة الشهرية: " . $e->getMessage(), "ERROR");
            return $this->errorResponse('خطأ في حفظ المكافأة الخاصة: ' . $e->getMessage(), 500);
        }
    }
    
    private function updateEmployeeTransportAllowance($input) {
        $employeeId = $input['employee_id'] ?? null;
        $amount = floatval($input['transport_allowance'] ?? $input['amount'] ?? 0);
        $weekStart = $input['week_start'] ?? null;
        $weekEnd = $input['week_end'] ?? null;
        if (!$employeeId || !$weekStart || !$weekEnd) {
            return $this->errorResponse('معرف الموظف وتاريخ البداية والنهاية مطلوبان', 400);
        }
        try {
            $stmt = $this->conn->prepare("SELECT employee_code FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                return $this->errorResponse('الموظف غير موجود', 404);
            }
            $stmt = $this->conn->prepare('
                INSERT INTO manual_adjustments (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
            ');
            $stmt->execute([$employeeId, $weekStart, $weekEnd, 'transport_allowance', $amount]);
            return $this->successResponse([
                'employee_id' => $employeeId,
                'transport_allowance' => $amount,
                'period_start' => $weekStart,
                'period_end' => $weekEnd
            ], 'تم حفظ بدل المواصلات بنجاح');
        } catch (Exception $e) {
            error_log("خطأ في حفظ بدل المواصلات: " . $e->getMessage());
            return $this->errorResponse('خطأ في حفظ بدل المواصلات: ' . $e->getMessage(), 500);
        }
    }
    
    private function updateEmployeeBayatDays($input) {
        $employeeId = $input['employee_id'] ?? null;
        $days = max(0, floatval($input['bayat_days'] ?? $input['days'] ?? 0));
        $weekStart = $input['week_start'] ?? null;
        $weekEnd = $input['week_end'] ?? null;
        if (!$employeeId || !$weekStart || !$weekEnd) {
            return $this->errorResponse('معرف الموظف وتاريخ البداية والنهاية مطلوبان', 400);
        }
        try {
            $stmt = $this->conn->prepare("SELECT employee_code FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                return $this->errorResponse('الموظف غير موجود', 404);
            }
            $stmt = $this->conn->prepare('
                INSERT INTO manual_adjustments (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
            ');
            $stmt->execute([$employeeId, $weekStart, $weekEnd, 'bayat_days', $days]);
            return $this->successResponse([
                'employee_id' => $employeeId,
                'bayat_days' => $days,
                'period_start' => $weekStart,
                'period_end' => $weekEnd
            ], 'تم حفظ أيام البيات بنجاح');
        } catch (Exception $e) {
            error_log("خطأ في حفظ أيام البيات: " . $e->getMessage());
            return $this->errorResponse('خطأ في حفظ أيام البيات: ' . $e->getMessage(), 500);
        }
    }
    
    private function upsertMonthlyTransportAllowance($input) {
        $employeeId = $input['employee_id'] ?? null;
        $monthStart = $input['month_start'] ?? null;
        $monthEnd = $input['month_end'] ?? null;
        $amount = floatval($input['transport_allowance'] ?? $input['amount'] ?? 0);
        if (!$employeeId || !$monthStart || !$monthEnd) {
            return $this->errorResponse('بيانات غير مكتملة (employee_id, month_start, month_end مطلوبة)', 400);
        }
        try {
            $stmt = $this->conn->prepare("SELECT employee_code FROM employees WHERE id = ?");
            $stmt->execute([$employeeId]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                return $this->errorResponse('الموظف غير موجود', 404);
            }
            $stmt = $this->conn->prepare('
                INSERT INTO manual_adjustments (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
            ');
            $stmt->execute([$employeeId, $monthStart, $monthEnd, 'transport_allowance', $amount]);
            return $this->successResponse([
                'employee_id' => $employeeId,
                'transport_allowance' => $amount,
                'month_start' => $monthStart,
                'month_end' => $monthEnd
            ], 'تم حفظ بدل المواصلات بنجاح');
        } catch (Exception $e) {
            error_log("خطأ في حفظ بدل المواصلات الشهري: " . $e->getMessage());
            return $this->errorResponse('خطأ في حفظ بدل المواصلات: ' . $e->getMessage(), 500);
        }
    }
    
    private function getWeeklyFormulas() {
        $mockData = [
            [
                'id' => 1,
                'formula_name_ar' => 'حساب الراتب الأسبوعي الأساسي',
                'formula_key' => 'basic_weekly_calculation',
                'formula_expression' => 'basic_weekly_wage + attendance_bonus',
                'description_ar' => 'حساب الراتب الأسبوعي الأساسي مع مكافأة الانتظام',
                'is_active' => 1
            ],
            [
                'id' => 2,
                'formula_name_ar' => 'حساب الساعات الإضافية',
                'formula_key' => 'overtime_calculation',
                'formula_expression' => 'overtime_hours * overtime_rate',
                'description_ar' => 'حساب مبلغ الساعات الإضافية',
                'is_active' => 1
            ]
        ];
        
        return $this->successResponse($mockData, 'تم تحميل معادلات الراتب الأسبوعي');
    }
    
    private function getMonthlyFormulas() {
        $mockData = [
            [
                'id' => 1,
                'formula_name_ar' => 'حساب الراتب الشهري الأساسي',
                'formula_key' => 'basic_monthly_calculation',
                'formula_expression' => 'basic_monthly_salary + allowances',
                'description_ar' => 'حساب الراتب الشهري الأساسي مع البدلات',
                'is_active' => 1
            ],
            [
                'id' => 2,
                'formula_name_ar' => 'حساب الخصومات',
                'formula_key' => 'deductions_calculation',
                'formula_expression' => 'social_insurance + income_tax + other_deductions',
                'description_ar' => 'حساب إجمالي الخصومات',
                'is_active' => 1
            ]
        ];
        
        return $this->successResponse($mockData, 'تم تحميل معادلات الراتب الشهري');
    }
    
    private function getWeeklyVariables() {
        $mockData = [
            [
                'id' => 1,
                'variable_name_ar' => 'معدل الساعة الإضافية',
                'variable_key' => 'overtime_rate',
                'variable_value' => '25.00',
                'variable_type' => 'currency',
                'description_ar' => 'معدل الساعة الإضافية بالجنيه',
                'is_active' => 1
            ],
            [
                'id' => 2,
                'variable_name_ar' => 'مكافأة الانتظام الافتراضية',
                'variable_key' => 'default_attendance_bonus',
                'variable_value' => '100.00',
                'variable_type' => 'currency',
                'description_ar' => 'مكافأة الانتظام الافتراضية',
                'is_active' => 1
            ]
        ];
        
        return $this->successResponse($mockData, 'تم تحميل متغيرات الراتب الأسبوعي');
    }
    
    private function getMonthlyVariables() {
        $mockData = [
            [
                'id' => 1,
                'variable_name_ar' => 'نسبة التأمين الاجتماعي',
                'variable_key' => 'social_insurance_rate',
                'variable_value' => '14.00',
                'variable_type' => 'percentage',
                'description_ar' => 'نسبة التأمين الاجتماعي من الراتب',
                'is_active' => 1
            ],
            [
                'id' => 2,
                'variable_name_ar' => 'نسبة ضريبة الدخل',
                'variable_key' => 'income_tax_rate',
                'variable_value' => '10.00',
                'variable_type' => 'percentage',
                'description_ar' => 'نسبة ضريبة الدخل من الراتب',
                'is_active' => 1
            ]
        ];
        
        return $this->successResponse($mockData, 'تم تحميل متغيرات الراتب الشهري');
    }
    
    private function createWeeklyFormula($input) {
        // محاكاة إنشاء معادلة جديدة
        $result = [
            'id' => rand(100, 999),
            'formula_name_ar' => $input['formula_name_ar'] ?? 'معادلة جديدة',
            'formula_key' => $input['formula_key'] ?? 'new_formula',
            'formula_expression' => $input['formula_expression'] ?? 'basic_wage + bonus',
            'description_ar' => $input['description_ar'] ?? 'وصف المعادلة',
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        return $this->successResponse($result, 'تم إنشاء معادلة الراتب الأسبوعي بنجاح');
    }
    
    private function createMonthlyFormula($input) {
        // محاكاة إنشاء معادلة جديدة
        $result = [
            'id' => rand(100, 999),
            'formula_name_ar' => $input['formula_name_ar'] ?? 'معادلة جديدة',
            'formula_key' => $input['formula_key'] ?? 'new_formula',
            'formula_expression' => $input['formula_expression'] ?? 'basic_salary + allowances',
            'description_ar' => $input['description_ar'] ?? 'وصف المعادلة',
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        return $this->successResponse($result, 'تم إنشاء معادلة الراتب الشهري بنجاح');
    }
    
    private function createWeeklyVariable($input) {
        // محاكاة إنشاء متغير جديد
        $result = [
            'id' => rand(100, 999),
            'variable_name_ar' => $input['variable_name_ar'] ?? 'متغير جديد',
            'variable_key' => $input['variable_key'] ?? 'new_variable',
            'variable_value' => $input['variable_value'] ?? '0',
            'variable_type' => $input['variable_type'] ?? 'number',
            'description_ar' => $input['description_ar'] ?? 'وصف المتغير',
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        return $this->successResponse($result, 'تم إنشاء متغير الراتب الأسبوعي بنجاح');
    }
    
    private function createMonthlyVariable($input) {
        // محاكاة إنشاء متغير جديد
        $result = [
            'id' => rand(100, 999),
            'variable_name_ar' => $input['variable_name_ar'] ?? 'متغير جديد',
            'variable_key' => $input['variable_key'] ?? 'new_variable',
            'variable_value' => $input['variable_value'] ?? '0',
            'variable_type' => $input['variable_type'] ?? 'number',
            'description_ar' => $input['description_ar'] ?? 'وصف المتغير',
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        return $this->successResponse($result, 'تم إنشاء متغير الراتب الشهري بنجاح');
    }
    
    private function successResponse($data, $message = 'تم بنجاح') {
        return json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    }
    
    private function errorResponse($message, $code = 400) {
        http_response_code($code);
        return json_encode([
            'success' => false,
            'message' => $message,
            'error_code' => $code,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    }

    // استجابة تحذيرية بدون تغيير كود HTTP (لتجنب كسر الواجهة الأمامية)
    private function warningResponse($message, $details = []) {
        return json_encode([
            'success' => false,
            'message' => $message,
            'details' => $details,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * الحصول على بدل المواصلات الفعلي من جدول الحضور
     */
    /**
     * جلب متغير من system_variables (إدارة متغيرات النظام)
     * هذه الدالة تجلب القيم من قاعدة البيانات فقط - لا تستخدم قيماً ثابتة في الكود
     * @param string $key مفتاح المتغير
     * @param mixed $default القيمة الافتراضية فقط في حالة عدم وجود المتغير في قاعدة البيانات (fallback)
     * @return mixed قيمة المتغير من قاعدة البيانات أو القيمة الافتراضية فقط إذا لم يُوجد
     */
// دوال حساب التأخير
    private function computeGracePeriodLateMinutes($checkInTime, $officialStartTime, $graceMinutes) {
    if (empty($checkInTime)) return 0;
    $checkInTime = $this->cleanTimeString($checkInTime);
    try {
        $official = new DateTime($officialStartTime ?: '08:30:00');
        $checkIn = new DateTime($checkInTime);
        // إذا الحضور قبل أو عند الرسمي + السماح => لا تأخير
        $graceBoundary = clone $official;
        $graceBoundary->modify("+{$graceMinutes} minutes");
        if ($checkIn <= $graceBoundary) return 0;
        // بعد تجاوز حد السماح: نحسب كامل التأخير من بداية الوقت الرسمي
        $diff = $checkIn->getTimestamp() - $official->getTimestamp();
        return max(0, (int)round($diff / 60));
    } catch (Exception $e) {
        return 0;
    }
}

    private function computeLatePenaltyHours($graceLateMinutes, $pdo) {
    $m = (int)$graceLateMinutes;
    if ($m <= 0) return 0;

    // جلب معاملات الضرب من الإعدادات (بقِيَم افتراضية)
    // استخدام getSystemVar بدون $pdo لأننا في unified_salary_api_v2
    $lateHourMultiplier = 2; // قيمة افتراضية
    $latePartialHourThreshold = 0.5; // قيمة افتراضية
    $latePartialHourMultiplier = 2; // قيمة افتراضية

    if ($pdo && method_exists($pdo, 'prepare')) {
        $lateHourMultiplier = (float)$this->getSystemVar('late_hour_multiplier', 2);
        $latePartialHourThreshold = (float)$this->getSystemVar('late_partial_hour_threshold', 0.5);
        $latePartialHourMultiplier = (float)$this->getSystemVar('late_partial_hour_multiplier', 2);
    }

    if ($m >= 60) {
        $hours = $m / 60.0;
        return $hours * $lateHourMultiplier;
    } elseif ($m > 30) {
        return 1.0 * $lateHourMultiplier;
    } else {
        return $latePartialHourThreshold * $latePartialHourMultiplier;
    }
}

    private function computeLatePenaltyHoursWithExcuse($graceLateMinutes) {
    $m = (int)$graceLateMinutes;
    if ($m <= 0) return 0;

    if ($m >= 60) {
        return $m / 60.0;
    } elseif ($m > 30) {
        return 1.0;
    } else {
        return 0.5;
    }
}

    private function cleanTimeString($timeString) {
    if (empty($timeString)) return '';
    // تنظيف السلسلة من أي أحرف غير رقمية أو :
    $cleaned = preg_replace('/[^0-9:]/', '', $timeString);
    // التأكد من أنها بتنسيق HH:MM أو HH:MM:SS
    if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $cleaned, $matches)) {
        $hours = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
        $minutes = $matches[2];
        $seconds = isset($matches[3]) ? $matches[3] : '00';
        return "{$hours}:{$minutes}:{$seconds}";
    }
    return $timeString; // إرجاع كما هو إذا لم يتم التعرف عليه
}

    private function getSystemVar($key, $default = null) {
        try {
            $stmt = $this->conn->prepare("SELECT variable_value FROM system_variables WHERE variable_key = ? AND is_active = 1");
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            // إذا وُجد المتغير في قاعدة البيانات، استخدمه دائماً
            if ($val !== false && $val !== null && $val !== '') {
                error_log("System variable '{$key}' found in database: {$val}");
                return $val;
            }
            // فقط إذا لم يُوجد المتغير في قاعدة البيانات أو كان فارغاً، استخدم القيمة الافتراضية
            error_log("System variable '{$key}' not found in database or is empty, using default: {$default}");
            return $default;
        } catch (Exception $e) {
            error_log("Error getting system variable {$key}: " . $e->getMessage());
            // فقط في حالة الخطأ، استخدم القيمة الافتراضية
            return $default;
        }
    }
    
    private function getActualTransportAllowance($employeeId, $startDate, $endDate) {
        try {
            $stmt = $this->conn->prepare('
                SELECT SUM(transport_allowance) as total_transport
                FROM attendance_logs al
                JOIN employees e ON al.employee_id = e.id
                WHERE e.employee_code = ? 
                AND al.attendance_date BETWEEN ? AND ?
            ');
            $stmt->execute([$employeeId, $startDate, $endDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return floatval($result['total_transport'] ?? 0);
        } catch (Exception $e) {
            error_log("خطأ في حساب بدل المواصلات: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * جلب بدل المواصلات اليدوي للفترة من manual_adjustments (إن وُجد)
     * @return float|null المبلغ أو null إذا لم يُحفظ يدوياً
     */
    private function getEmployeeTransportAllowanceManual($employeeId, $startDate, $endDate) {
        try {
            $stmt = $this->conn->prepare("
                SELECT amount
                FROM manual_adjustments
                WHERE employee_id = ?
                AND adj_key = 'transport_allowance'
                AND period_start <= ?
                AND period_end >= ?
                ORDER BY updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([$employeeId, $endDate, $startDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result === false || $result === null) {
                return null;
            }
            return floatval($result['amount']);
        } catch (Exception $e) {
            error_log("خطأ في جلب بدل المواصلات اليدوي: " . $e->getMessage());
            return null;
        }
    }
    
    private function getEmployeeSpecialBonus($employeeId, $startDate, $endDate) {
        try {
            // جلب المكافأة الخاصة من جدول manual_adjustments
            // التحقق من تقاطع الفترات: الفترة المحفوظة يجب أن تتقاطع مع الفترة المطلوبة
            // التقاطع يحدث عندما: period_start <= endDate AND period_end >= startDate
            $stmt = $this->conn->prepare("
                SELECT amount
                FROM manual_adjustments
                WHERE employee_id = ? 
                AND adj_key = 'special_bonus'
                AND period_start <= ? 
                AND period_end >= ?
                ORDER BY updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([$employeeId, $endDate, $startDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $amount = floatval($result['amount'] ?? 0);
            
            // تسجيل للتحقق
            error_log("getEmployeeSpecialBonus: employee_id=$employeeId, startDate=$startDate, endDate=$endDate, amount=$amount");
            
            return $amount;
        } catch (Exception $e) {
            error_log("خطأ في جلب المكافأة الخاصة: " . $e->getMessage());
            return 0;
        }
    }

    private function getEmployeeBayatDays($employeeId, $startDate, $endDate) {
        try {
            $stmt = $this->conn->prepare("
                SELECT amount
                FROM manual_adjustments
                WHERE employee_id = ?
                AND adj_key = 'bayat_days'
                AND period_start <= ?
                AND period_end >= ?
                ORDER BY updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([$employeeId, $endDate, $startDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return floatval($result['amount'] ?? 0);
        } catch (Exception $e) {
            error_log('خطأ في جلب أيام البيات: ' . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * جلب مبلغ السلفة للموظف للفترة المحددة
     */
    private function getEmployeeAdvanceAmount($employeeId, $startDate, $endDate) {
        try {
            // جمع كل مبالغ السلف للفترة (advance_amount أو advance_amount_* لدعم عدة سلف)
            $stmt = $this->conn->prepare("
                SELECT COALESCE(SUM(amount), 0) as total
                FROM manual_adjustments
                WHERE employee_id = ? 
                AND (adj_key = 'advance_amount' OR adj_key LIKE 'advance_amount_%')
                AND period_start <= ? 
                AND period_end >= ?
            ");
            $stmt->execute([$employeeId, $endDate, $startDate]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $amount = floatval($row['total'] ?? 0);
            return $amount;
        } catch (Exception $e) {
            error_log("خطأ في جلب مبلغ السلفة: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * جلب المستقطع من السلف (إدخال يدوي) للفترة — صف واحد فقط (تطابق تام أولاً ثم أي تقاطع)
     * ليتطابق مع عرض جدول السلف ولا يُجمع أكثر من صف.
     */
    private function getEmployeeAdvanceDeductedManual($employeeId, $startDate, $endDate) {
        try {
            // أولاً: صف يطابق الفترة تطابقاً تاماً (كما يحفظ من تفاصيل الراتب)
            $stmt = $this->conn->prepare("
                SELECT amount FROM manual_adjustments
                WHERE employee_id = ? AND adj_key = 'advance_deducted'
                AND period_start = ? AND period_end = ?
                LIMIT 1
            ");
            $stmt->execute([$employeeId, $startDate, $endDate]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row !== false) {
                return floatval($row['amount']);
            }
            // ثانياً: أي صف يتقاطع مع الفترة (أحدث صف)
            $stmt = $this->conn->prepare("
                SELECT amount FROM manual_adjustments
                WHERE employee_id = ? AND adj_key = 'advance_deducted'
                AND period_start <= ? AND period_end >= ?
                ORDER BY updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([$employeeId, $endDate, $startDate]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row !== false ? floatval($row['amount']) : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * جلب قسط السلفة للموظف للفترة المحددة (مجموع كل الأقساط في الفترة — دعم عدة سلف)
     */
    private function getEmployeeAdvanceInstallment($employeeId, $startDate, $endDate) {
        try {
            // جلب كل الأقساط التي تتقاطع مع الفترة من كل السلف النشطة للموظف
            $stmt = $this->conn->prepare("
                SELECT ai.id, ai.amount, ai.advance_id, ai.is_paid, ai.installment_number
                FROM advance_installments ai
                INNER JOIN employee_advances ea ON ai.advance_id = ea.id
                WHERE ea.employee_id = ? 
                AND ea.status = 'activated'
                AND ai.period_start <= ? 
                AND ai.period_end >= ?
                ORDER BY ai.advance_id, ai.installment_number ASC
            ");
            $stmt->execute([$employeeId, $endDate, $startDate]);
            $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $totalAmount = 0;
            $advanceIdsToCheck = [];
            foreach ($installments as $inst) {
                $isPaid = intval($inst['is_paid'] ?? 0);
                $instAmount = floatval($inst['amount'] ?? 0);
                if ($isPaid == 2) {
                    continue; // مرحل — لا يُحسب
                }
                $totalAmount += $instAmount;
                if ($isPaid == 0) {
                    $advanceIdsToCheck[$inst['advance_id']] = true;
                }
            }
            
            // مزامنة حالة السلف (نشطة/مسددة) حسب إجمالي المستقطع الفعلي — advance_deducted
            if (!empty($advanceIdsToCheck)) {
                syncAdvanceStatusesForEmployee($this->conn, (int)$employeeId);
            }
            
            $totalInstallments = count($installments);
            $paidCount = count(array_filter($installments, function ($i) { return (int)($i['is_paid'] ?? 0) === 1; }));
            return [
                'amount' => $totalAmount,
                'installment_number' => $paidCount,
                'total_installments' => $totalInstallments,
                'is_paid' => $paidCount >= $totalInstallments ? 1 : 0
            ];
        } catch (Exception $e) {
            error_log("خطأ في جلب قسط السلفة: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * إعادة ترقيم الأقساط بشكل متسلسل
     */
    private function renumberInstallments($advanceId) {
        try {
            // جلب جميع الأقساط مرتبة حسب period_start
            $stmt = $this->conn->prepare("
                SELECT id, period_start
                FROM advance_installments
                WHERE advance_id = ?
                ORDER BY period_start ASC
            ");
            $stmt->execute([$advanceId]);
            $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // إعادة ترقيم الأقساط
            $newNumber = 1;
            foreach ($installments as $inst) {
                $updateStmt = $this->conn->prepare("
                    UPDATE advance_installments
                    SET installment_number = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$newNumber, $inst['id']]);
                $newNumber++;
            }
            
            error_log("renumberInstallments - Renumbered $newNumber installments for advance_id: $advanceId");
            return true;
        } catch (Exception $e) {
            error_log("خطأ في إعادة ترقيم الأقساط: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * ترحيل قسط السلفة للفترة التالية
     */
    private function deferAdvanceInstallment($input) {
        try {
            $employeeId = $input['employee_id'] ?? null;
            $periodStart = $input['period_start'] ?? null;
            $periodEnd = $input['period_end'] ?? null;
            $defer = isset($input['defer']) ? (int)$input['defer'] : 0;
            $salaryType = $input['salary_type'] ?? 'Weekly';
            
            // Logging للتحقق من البيانات
            error_log("deferAdvanceInstallment - employee_id: $employeeId, period_start: $periodStart, period_end: $periodEnd, defer: $defer");
            
            if (!$employeeId || !$periodStart || !$periodEnd) {
                return $this->errorResponse('معرف الموظف وفترة الراتب مطلوبة', 400);
            }
            
            // البحث عن قسط السلفة للفترة الحالية (بما في ذلك المرحلة والمدفوعة)
            // نبحث عن أي قسط يتقاطع مع الفترة المحددة
            // منطق التقاطع: period_start <= periodEnd AND period_end >= periodStart
            $installmentStmt = $this->conn->prepare("
                SELECT ai.*, ea.id as advance_id
                FROM advance_installments ai
                INNER JOIN employee_advances ea ON ai.advance_id = ea.id
                WHERE ea.employee_id = ?
                AND ea.status = 'activated'
                AND ai.period_start <= ?
                AND ai.period_end >= ?
                ORDER BY ai.installment_number ASC
                LIMIT 1
            ");
            $installmentStmt->execute([$employeeId, $periodEnd, $periodStart]);
            $installment = $installmentStmt->fetch(PDO::FETCH_ASSOC);
            
            error_log("deferAdvanceInstallment - First query result: " . ($installment ? "Found" : "Not found"));
            
            if (!$installment) {
                // محاولة أخرى: البحث بدون شرط status (في حالة تغيير حالة السلفة)
                $installmentStmt2 = $this->conn->prepare("
                    SELECT ai.*, ea.id as advance_id
                    FROM advance_installments ai
                    INNER JOIN employee_advances ea ON ai.advance_id = ea.id
                    WHERE ea.employee_id = ?
                    AND ai.period_start <= ?
                    AND ai.period_end >= ?
                    ORDER BY ai.installment_number ASC
                    LIMIT 1
                ");
                $installmentStmt2->execute([$employeeId, $periodEnd, $periodStart]);
                $installment = $installmentStmt2->fetch(PDO::FETCH_ASSOC);
                error_log("deferAdvanceInstallment - Second query result: " . ($installment ? "Found" : "Not found"));
            }
            
            if (!$installment) {
                // محاولة أخيرة: البحث عن أي قسط في نفس التاريخ
                $installmentStmt3 = $this->conn->prepare("
                    SELECT ai.*, ea.id as advance_id
                    FROM advance_installments ai
                    INNER JOIN employee_advances ea ON ai.advance_id = ea.id
                    WHERE ea.employee_id = ?
                    AND DATE(ai.period_start) <= DATE(?)
                    AND DATE(ai.period_end) >= DATE(?)
                    ORDER BY ai.installment_number ASC
                    LIMIT 1
                ");
                $installmentStmt3->execute([$employeeId, $periodEnd, $periodStart]);
                $installment = $installmentStmt3->fetch(PDO::FETCH_ASSOC);
                error_log("deferAdvanceInstallment - Third query result: " . ($installment ? "Found" : "Not found"));
            }
            
            if (!$installment) {
                // محاولة أخيرة: البحث عن أي قسط للموظف بدون شروط الفترة
                $installmentStmt4 = $this->conn->prepare("
                    SELECT ai.*, ea.id as advance_id
                    FROM advance_installments ai
                    INNER JOIN employee_advances ea ON ai.advance_id = ea.id
                    WHERE ea.employee_id = ?
                    ORDER BY ai.installment_number DESC
                    LIMIT 1
                ");
                $installmentStmt4->execute([$employeeId]);
                $installment = $installmentStmt4->fetch(PDO::FETCH_ASSOC);
                error_log("deferAdvanceInstallment - Fourth query (any installment): " . ($installment ? "Found - period_start: " . ($installment['period_start'] ?? 'N/A') . ", period_end: " . ($installment['period_end'] ?? 'N/A') : "Not found"));
            }
            
            if (!$installment) {
                return $this->errorResponse('لا يوجد قسط سلفة للفترة المحددة. تأكد من وجود سلفة نشطة للموظف في هذه الفترة.', 404);
            }
            
            // حساب إجمالي عدد الأقساط من advance_installments
            $totalStmt = $this->conn->prepare("
                SELECT COUNT(*) as total
                FROM advance_installments
                WHERE advance_id = ?
            ");
            $totalStmt->execute([$installment['advance_id']]);
            $totalResult = $totalStmt->fetch(PDO::FETCH_ASSOC);
            $totalInstallments = intval($totalResult['total'] ?? 0);
            $installment['total_installments'] = $totalInstallments;
            
            // إذا كان defer = 1، نرجع القسط للفترة التالية
            if ($defer == 1) {
                // 1. التحقق من أن القسط ليس مرحل بالفعل
                if ($installment['is_paid'] == 2) {
                    return $this->errorResponse('هذا القسط مرحل بالفعل', 400);
                }
                
                // 2. حفظ الحالة الأصلية (المبلغ والحالة) قبل التحديث
                $originalAmount = floatval($installment['amount'] ?? 0);
                $originalIsPaid = intval($installment['is_paid'] ?? 0);
                
                // إذا كان المبلغ = 0 (قسط مرحل سابقاً)، نبحث عن المبلغ الأصلي من قسط آخر
                if ($originalAmount == 0) {
                    // البحث عن أي قسط آخر في نفس السلفة لأخذ المبلغ كمرجع
                    $referenceStmt = $this->conn->prepare("
                        SELECT amount
                        FROM advance_installments
                        WHERE advance_id = ?
                        AND id != ?
                        AND amount > 0
                        ORDER BY installment_number ASC
                        LIMIT 1
                    ");
                    $referenceStmt->execute([$installment['advance_id'], $installment['id']]);
                    $referenceResult = $referenceStmt->fetch(PDO::FETCH_ASSOC);
                    if ($referenceResult) {
                        $originalAmount = floatval($referenceResult['amount'] ?? 0);
                    }
                }
                
                // 3. البحث عن آخر قسط في الأقساط (لإضافة القسط الجديد بعده)
                $lastInstallmentStmt = $this->conn->prepare("
                    SELECT period_end
                    FROM advance_installments
                    WHERE advance_id = ?
                    AND id != ?
                    ORDER BY period_end DESC, installment_number DESC
                    LIMIT 1
                ");
                $lastInstallmentStmt->execute([$installment['advance_id'], $installment['id']]);
                $lastInstallment = $lastInstallmentStmt->fetch(PDO::FETCH_ASSOC);
                
                // حساب الفترة الجديدة بعد آخر قسط
                if ($lastInstallment) {
                    $newPeriodStart = date('Y-m-d', strtotime($lastInstallment['period_end'] . ' +1 day'));
                } else {
                    // إذا لم نجد قسط آخر، نستخدم الفترة التالية للقسط الحالي
                    $newPeriodStart = date('Y-m-d', strtotime($installment['period_end'] . ' +1 day'));
                }
                
                if ($salaryType === 'Weekly') {
                    $newPeriodEnd = date('Y-m-d', strtotime($newPeriodStart . ' +6 days'));
                } else {
                    $newPeriodEnd = date('Y-m-d', strtotime($newPeriodStart . ' +1 month -1 day'));
                }
                
                // التحقق من وجود قسط في الفترة الجديدة (يجب ألا يكون موجوداً)
                $checkNewPeriodStmt = $this->conn->prepare("
                    SELECT id, is_paid
                    FROM advance_installments
                    WHERE advance_id = ?
                    AND period_start = ?
                    AND period_end = ?
                ");
                $checkNewPeriodStmt->execute([$installment['advance_id'], $newPeriodStart, $newPeriodEnd]);
                $existingInNewPeriod = $checkNewPeriodStmt->fetch(PDO::FETCH_ASSOC);
                
                $shouldAddNewInstallment = true;
                if ($existingInNewPeriod) {
                    // إذا كان القسط الموجود غير مدفوع (is_paid = 0)، فهو قسط إضافي من ترحيل سابق
                    // في هذه الحالة، لا نضيف قسط جديد، فقط نحدث القسط الحالي
                    if ($existingInNewPeriod['is_paid'] == 0) {
                        $shouldAddNewInstallment = false;
                        error_log("deferAdvanceInstallment - Found existing deferred installment in new period, skipping new installment creation");
                    } else {
                        // إذا كان القسط مدفوع أو مرحل، لا يمكن الترحيل
                        return $this->errorResponse('يوجد قسط مدفوع بالفعل في الفترة الجديدة', 400);
                    }
                }
                
                // 4. تحديث القسط الحالي ليكون is_paid = 2 (مرحل) والمبلغ = 0
                error_log("deferAdvanceInstallment - Updating installment ID: {$installment['id']}, original amount: $originalAmount, setting is_paid = 2, amount = 0");
                $updateStmt = $this->conn->prepare("
                    UPDATE advance_installments
                    SET is_paid = 2, amount = 0, paid_at = NULL
                    WHERE id = ?
                ");
                $updateStmt->execute([$installment['id']]);
                $rowsAffected = $updateStmt->rowCount();
                error_log("deferAdvanceInstallment - Update result: $rowsAffected rows affected");
                
                // 5. إضافة قسط جديد في نهاية الأقساط (بعد آخر قسط)
                $newInstallmentId = null;
                if ($shouldAddNewInstallment) {
                    // إضافة قسط جديد في نهاية الأقساط (غير مدفوع) برقم مؤقت
                    // سيتم إعادة ترقيمه لاحقاً
                    error_log("deferAdvanceInstallment - Adding new installment at end: advance_id={$installment['advance_id']}, amount=$originalAmount, period_start=$newPeriodStart, period_end=$newPeriodEnd");
                    $insertStmt = $this->conn->prepare("
                        INSERT INTO advance_installments 
                        (advance_id, installment_number, amount, period_start, period_end, is_paid)
                        VALUES (?, 999, ?, ?, ?, 0)
                    ");
                    $insertStmt->execute([
                        $installment['advance_id'],
                        $originalAmount, // المبلغ الأصلي
                        $newPeriodStart,
                        $newPeriodEnd
                    ]);
                    $newInstallmentId = $this->conn->lastInsertId();
                    error_log("deferAdvanceInstallment - New installment added with ID: $newInstallmentId");
                } else {
                    error_log("deferAdvanceInstallment - Skipping new installment creation, using existing deferred installment");
                    $newInstallmentId = $existingInNewPeriod['id'];
                }
                
                // 6. إعادة ترقيم جميع الأقساط بشكل متسلسل
                $this->renumberInstallments($installment['advance_id']);
                
                // 7. حساب إجمالي الأقساط
                $newTotalStmt = $this->conn->prepare("
                    SELECT COUNT(*) as total
                    FROM advance_installments
                    WHERE advance_id = ?
                ");
                $newTotalStmt->execute([$installment['advance_id']]);
                $newTotalResult = $newTotalStmt->fetch(PDO::FETCH_ASSOC);
                $newTotalInstallments = intval($newTotalResult['total'] ?? 0);
                
                return $this->successResponse([
                    'message' => 'تم ترحيل قسط السلفة للفترة التالية بنجاح',
                    'advance_id' => $installment['advance_id'],
                    'installment_id' => $installment['id'],
                    'new_installment_id' => $newInstallmentId,
                    'total_installments' => $newTotalInstallments,
                    'deferred' => true
                ]);
            } else {
                // إلغاء الترحيل - إرجاع القسط للفترة الحالية
                // 1. التحقق من أن القسط مرحل بالفعل
                if ($installment['is_paid'] != 2) {
                    return $this->errorResponse('هذا القسط غير مرحل', 400);
                }
                
                // 2. البحث عن القسط الإضافي الذي تم إضافته عند الترحيل
                // القسط الإضافي هو آخر قسط في الأقساط (الأكبر installment_number أو period_start)
                // لأنه تم إضافته في نهاية الأقساط عند الترحيل
                $lastInstallmentStmt = $this->conn->prepare("
                    SELECT ai.*
                    FROM advance_installments ai
                    WHERE ai.advance_id = ?
                    AND ai.id != ?
                    AND ai.is_paid = 0
                    ORDER BY ai.period_start DESC, ai.installment_number DESC
                    LIMIT 1
                ");
                $lastInstallmentStmt->execute([$installment['advance_id'], $installment['id']]);
                $additionalInstallment = $lastInstallmentStmt->fetch(PDO::FETCH_ASSOC);
                
                // إذا لم نجد قسط غير مدفوع في النهاية، نبحث عن آخر قسط بغض النظر عن الحالة
                if (!$additionalInstallment) {
                    $lastInstallmentStmt2 = $this->conn->prepare("
                        SELECT ai.*
                        FROM advance_installments ai
                        WHERE ai.advance_id = ?
                        AND ai.id != ?
                        ORDER BY ai.period_start DESC, ai.installment_number DESC
                        LIMIT 1
                    ");
                    $lastInstallmentStmt2->execute([$installment['advance_id'], $installment['id']]);
                    $additionalInstallment = $lastInstallmentStmt2->fetch(PDO::FETCH_ASSOC);
                }
                
                // 3. إذا وجد قسط إضافي، نأخذ مبلغه ونحذفه
                // إذا لم نجد، نستخدم المبلغ من أي قسط آخر في نفس السلفة كمرجع
                $originalAmount = floatval($installment['amount'] ?? 0);
                
                if ($additionalInstallment) {
                    $originalAmount = floatval($additionalInstallment['amount'] ?? 0);
                    
                    // حذف القسط الإضافي (الذي تم إضافته في نهاية الأقساط)
                    error_log("deferAdvanceInstallment - Deleting additional installment ID: {$additionalInstallment['id']}, amount: $originalAmount, period_start: {$additionalInstallment['period_start']}");
                    $deleteStmt = $this->conn->prepare("
                        DELETE FROM advance_installments
                        WHERE id = ?
                    ");
                    $deleteStmt->execute([$additionalInstallment['id']]);
                } else {
                    // إذا لم نجد قسط إضافي، نبحث عن أي قسط آخر في نفس السلفة لأخذ المبلغ كمرجع
                    $referenceStmt = $this->conn->prepare("
                        SELECT amount
                        FROM advance_installments
                        WHERE advance_id = ?
                        AND id != ?
                        AND amount > 0
                        ORDER BY period_start ASC
                        LIMIT 1
                    ");
                    $referenceStmt->execute([$installment['advance_id'], $installment['id']]);
                    $referenceResult = $referenceStmt->fetch(PDO::FETCH_ASSOC);
                    if ($referenceResult) {
                        $originalAmount = floatval($referenceResult['amount'] ?? 0);
                    }
                }
                
                // 4. إرجاع القسط الحالي: is_paid = 0 (غير مدفوع) و amount = المبلغ الأصلي
                // لأن القسط المرحل لم يدفع بعد (إذا كان مدفوع، لم يكن مرحل)
                error_log("deferAdvanceInstallment - Reverting installment ID: {$installment['id']}, setting is_paid = 0, amount = $originalAmount");
                $updateStmt = $this->conn->prepare("
                    UPDATE advance_installments
                    SET is_paid = 0, amount = ?, paid_at = NULL
                    WHERE id = ?
                ");
                $updateStmt->execute([$originalAmount, $installment['id']]);
                
                // 5. إعادة ترقيم جميع الأقساط بشكل متسلسل
                $this->renumberInstallments($installment['advance_id']);
                
                // 6. حساب إجمالي الأقساط بعد الحذف
                $finalTotalStmt = $this->conn->prepare("
                    SELECT COUNT(*) as total
                    FROM advance_installments
                    WHERE advance_id = ?
                ");
                $finalTotalStmt->execute([$installment['advance_id']]);
                $finalTotalResult = $finalTotalStmt->fetch(PDO::FETCH_ASSOC);
                $finalTotalInstallments = intval($finalTotalResult['total'] ?? 0);
                
                return $this->successResponse([
                    'message' => 'تم إلغاء ترحيل قسط السلفة',
                    'advance_id' => $installment['advance_id'],
                    'installment_id' => $installment['id'],
                    'total_installments' => $finalTotalInstallments,
                    'deferred' => false
                ]);
            }
        } catch (Exception $e) {
            error_log("خطأ في ترحيل قسط السلفة: " . $e->getMessage());
            return $this->errorResponse('حدث خطأ في ترحيل قسط السلفة: ' . $e->getMessage(), 500);
        }
    }
}

// تشغيل API - التقاط أي خطأ (Exception أو Error) لضمان استجابة JSON دائماً
try {
    $api = new UnifiedSalaryAPIv2();
    $output = $api->handleRequest();
    if ($output !== null && $output !== '') {
        echo $output;
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في الخادم: لم تُرجع العملية استجابة',
            'error' => 'Empty response'
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $e) {
    http_response_code(500);
    error_log("UnifiedSalaryAPIv2 fatal: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في الخادم',
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}
?>