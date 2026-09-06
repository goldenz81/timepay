<?php
/**
 * API for managing employee advances
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';
require_once __DIR__ . '/advance_week_helpers.php';
require_once __DIR__ . '/advance_fifo_helpers.php';

/** مفتاح تعديل «سلف سابقة» يدوياً في manual_adjustments */
define('ADVANCE_PREVIOUS_BALANCE_KEY', 'advance_previous_balance');

try {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    // دمج $_GET مع $input للسماح بقراءة المعاملات من URL
    $input = array_merge($_GET, $input);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_advances':
            getAdvances($pdo, $input);
            break;
        case 'create_advance':
            createAdvance($pdo, $input);
            break;
        case 'activate_advance':
            activateAdvance($pdo, $input);
            break;
        case 'cancel_advance':
            cancelAdvance($pdo, $input);
            break;
        case 'get_employee_active_advance':
            getEmployeeActiveAdvance($pdo, $input);
            break;
        case 'get_advance_details':
            getAdvanceDetails($pdo, $input);
            break;
        case 'delete_advance':
            deleteAdvance($pdo, $input);
            break;
        case 'get_advances_weekly_summary':
            getAdvancesWeeklySummary($pdo, $input);
            break;
        case 'get_advances_monthly_summary':
            getAdvancesMonthlySummary($pdo, $input);
            break;
        case 'update_advance':
            updateAdvance($pdo, $input);
            break;
        case 'set_advance_deducted':
            setAdvanceDeducted($pdo, $input);
            break;
        case 'get_employee_previous_balance':
            getEmployeePreviousBalance($pdo, $input);
            break;
        case 'set_employee_previous_balance':
            setEmployeePreviousBalance($pdo, $input);
            break;
        case 'sync_grant_start_dates':
            syncGrantStartDates($pdo);
            break;
        default:
            echo json_encode([
                'success' => false,
                'message' => 'إجراء غير معروف'
            ], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * @return array [advance_id => total_paid_amount]
 */
function computePaidAmountsFromDeductions($pdo, $employeeId, $salaryType) {
    $employeeId = (int)$employeeId;
    if (!$employeeId) {
        return [];
    }
    $allPaid = computeFifoPaidForEmployees($pdo, [$employeeId]);
    if (!$allPaid) {
        return [];
    }
    $stmt = $pdo->prepare('SELECT id FROM employee_advances WHERE employee_id = ? AND salary_type = ?');
    $stmt->execute([$employeeId, $salaryType]);
    $filtered = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $id = (int)$row['id'];
        if (isset($allPaid[$id])) {
            $filtered[$id] = $allPaid[$id];
        }
    }
    return $filtered;
}

/**
 * @return array [advance_id => total_paid_amount]
 */
function computeAllPaidAmounts($pdo, $rows) {
    if (!$rows) {
        return [];
    }
    $employeeIds = [];
    $advanceIds = [];
    foreach ($rows as $row) {
        $eid = (int)($row['employee_id'] ?? 0);
        $aid = (int)($row['id'] ?? 0);
        if ($eid) {
            $employeeIds[] = $eid;
        }
        if ($aid) {
            $advanceIds[$aid] = true;
        }
    }
    $allPaid = computeFifoPaidForEmployees($pdo, $employeeIds);
    if (!$advanceIds) {
        return $allPaid;
    }
    return array_intersect_key($allPaid, $advanceIds);
}

/**
 * رصيد مديونية سابقة = مجموع المتبقي من سلف قبل الفترة (FIFO — نفس منطق قائمة السلف)
 */
function computePreviousBalanceCalculated($pdo, $employeeId, $beforeDate, $statusFilter = null) {
    return computeUnpaidAdvancesBeforeDate($pdo, $employeeId, $beforeDate, $statusFilter);
}

function getPreviousBalanceOverride($pdo, $employeeId, $periodStart, $periodEnd) {
    $stmt = $pdo->prepare("
        SELECT amount FROM manual_adjustments
        WHERE employee_id = ? AND adj_key = ? AND period_start = ? AND period_end = ?
        LIMIT 1
    ");
    $stmt->execute([(int)$employeeId, ADVANCE_PREVIOUS_BALANCE_KEY, $periodStart, $periodEnd]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? (float)$row['amount'] : null;
}

function resolvePreviousBalance($pdo, $employeeId, $beforeDate, $periodStart, $periodEnd, $statusFilter = null) {
    $calculated = computePreviousBalanceCalculated($pdo, $employeeId, $beforeDate, $statusFilter);
    $override = null;
    if ($periodStart && $periodEnd
        && preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart)
        && preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodEnd)) {
        $override = getPreviousBalanceOverride($pdo, $employeeId, $periodStart, $periodEnd);
    }
    $effective = $override !== null ? $override : $calculated;
    return [
        'calculated' => round($calculated, 2),
        'manual_override' => $override !== null ? round($override, 2) : null,
        'previous_balance' => round(max(0, $effective), 2),
        'is_manual' => $override !== null,
    ];
}

function getEmployeePreviousBalance($pdo, $input) {
    try {
        $employeeId = (int)($input['employee_id'] ?? 0);
        $periodStart = $input['period_start'] ?? null;
        $periodEnd = $input['period_end'] ?? null;
        $beforeDate = $input['before_date'] ?? $periodStart;
        $status = $input['status'] ?? null;

        if (!$employeeId || !$periodStart || !$periodEnd
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart)
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodEnd)) {
            echo json_encode([
                'success' => false,
                'message' => 'employee_id و period_start و period_end مطلوبة',
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        if (!$beforeDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $beforeDate)) {
            $beforeDate = $periodStart;
        }

        $data = resolvePreviousBalance($pdo, $employeeId, $beforeDate, $periodStart, $periodEnd, $status);
        $data['period_start'] = $periodStart;
        $data['period_end'] = $periodEnd;
        $data['before_date'] = $beforeDate;

        echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ: ' . $e->getMessage(),
        ], JSON_UNESCAPED_UNICODE);
    }
}

function setEmployeePreviousBalance($pdo, $input) {
    try {
        $employeeId = (int)($input['employee_id'] ?? 0);
        $periodStart = $input['period_start'] ?? null;
        $periodEnd = $input['period_end'] ?? null;
        $clear = !empty($input['clear']);

        if (!$employeeId || !$periodStart || !$periodEnd
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart)
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodEnd)) {
            echo json_encode([
                'success' => false,
                'message' => 'employee_id و period_start و period_end مطلوبة',
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($clear) {
            $stmt = $pdo->prepare("
                DELETE FROM manual_adjustments
                WHERE employee_id = ? AND adj_key = ? AND period_start = ? AND period_end = ?
            ");
            $stmt->execute([$employeeId, ADVANCE_PREVIOUS_BALANCE_KEY, $periodStart, $periodEnd]);
            echo json_encode([
                'success' => true,
                'message' => 'تم إلغاء التعديل اليدوي — يُستخدم الرصيد المحسوب',
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        if (!array_key_exists('amount', $input)) {
            echo json_encode(['success' => false, 'message' => 'amount مطلوب'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $amount = (float)$input['amount'];
        if ($amount < 0) {
            echo json_encode(['success' => false, 'message' => 'رصيد السلف السابقة لا يمكن أن يكون سالباً'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $stmt = $pdo->prepare("
            INSERT INTO manual_adjustments (employee_id, period_start, period_end, adj_key, amount, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
        ");
        $stmt->execute([$employeeId, $periodStart, $periodEnd, ADVANCE_PREVIOUS_BALANCE_KEY, $amount]);

        echo json_encode([
            'success' => true,
            'message' => 'تم حفظ رصيد السلف السابقة يدوياً',
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ: ' . $e->getMessage(),
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * جلب جميع السلف
 */
function getAdvances($pdo, $input) {
    try {
        $status = $input['status'] ?? null;
        $salaryType = $input['salary_type'] ?? null;
        $employeeId = $input['employee_id'] ?? null;
        $weekStart = $input['week_start'] ?? null;
        $weekEnd = $input['week_end'] ?? null;
        $month = $input['month'] ?? null;
        
        $sql = "
            SELECT 
                ea.*,
                COALESCE(NULLIF(TRIM(e.name_ar), ''), e.name) as employee_name,
                e.name,
                e.name_ar,
                e.employee_code,
                e.department,
                e.cost_center,
                COUNT(ai.id) as total_installments,
                SUM(CASE WHEN ai.is_paid = 1 THEN 1 ELSE 0 END) as paid_installments,
                SUM(CASE WHEN ai.is_paid = 0 THEN 1 ELSE 0 END) as remaining_installments,
                COALESCE(SUM(CASE WHEN ai.is_paid = 1 THEN ai.amount ELSE 0 END), 0) as paid_amount_raw
            FROM employee_advances ea
            LEFT JOIN employees e ON ea.employee_id = e.id
            LEFT JOIN advance_installments ai ON ea.id = ai.advance_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($status) {
            $sql .= " AND ea.status = ?";
            $params[] = $status;
        }
        
        if ($salaryType) {
            $sql .= " AND ea.salary_type = ?";
            $params[] = $salaryType;
        }
        
        if ($employeeId) {
            $sql .= " AND ea.employee_id = ?";
            $params[] = $employeeId;
        }

        if ($weekStart && $weekEnd && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStart) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekEnd)) {
            $sql .= ' AND DATE(COALESCE(ea.start_date, ea.created_at)) BETWEEN ? AND ?';
            $params[] = $weekStart;
            $params[] = $weekEnd;
        } elseif ($month && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $monthStart = $month . '-01';
            $monthEnd = date('Y-m-t', strtotime($monthStart));
            $sql .= ' AND DATE(COALESCE(ea.start_date, ea.created_at)) BETWEEN ? AND ?';
            $params[] = $monthStart;
            $params[] = $monthEnd;
        }
        
        $sql .= " GROUP BY ea.id ORDER BY ea.created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($employeeId) {
            syncAdvanceStatusesForEmployee($pdo, (int)$employeeId);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // توزيع advance_deducted لكل الموظفين — استعلامين فقط بدل N+1
        $paidFromDeductions = computeAllPaidAmounts($pdo, $rows);
        
        // حساب المسدد والمتبقي
        $advances = [];
        foreach ($rows as $row) {
            $advanceAmount = (float)($row['advance_amount'] ?? 0);
            $aid = (int)($row['id'] ?? 0);
            $fromInstallments = (float)($row['paid_amount_raw'] ?? 0);
            $fromDeductions = isset($paidFromDeductions[$aid]) ? (float)$paidFromDeductions[$aid] : 0;
            $paidAmount = max($fromInstallments, $fromDeductions);
            $paidAmount = max(0, min($paidAmount, $advanceAmount));
            $remainingAmount = max(0, $advanceAmount - $paidAmount);
            $row['paid_amount'] = $paidAmount;
            $row['remaining_amount'] = $remainingAmount;
            unset($row['paid_amount_raw']);
            $advances[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $advances
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في جلب السلف: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * إنشاء سلفة جديدة
 */
function createAdvance($pdo, $input) {
    try {
        $employeeId = $input['employee_id'] ?? null;
        $salaryType = $input['salary_type'] ?? null;
        $advanceAmount = floatval($input['advance_amount'] ?? 0);
        $duration = isset($input['duration']) ? intval(round(floatval($input['duration']))) : 0;
        $durationType = $input['duration_type'] ?? ($salaryType === 'Weekly' ? 'weekly' : 'monthly');
        $notes = $input['notes'] ?? null;
        $createdDate = $input['created_date'] ?? date('Y-m-d'); // Default to today if not provided
        $startDate = $input['start_date'] ?? null; // تاريخ بداية السلفة (أول يوم عمل)
        
        // التحقق من البيانات المطلوبة
        if (!$employeeId || !$salaryType || !$advanceAmount) {
            echo json_encode([
                'success' => false,
                'message' => 'الموظف ونوع الراتب ومبلغ السلفة مطلوبة'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // التحقق من صحة التاريخ
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $createdDate)) {
            $createdDate = date('Y-m-d');
        }
        
        // السلف الأسبوعي والشهري: تاريخ البداية = تاريخ المنح (نفس اليوم)
        if ($salaryType === 'Weekly') {
            if (!$duration || $duration < 1) {
                $duration = 1;
            }
            if (!$startDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
                $startDate = $createdDate;
            }
            $installmentAmount = $advanceAmount; // قسط واحد = كامل المبلغ (يُخصم حسب الاتفاق)
        } else {
            // الراتب الشهري: مثل الأسبوعي — بدون مدة، خصم من تفاصيل الراتب الشهري
            if (!$duration || $duration < 1) {
                $duration = 1;
            }
            $durationType = 'monthly';
            if (!$startDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
                $startDate = $createdDate;
            }
            $installmentAmount = $advanceAmount; // كامل المبلغ (يُخصم حسب الاتفاق)
        }
        
        // السماح بأكثر من سلفة نشطة للموظف في آن واحد — تم إزالة التحقق
        
        // إدراج السلفة مع تحديد created_at و start_date يدوياً
        $stmt = $pdo->prepare("
            INSERT INTO employee_advances 
            (employee_id, salary_type, advance_amount, installment_amount, duration, duration_type, status, notes, created_at, start_date)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        ");
        
        $stmt->execute([
            $employeeId,
            $salaryType,
            $advanceAmount,
            $installmentAmount,
            $duration,
            $durationType,
            $notes,
            $createdDate . ' ' . date('H:i:s'), // Use provided date with current time
            $startDate // تاريخ بداية السلفة (أول يوم عمل)
        ]);
        
        $advanceId = (int)$pdo->lastInsertId();
        $shouldActivate = !isset($input['activate']) || !in_array($input['activate'], [false, 0, '0', 'false'], true);

        if ($shouldActivate) {
            $activateResult = activateAdvanceCore($pdo, $advanceId, $input['activated_by'] ?? null);
            if (!$activateResult['success']) {
                $pdo->prepare('DELETE FROM employee_advances WHERE id = ?')->execute([$advanceId]);
            }
            echo json_encode($activateResult, JSON_UNESCAPED_UNICODE);
            return;
        }

        echo json_encode([
            'success' => true,
            'message' => 'تم إنشاء السلفة (معلّقة — يمكن تفعيلها لاحقاً)',
            'data' => ['id' => $advanceId]
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في إنشاء السلفة: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * تفعيل سلفة (منطق داخلي — يُرجع مصفوفة)
 */
function activateAdvanceCore($pdo, $advanceId, $activatedBy = null) {
    try {
        $advanceId = (int)$advanceId;
        if (!$advanceId) {
            return ['success' => false, 'message' => 'معرف السلفة مطلوب'];
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT * FROM employee_advances WHERE id = ?');
        $stmt->execute([$advanceId]);
        $advance = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$advance) {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'السلفة غير موجودة'];
        }

        if ($advance['status'] !== 'pending') {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'لا يمكن تفعيل السلفة. الحالة الحالية: ' . $advance['status']];
        }

        $stmt = $pdo->prepare('
            UPDATE employee_advances
            SET status = \'activated\', activated_at = NOW(), activated_by = ?
            WHERE id = ?
        ');
        $stmt->execute([$activatedBy, $advanceId]);

        if (empty($advance['start_date'])) {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'تاريخ بداية السلفة غير محدد'];
        }

        $startDate = new DateTime($advance['start_date']);
        $duration = (int)$advance['duration'];

        // مدة 1: تسجيل مبلغ السلفة في الفترة فقط — الخصم يكون حصراً عبر «المستقطع من السلف» في الراتب
        if ($duration === 1) {
            if ($advance['salary_type'] === 'Weekly') {
                $period = advanceWeeklyPeriodFromStart($startDate->format('Y-m-d'));
                $periodStart = $period['week_start'];
                $periodEnd = $period['week_end'];
            } else {
                $periodStart = (clone $startDate)->modify('first day of this month')->format('Y-m-d');
                $periodEnd = (clone $startDate)->modify('last day of this month')->format('Y-m-d');
            }
            $adjKey = 'advance_amount_' . $advanceId;
            $stmt = $pdo->prepare('
                INSERT INTO manual_adjustments
                (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([
                $advance['employee_id'],
                $periodStart,
                $periodEnd,
                $adjKey,
                $advance['advance_amount'],
            ]);
            $pdo->commit();
            return [
                'success' => true,
                'message' => 'تم تفعيل السلفة بنجاح',
                'data' => ['id' => $advanceId],
            ];
        }

        if ($advance['salary_type'] === 'Weekly') {
            $currentWeekStart = clone $startDate;
            $currentWeekStart->setTime(0, 0, 0);
            $currentWeekEnd = clone $currentWeekStart;
            $currentWeekEnd->modify('+5 days');
            $currentWeekEnd->setTime(23, 59, 59);
            $adjKey = 'advance_amount_' . $advanceId;
            $stmt = $pdo->prepare('
                INSERT INTO manual_adjustments
                (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([
                $advance['employee_id'],
                $currentWeekStart->format('Y-m-d'),
                $currentWeekEnd->format('Y-m-d'),
                $adjKey,
                $advance['advance_amount'],
            ]);
            $nextWeekStart = clone $currentWeekStart;
            $nextWeekStart->modify('+7 days');
            $nextWeekStart->setTime(0, 0, 0);
            for ($i = 1; $i <= $duration; $i++) {
                $periodStart = clone $nextWeekStart;
                $periodStart->modify('+' . (($i - 1) * 7) . ' days');
                $periodEnd = clone $periodStart;
                $periodEnd->modify('+5 days');
                $stmt = $pdo->prepare('
                    INSERT INTO advance_installments
                    (advance_id, period_start, period_end, installment_number, amount)
                    VALUES (?, ?, ?, ?, ?)
                ');
                $stmt->execute([
                    $advanceId,
                    $periodStart->format('Y-m-d'),
                    $periodEnd->format('Y-m-d'),
                    $i,
                    $advance['installment_amount'],
                ]);
            }
        } else {
            $currentMonthStart = clone $startDate;
            $currentMonthStart->setTime(0, 0, 0);
            $currentMonthStart->modify('first day of this month');
            $currentMonthEnd = clone $currentMonthStart;
            $currentMonthEnd->modify('last day of this month');
            $currentMonthEnd->setTime(23, 59, 59);
            $adjKey = 'advance_amount_' . $advanceId;
            $stmt = $pdo->prepare('
                INSERT INTO manual_adjustments
                (employee_id, period_start, period_end, adj_key, amount, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([
                $advance['employee_id'],
                $currentMonthStart->format('Y-m-d'),
                $currentMonthEnd->format('Y-m-d'),
                $adjKey,
                $advance['advance_amount'],
            ]);
            $nextMonthStart = clone $currentMonthStart;
            $nextMonthStart->modify('+1 month');
            $nextMonthStart->modify('first day of this month');
            $nextMonthStart->setTime(0, 0, 0);
            for ($i = 1; $i <= $duration; $i++) {
                $periodStart = clone $nextMonthStart;
                $periodStart->modify('+' . ($i - 1) . ' months');
                $periodStart->modify('first day of this month');
                $periodEnd = clone $periodStart;
                $periodEnd->modify('last day of this month');
                $stmt = $pdo->prepare('
                    INSERT INTO advance_installments
                    (advance_id, period_start, period_end, installment_number, amount)
                    VALUES (?, ?, ?, ?, ?)
                ');
                $stmt->execute([
                    $advanceId,
                    $periodStart->format('Y-m-d'),
                    $periodEnd->format('Y-m-d'),
                    $i,
                    $advance['installment_amount'],
                ]);
            }
        }

        $pdo->commit();
        return [
            'success' => true,
            'message' => 'تم تفعيل السلفة بنجاح',
            'data' => ['id' => $advanceId],
        ];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['success' => false, 'message' => 'خطأ في تفعيل السلفة: ' . $e->getMessage()];
    }
}

/**
 * تفعيل السلفة
 */
function activateAdvance($pdo, $input) {
    $advanceId = $input['advance_id'] ?? null;
    $activatedBy = $input['activated_by'] ?? null;
    $result = activateAdvanceCore($pdo, (int)$advanceId, $activatedBy);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
}

/**
 * إلغاء سلفة (معلقة أو مفعلة)
 */
function cancelAdvance($pdo, $input) {
    try {
        $advanceId = $input['advance_id'] ?? null;
        $cancelledBy = $input['cancelled_by'] ?? null;
        
        if (!$advanceId) {
            echo json_encode([
                'success' => false,
                'message' => 'معرف السلفة مطلوب'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // التحقق من حالة السلفة
        $stmt = $pdo->prepare("
            SELECT status, employee_id 
            FROM employee_advances 
            WHERE id = ?
        ");
        $stmt->execute([$advanceId]);
        $advance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$advance) {
            echo json_encode([
                'success' => false,
                'message' => 'السلفة غير موجودة'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // السماح بإلغاء السلفات المعلقة أو المفعلة فقط
        if ($advance['status'] === 'cancelled' || $advance['status'] === 'completed') {
            echo json_encode([
                'success' => false,
                'message' => 'لا يمكن إلغاء سلفة ' . ($advance['status'] === 'completed' ? 'مسددة' : 'ملغاة')
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // إذا كانت السلفة مفعلة، حذف سجل هذه السلفة فقط من manual_adjustments
        if ($advance['status'] === 'activated') {
            $adjKey = 'advance_amount_' . $advanceId;
            $stmt = $pdo->prepare("
                DELETE FROM manual_adjustments 
                WHERE employee_id = ? 
                AND adj_key = ?
            ");
            $stmt->execute([$advance['employee_id'], $adjKey]);
            
            // حذف الأقساط غير المدفوعة من advance_installments
            $stmt = $pdo->prepare("
                DELETE FROM advance_installments 
                WHERE advance_id = ? 
                AND is_paid = 0
            ");
            $stmt->execute([$advanceId]);
        }
        
        // تحديث حالة السلفة إلى ملغاة
        $stmt = $pdo->prepare("
            UPDATE employee_advances 
            SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$cancelledBy, $advanceId]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'تم إلغاء السلفة بنجاح'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'فشل في إلغاء السلفة'
            ], JSON_UNESCAPED_UNICODE);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في إلغاء السلفة: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * التحقق من وجود سلفة نشطة للموظف
 */
function getEmployeeActiveAdvance($pdo, $input) {
    try {
        $employeeId = $input['employee_id'] ?? null;
        
        if (!$employeeId) {
            echo json_encode([
                'success' => false,
                'message' => 'معرف الموظف مطلوب'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        $stmt = $pdo->prepare("
            SELECT * FROM employee_advances 
            WHERE employee_id = ? AND status = 'activated'
            ORDER BY created_at DESC
        ");
        $stmt->execute([$employeeId]);
        $advances = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $advances
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في التحقق من السلفة: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * جلب تفاصيل السلفة مع الأقساط
 */
function getAdvanceDetails($pdo, $input) {
    try {
        // قراءة advance_id من $input (الذي يحتوي على $_GET بعد الدمج)
        $advanceId = $input['advance_id'] ?? null;
        
        if (!$advanceId) {
            echo json_encode([
                'success' => false,
                'message' => 'معرف السلفة مطلوب'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // جلب بيانات السلفة
        $stmt = $pdo->prepare("
            SELECT ea.*, e.name as employee_name, e.employee_code
            FROM employee_advances ea
            LEFT JOIN employees e ON ea.employee_id = e.id
            WHERE ea.id = ?
        ");
        $stmt->execute([$advanceId]);
        $advance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$advance) {
            echo json_encode([
                'success' => false,
                'message' => 'السلفة غير موجودة'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // جلب الأقساط
        $stmt = $pdo->prepare("
            SELECT * FROM advance_installments 
            WHERE advance_id = ?
            ORDER BY installment_number
        ");
        $stmt->execute([$advanceId]);
        $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $advance['installments'] = $installments;

        // ===== سجل سداد السلفة (خاصة للسلف الأسبوعية بدون أقساط محددة) =====
        // نبني خط زمني لكل استقطاعات السلف للموظف، ثم نوزعها على السلف حسب الأقدمية
        $employeeId = (int)($advance['employee_id'] ?? 0);
        $advanceAmount = (float)($advance['advance_amount'] ?? 0);
        $advanceCreatedAt = $advance['created_at'] ?? null;

        $paymentsHistory = [];

        if ($employeeId && $advanceAmount > 0 && $advanceCreatedAt) {
            // 1) كل سلف الموظف (FIFO واحد لكل الاستقطاعات)
            $stmt = $pdo->prepare("
                SELECT id, advance_amount, created_at, salary_type
                FROM employee_advances
                WHERE employee_id = ?
                ORDER BY created_at ASC, id ASC
            ");
            $stmt->execute([$employeeId]);
            $allAdv = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // إذا لم توجد سلف أخرى، نربط كل المستقطعات بهذه السلفة
            if ($allAdv) {
                // 2) جلب كل الاستقطاعات اليدوية من السلف (advance_deducted) للموظف مرتبة زمنياً
                $stmt = $pdo->prepare("
                    SELECT id, period_start, period_end, amount, updated_at
                    FROM manual_adjustments
                    WHERE employee_id = ?
                    AND adj_key = 'advance_deducted'
                    ORDER BY period_start ASC, id ASC
                ");
                $stmt->execute([$employeeId]);
                $deductions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($deductions) {
                    // 3) توزيع كل استقطاع على السلف بالترتيب (الأقدم فالأحدث)
                    $advStates = [];
                    foreach ($allAdv as $a) {
                        $advStates[] = [
                            'id' => (int)$a['id'],
                            'original_amount' => (float)$a['advance_amount'],
                            'remaining' => (float)$a['advance_amount'],
                        ];
                    }

                    $perAdvancePayments = []; // [advance_id => [payments...]]

                    foreach ($deductions as $row) {
                        $remainingFromRow = (float)$row['amount'];
                        if ($remainingFromRow <= 0) {
                            continue;
                        }

                        foreach ($advStates as &$st) {
                            if ($remainingFromRow <= 0) {
                                break;
                            }
                            if ($st['remaining'] <= 0) {
                                continue;
                            }

                            $pay = min($st['remaining'], $remainingFromRow);
                            $st['remaining'] -= $pay;
                            $remainingFromRow -= $pay;

                            if (!isset($perAdvancePayments[$st['id']])) {
                                $perAdvancePayments[$st['id']] = [];
                            }

                            $perAdvancePayments[$st['id']][] = [
                                'period_start' => $row['period_start'],
                                'period_end' => $row['period_end'],
                                'paid_at' => $row['updated_at'] ?? null,
                                'amount' => $pay,
                            ];
                        }
                        unset($st);
                    }

                    // 4) حساب الرصيد المتبقي بعد كل دفعة لهذه السلفة المحددة فقط
                    $thisAdvanceId = (int)$advance['id'];
                    if (!empty($perAdvancePayments[$thisAdvanceId])) {
                        $remaining = $advanceAmount;
                        foreach ($perAdvancePayments[$thisAdvanceId] as $p) {
                            $remaining -= $p['amount'];
                            if ($remaining < 0) {
                                $remaining = 0;
                            }
                            $paymentsHistory[] = [
                                'period_start' => $p['period_start'],
                                'period_end' => $p['period_end'],
                                'paid_at' => $p['paid_at'] ?? null,
                                'paid_amount' => $p['amount'],
                                'remaining_after' => $remaining,
                            ];
                        }
                    }
                }
            }
        }

        $advance['payments_history'] = $paymentsHistory;
        
        echo json_encode([
            'success' => true,
            'data' => $advance
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في جلب تفاصيل السلفة: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * حذف سلفة ملغاة
 */
function deleteAdvance($pdo, $input) {
    try {
        $advanceId = $input['advance_id'] ?? null;
        
        if (!$advanceId) {
            echo json_encode([
                'success' => false,
                'message' => 'معرف السلفة مطلوب'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        $pdo->beginTransaction();
        
        // التحقق من حالة السلفة - يجب أن تكون ملغاة فقط
        $stmt = $pdo->prepare("
            SELECT status, employee_id 
            FROM employee_advances 
            WHERE id = ?
        ");
        $stmt->execute([$advanceId]);
        $advance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$advance) {
            $pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'السلفة غير موجودة'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // السماح بحذف السلفات الملغاة فقط
        if ($advance['status'] !== 'cancelled') {
            $pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'لا يمكن حذف السلفة. يجب أن تكون ملغاة أولاً. الحالة الحالية: ' . $advance['status']
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // حذف جميع سجلات الأقساط المرتبطة بالسلفة
        $stmt = $pdo->prepare("
            DELETE FROM advance_installments 
            WHERE advance_id = ?
        ");
        $stmt->execute([$advanceId]);
        
        // حذف السلفة من employee_advances
        // بسبب ON DELETE CASCADE، سيتم حذف الأقساط تلقائياً، لكننا حذفناها يدوياً للتأكد
        $stmt = $pdo->prepare("
            DELETE FROM employee_advances 
            WHERE id = ?
        ");
        $stmt->execute([$advanceId]);
        
        if ($stmt->rowCount() > 0) {
            $pdo->commit();
            echo json_encode([
                'success' => true,
                'message' => 'تم حذف السلفة وجميع سجلات الأقساط بنجاح'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            $pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'فشل في حذف السلفة'
            ], JSON_UNESCAPED_UNICODE);
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في حذف السلفة: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * ملخص السلف الأسبوعي (موظفو الراتب الأسبوعي) — صف واحد لكل موظف
 */
function getAdvancesWeeklySummary($pdo, $input) {
    try {
        $weekStart = $input['week_start'] ?? null;
        $status = $input['status'] ?? null;
        if (!$weekStart || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStart)) {
            echo json_encode(['success' => false, 'message' => 'week_start مطلوب بصيغة Y-m-d'], JSON_UNESCAPED_UNICODE);
            return;
        }
        $period = advanceWeeklyPeriodFromStart($weekStart);
        $weekStart = $period['week_start'];
        $weekEnd = $period['week_end'];
        $dayDates = $period['day_dates'];
        $weekStartDt = new DateTime($weekStart);

        $includeInactive = !empty($input['include_inactive']) && ($input['include_inactive'] === '1' || $input['include_inactive'] === true || $input['include_inactive'] === 'true');
        
        // موظفون أسبوعيون لديهم سلف
        $sql = "
            SELECT DISTINCT 
                e.id as employee_id, 
                COALESCE(NULLIF(TRIM(e.name_ar), ''), e.name) as employee_name,
                e.name,
                e.name_ar,
                COALESCE(e.employee_code, '') as employee_code,
                COALESCE(e.department, '') as department,
                COALESCE(NULLIF(TRIM(e.location), ''), e.department, '') as location,
                e.status as employee_status
            FROM employees e
            INNER JOIN employee_advances ea 
                ON ea.employee_id = e.id 
                AND ea.salary_type = 'Weekly'
            WHERE 1=1
        ";
        if (!$includeInactive) {
            $sql .= " AND e.status = 'active'";
        }
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
            $sql .= " AND ea.status = :status";
        }
        $sql .= " ORDER BY e.name";
        $stmt = $pdo->prepare($sql);
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
            $stmt->bindValue(':status', $status);
        }
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rows = [];
        
        foreach ($employees as $emp) {
            $eid = $emp['employee_id'];
            syncAdvanceStatusesForEmployee($pdo, (int)$eid);
            
            $pb = resolvePreviousBalance($pdo, $eid, $weekStart, $weekStart, $weekEnd, $status);
            $previous_balance = $pb['previous_balance'];
            
            $day_sat = $day_sun = $day_mon = $day_tue = $day_wed = $day_thu = 0;
            $daySql = "
                SELECT COALESCE(SUM(ea.advance_amount), 0) as total
                FROM employee_advances ea
                WHERE ea.employee_id = ? AND ea.salary_type = 'Weekly'
                AND DATE(COALESCE(ea.start_date, ea.created_at)) = ?
            ";
            if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
                $daySql .= " AND ea.status = ?";
            }
            $stmtDay = $pdo->prepare($daySql);
            foreach ([0 => 'day_sat', 1 => 'day_sun', 2 => 'day_mon', 3 => 'day_tue', 4 => 'day_wed', 5 => 'day_thu'] as $i => $key) {
                if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
                    $stmtDay->execute([$eid, $dayDates[$i], $status]);
                } else {
                    $stmtDay->execute([$eid, $dayDates[$i]]);
                }
                $$key = floatval($stmtDay->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            }
            
            // المستقطع من السلف لهذا الأسبوع: صف واحد فقط (نفس منطق صفحة تفاصيل الراتب) لتفادي جمع صفوف متعددة متقاطعة
            $stmt = $pdo->prepare("
                SELECT amount FROM manual_adjustments
                WHERE employee_id = ? AND adj_key = 'advance_deducted'
                AND period_start = ? AND period_end = ?
                LIMIT 1
            ");
            $stmt->execute([$eid, $weekStart, $weekEnd]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $deducted_this_week = $row ? floatval($row['amount']) : 0;
            if ($deducted_this_week == 0) {
                $stmt = $pdo->prepare("
                    SELECT amount FROM manual_adjustments
                    WHERE employee_id = ? AND adj_key = 'advance_deducted'
                    AND period_start <= ? AND period_end >= ?
                    ORDER BY updated_at DESC
                    LIMIT 1
                ");
                $stmt->execute([$eid, $weekEnd, $weekStart]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $deducted_this_week = $row ? floatval($row['amount']) : 0;
            }
            $week_total = $day_sat + $day_sun + $day_mon + $day_tue + $day_wed + $day_thu;
            $total_advances = $previous_balance + $week_total;
            $display_deducted_this_week = min($deducted_this_week, $total_advances);
            // باقي السلفة = إجمالي السلف − المستقطع (هذا الأسبوع) ليكون الصف متناسقاً: 250 − 100 = 150
            $remaining = max(0, round($total_advances - $display_deducted_this_week, 2));
            
            $rows[] = [
                'employee_id' => (int)$eid,
                'employee_name' => $emp['employee_name'],
                'name' => $emp['name'] ?? '',
                'name_ar' => isset($emp['name_ar']) ? trim($emp['name_ar']) : '',
                'employee_code' => $emp['employee_code'] ?? '',
                'employee_status' => $emp['employee_status'] ?? 'active',
                'department' => $emp['department'],
                'location' => $emp['location'],
                'previous_balance' => round($previous_balance, 2),
                'day_sat' => round($day_sat, 2),
                'day_sun' => round($day_sun, 2),
                'day_mon' => round($day_mon, 2),
                'day_tue' => round($day_tue, 2),
                'day_wed' => round($day_wed, 2),
                'day_thu' => round($day_thu, 2),
                'total_advances' => round($total_advances, 2),
                'total_deducted' => round($display_deducted_this_week, 2),
                'remaining' => $remaining,
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $rows,
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'day_dates' => $dayDates,
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في ملخص السلف الأسبوعي: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * ملخص السلف الشهري (موظفو الراتب الشهري) — صف واحد لكل موظف
 */
function getAdvancesMonthlySummary($pdo, $input) {
    try {
        $month = $input['month'] ?? null; // Y-m
        $status = $input['status'] ?? null;
        if (!$month || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            echo json_encode(['success' => false, 'message' => 'month مطلوب بصيغة Y-m'], JSON_UNESCAPED_UNICODE);
            return;
        }
        $monthStart = $month . '-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));
        $includeInactive = !empty($input['include_inactive']) && ($input['include_inactive'] === '1' || $input['include_inactive'] === true || $input['include_inactive'] === 'true');
        
        $sql = "
            SELECT DISTINCT 
                e.id as employee_id, 
                COALESCE(NULLIF(TRIM(e.name_ar), ''), e.name) as employee_name,
                e.name,
                e.name_ar,
                COALESCE(e.employee_code, '') as employee_code,
                COALESCE(e.department, '') as department,
                COALESCE(e.location, '') as location,
                e.status as employee_status
            FROM employees e
            INNER JOIN employee_advances ea 
                ON ea.employee_id = e.id 
                AND ea.salary_type = 'Monthly'
            WHERE 1=1
        ";
        if (!$includeInactive) {
            $sql .= " AND e.status = 'active'";
        }
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
            $sql .= " AND ea.status = :status";
        }
        $sql .= " ORDER BY e.name";
        $stmt = $pdo->prepare($sql);
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
            $stmt->bindValue(':status', $status);
        }
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $rows = [];
        foreach ($employees as $emp) {
            $eid = $emp['employee_id'];
            
            $pb = resolvePreviousBalance($pdo, $eid, $monthStart, $monthStart, $monthEnd, $status);
            $previous_balance = $pb['previous_balance'];
            
            // سلف الشهر الحالي حسب تاريخ المنح (created_at)
            $monthAdvSql = "
                SELECT COALESCE(SUM(ea.advance_amount), 0) as total
                FROM employee_advances ea
                WHERE ea.employee_id = ? AND ea.salary_type = 'Monthly'
                AND DATE(ea.created_at) >= ? AND DATE(ea.created_at) <= ?
            ";
            if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
                $monthAdvSql .= " AND ea.status = ?";
            }
            $stmt = $pdo->prepare($monthAdvSql);
            if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
                $stmt->execute([$eid, $monthStart, $monthEnd, $status]);
            } else {
                $stmt->execute([$eid, $monthStart, $monthEnd]);
            }
            $month_advances = floatval($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            // المستقطع من السلف لهذا الشهر: صف واحد فقط (نفس منطق صفحة تفاصيل الراتب) لتفادي جمع صفوف متعددة متقاطعة
            $stmt = $pdo->prepare("
                SELECT amount FROM manual_adjustments
                WHERE employee_id = ? AND adj_key = 'advance_deducted'
                AND period_start = ? AND period_end = ?
                LIMIT 1
            ");
            $stmt->execute([$eid, $monthStart, $monthEnd]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $deducted_this_month = $row ? floatval($row['amount']) : 0;
            if ($deducted_this_month == 0) {
                $stmt = $pdo->prepare("
                    SELECT amount FROM manual_adjustments
                    WHERE employee_id = ? AND adj_key = 'advance_deducted'
                    AND period_start <= ? AND period_end >= ?
                    ORDER BY updated_at DESC
                    LIMIT 1
                ");
                $stmt->execute([$eid, $monthEnd, $monthStart]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $deducted_this_month = $row ? floatval($row['amount']) : 0;
            }
            $total_advances = $previous_balance + $month_advances;
            // المستقطع المعروض لهذا الشهر لا يتجاوز إجمالي السلف
            $display_deducted_this_month = min($deducted_this_month, $total_advances);
            // باقي السلفة = إجمالي السلف − المستقطع (هذا الشهر) ليكون الصف متناسقاً
            $remaining = max(0, round($total_advances - $display_deducted_this_month, 2));
            
            $rows[] = [
                'employee_id' => (int)$eid,
                'employee_name' => $emp['employee_name'],
                'name' => $emp['name'] ?? '',
                'name_ar' => isset($emp['name_ar']) ? trim($emp['name_ar']) : '',
                'employee_code' => $emp['employee_code'] ?? '',
                'employee_status' => $emp['employee_status'] ?? 'active',
                'department' => $emp['department'],
                'location' => $emp['location'],
                'previous_balance' => round($previous_balance, 2),
                'month_advances' => round($month_advances, 2),
                'total_advances' => round($total_advances, 2),
                'total_deducted' => round($display_deducted_this_month, 2), // المستقطع من السلف = هذا الشهر فقط (محدود بالرصيد)
                'remaining' => $remaining,
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $rows,
            'month' => $month,
            'month_start' => $monthStart,
            'month_end' => $monthEnd,
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في ملخص السلف الشهري: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * تعديل سلفة موجودة
 * - pending: يسمح بتعديل المبلغ والملاحظات والتواريخ
 * - activated: يسمح بتعديل الملاحظات فقط
 * - cancelled/completed: ممنوع
 */
function updateAdvance($pdo, $input) {
    try {
        $advanceId = $input['advance_id'] ?? null;
        if (!$advanceId) {
            echo json_encode(['success' => false, 'message' => 'معرف السلفة مطلوب'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $stmt = $pdo->prepare("SELECT * FROM employee_advances WHERE id = ?");
        $stmt->execute([$advanceId]);
        $advance = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$advance) {
            echo json_encode(['success' => false, 'message' => 'السلفة غير موجودة'], JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($advance['status'] === 'cancelled') {
            echo json_encode(['success' => false, 'message' => 'لا يمكن تعديل سلفة ملغاة'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $fields = [];
        $params = [];

        // تعديل المبلغ (pending و activated)
        if (isset($input['advance_amount'])) {
            $amount = floatval($input['advance_amount']);
            if ($amount <= 0) {
                echo json_encode(['success' => false, 'message' => 'مبلغ السلفة يجب أن يكون أكبر من صفر'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $fields[] = 'advance_amount = ?, installment_amount = ?';
            $params[] = $amount;
            $params[] = $amount;
        }

        // تعديل التواريخ (كل الحالات) — تاريخ البداية يتبع تاريخ المنح
        if (isset($input['created_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['created_date'])) {
            $fields[] = 'created_at = ?';
            $params[] = $input['created_date'] . ' ' . date('H:i:s');
            if (!isset($input['start_date']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['start_date'])) {
                $input['start_date'] = $input['created_date'];
            }
        }

        if (isset($input['start_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['start_date'])) {
            $fields[] = 'start_date = ?';
            $params[] = $input['start_date'];
        }

        // كل الحالات غير المكتملة: يسمح بتعديل الملاحظات
        if (array_key_exists('notes', $input)) {
            $fields[] = 'notes = ?';
            $params[] = $input['notes'];
        }

        if (empty($fields)) {
            echo json_encode(['success' => false, 'message' => 'لا توجد بيانات للتعديل'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $params[] = $advanceId;
        $stmt = $pdo->prepare("UPDATE employee_advances SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);

        // لو المبلغ اتغير والسلفة activated أو completed: نحدث manual_adjustments + advance_installments
        if (in_array($advance['status'], ['activated', 'completed'], true) && isset($input['advance_amount'])) {
            $newAmount = floatval($input['advance_amount']);
            $adjKey = 'advance_amount_' . $advanceId;
            $stmt = $pdo->prepare("
                UPDATE manual_adjustments SET amount = ?, updated_at = NOW()
                WHERE employee_id = ? AND adj_key = ?
            ");
            $stmt->execute([$newAmount, $advance['employee_id'], $adjKey]);

            // تحديث مبلغ الأقساط غير المدفوعة
            $stmt = $pdo->prepare("
                UPDATE advance_installments SET amount = ?
                WHERE advance_id = ? AND is_paid = 0
            ");
            $stmt->execute([$newAmount, $advanceId]);

            // لو السلفة كانت مسددة والمبلغ الجديد أكبر من المستقطع الفعلي لهذه السلفة → ترجع نشطة
            if ($advance['status'] === 'completed') {
                $paidMap = computeFifoPaidForEmployees($pdo, [(int)$advance['employee_id']]);
                $paidForThis = (float)($paidMap[$advanceId] ?? 0);
                if ($paidForThis + 0.001 < $newAmount) {
                    $stmt = $pdo->prepare("UPDATE employee_advances SET status = 'activated', completed_at = NULL WHERE id = ?");
                    $stmt->execute([$advanceId]);
                }
            }
        }

        echo json_encode(['success' => true, 'message' => 'تم تعديل السلفة بنجاح'], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ في تعديل السلفة: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * حفظ المستقطع من السلف (إدخال يدوي) لفترة أسبوع — يربط جدول السلف بعرض الأجر الأسبوعي
 */
function setAdvanceDeducted($pdo, $input) {
    try {
        $employeeId = (int)($input['employee_id'] ?? 0);
        $periodStart = $input['period_start'] ?? null;
        $periodEnd = $input['period_end'] ?? null;
        $amount = (float)($input['amount'] ?? 0);
        if (!$employeeId || !$periodStart || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart) || !$periodEnd || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodEnd)) {
            echo json_encode(['success' => false, 'message' => 'employee_id و period_start و period_end مطلوبة بصيغة Y-m-d'], JSON_UNESCAPED_UNICODE);
            return;
        }
        if ($amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'مبلغ المستقطع يجب أن يكون أكبر من صفر'], JSON_UNESCAPED_UNICODE);
            return;
        }
        $stmt = $pdo->prepare("
            INSERT INTO manual_adjustments (employee_id, period_start, period_end, adj_key, amount, updated_at)
            VALUES (?, ?, ?, 'advance_deducted', ?, NOW())
            ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
        ");
        $stmt->execute([$employeeId, $periodStart, $periodEnd, $amount]);
        syncAdvanceStatusesForEmployee($pdo, $employeeId);
        echo json_encode(['success' => true, 'message' => 'تم حفظ المستقطع من السلف'], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * مزامنة start_date مع تاريخ المنح (created_at) للسلف القديمة
 */
function syncGrantStartDates($pdo) {
    try {
        $stmt = $pdo->prepare("
            UPDATE employee_advances
            SET start_date = DATE(created_at)
            WHERE start_date IS NULL
               OR DATE(start_date) != DATE(created_at)
        ");
        $stmt->execute();
        $updated = $stmt->rowCount();
        echo json_encode([
            'success' => true,
            'message' => $updated > 0
                ? "تم تصحيح {$updated} سلفة — تاريخ البداية = تاريخ المنح"
                : 'جميع السلف متزامنة بالفعل',
            'updated' => $updated,
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'خطأ في مزامنة التواريخ: ' . $e->getMessage(),
        ], JSON_UNESCAPED_UNICODE);
    }
}
?>

