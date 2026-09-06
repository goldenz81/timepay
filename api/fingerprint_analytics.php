<?php
/**
 * تحليل بيانات البصمة وإنتاج التقارير
 * 
 * @author TimePay System
 * @version 1.0
 * @date 2025-01-19
 */

require_once 'cors_headers.php';
require_once 'config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    if ($action === 'get_department_analysis') {
        // تحليل الأقسام
        $stmt = $pdo->query("
            SELECT 
                department,
                COUNT(DISTINCT ac_no) as employee_count,
                COUNT(*) as total_records,
                SUM(CASE WHEN is_absent = 1 THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN is_absent = 0 THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN late_time IS NOT NULL THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN ot_time IS NOT NULL THEN 1 ELSE 0 END) as overtime_days,
                ROUND(AVG(CASE WHEN work_time IS NOT NULL THEN TIME_TO_SEC(work_time)/3600 ELSE 0 END), 2) as avg_work_hours,
                ROUND((SUM(CASE WHEN is_absent = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage
            FROM fingerprint_attendance 
            WHERE department IS NOT NULL
            GROUP BY department
            ORDER BY attendance_percentage DESC
        ");
        
        $departmentAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحليل الأقسام بنجاح',
            'department_analysis' => $departmentAnalysis
        ]);
        
    } elseif ($action === 'get_employee_analysis') {
        $acNo = $input['ac_no'] ?? '';
        
        if (empty($acNo)) {
            throw new Exception('رقم الموظف مطلوب');
        }
        
        // تحليل موظف محدد
        $stmt = $pdo->prepare("
            SELECT 
                ac_no,
                employee_name,
                department,
                COUNT(*) as total_days,
                SUM(CASE WHEN is_absent = 1 THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN is_absent = 0 THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN late_time IS NOT NULL THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN early_time IS NOT NULL THEN 1 ELSE 0 END) as early_days,
                SUM(CASE WHEN ot_time IS NOT NULL THEN 1 ELSE 0 END) as overtime_days,
                ROUND(AVG(CASE WHEN work_time IS NOT NULL THEN TIME_TO_SEC(work_time)/3600 ELSE 0 END), 2) as avg_work_hours,
                ROUND((SUM(CASE WHEN is_absent = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage,
                MIN(attendance_date) as first_date,
                MAX(attendance_date) as last_date
            FROM fingerprint_attendance 
            WHERE ac_no = ?
            GROUP BY ac_no, employee_name, department
        ");
        
        $stmt->execute([$acNo]);
        $employeeAnalysis = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // تفاصيل يومية
        $stmt = $pdo->prepare("
            SELECT 
                attendance_date,
                clock_in,
                clock_out,
                late_time,
                early_time,
                is_absent,
                ot_time,
                work_time,
                week_day
            FROM fingerprint_attendance 
            WHERE ac_no = ?
            ORDER BY attendance_date
        ");
        
        $stmt->execute([$acNo]);
        $dailyDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحليل الموظف بنجاح',
            'employee_analysis' => $employeeAnalysis,
            'daily_details' => $dailyDetails
        ]);
        
    } elseif ($action === 'get_attendance_trends') {
        // اتجاهات الحضور
        $stmt = $pdo->query("
            SELECT 
                attendance_date,
                week_day,
                COUNT(DISTINCT ac_no) as total_employees,
                SUM(CASE WHEN is_absent = 1 THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN is_absent = 0 THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN late_time IS NOT NULL THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN ot_time IS NOT NULL THEN 1 ELSE 0 END) as overtime_count,
                ROUND((SUM(CASE WHEN is_absent = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as daily_attendance_percentage
            FROM fingerprint_attendance 
            GROUP BY attendance_date, week_day
            ORDER BY attendance_date
        ");
        
        $attendanceTrends = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحليل اتجاهات الحضور بنجاح',
            'attendance_trends' => $attendanceTrends
        ]);
        
    } elseif ($action === 'get_overtime_analysis') {
        // تحليل العمل الإضافي
        $stmt = $pdo->query("
            SELECT 
                ac_no,
                employee_name,
                department,
                COUNT(CASE WHEN ot_time IS NOT NULL THEN 1 END) as overtime_days,
                SUM(CASE WHEN ot_time IS NOT NULL THEN TIME_TO_SEC(ot_time)/3600 ELSE 0 END) as total_overtime_hours,
                ROUND(AVG(CASE WHEN ot_time IS NOT NULL THEN TIME_TO_SEC(ot_time)/3600 ELSE 0 END), 2) as avg_overtime_hours,
                MAX(ot_time) as max_overtime,
                MIN(ot_time) as min_overtime
            FROM fingerprint_attendance 
            WHERE ot_time IS NOT NULL
            GROUP BY ac_no, employee_name, department
            ORDER BY total_overtime_hours DESC
        ");
        
        $overtimeAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحليل العمل الإضافي بنجاح',
            'overtime_analysis' => $overtimeAnalysis
        ]);
        
    } elseif ($action === 'get_late_analysis') {
        // تحليل التأخير
        $stmt = $pdo->query("
            SELECT 
                ac_no,
                employee_name,
                department,
                COUNT(CASE WHEN late_time IS NOT NULL THEN 1 END) as late_days,
                SUM(CASE WHEN late_time IS NOT NULL THEN TIME_TO_SEC(late_time)/3600 ELSE 0 END) as total_late_hours,
                ROUND(AVG(CASE WHEN late_time IS NOT NULL THEN TIME_TO_SEC(late_time)/3600 ELSE 0 END), 2) as avg_late_hours,
                MAX(late_time) as max_late,
                MIN(late_time) as min_late
            FROM fingerprint_attendance 
            WHERE late_time IS NOT NULL
            GROUP BY ac_no, employee_name, department
            ORDER BY total_late_hours DESC
        ");
        
        $lateAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم تحليل التأخير بنجاح',
            'late_analysis' => $lateAnalysis
        ]);
        
    } else {
        throw new Exception('إجراء غير صحيح');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في تحليل بيانات البصمة: ' . $e->getMessage()
    ]);
}
?>
