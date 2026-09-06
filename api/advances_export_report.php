<?php
/**
 * تصدير تقرير السلف إلى Excel .xlsx — A4 Landscape مع هيدر وفوتر ملونين
 * الاستخدام: GET api/advances_export_report.php أو من واجهة إدارة السلف (زر طباعة تقرير)
 */
require_once __DIR__ . '/config.php';

$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// دالة توزيع استقطاعات السلف (نسخة محلية لتفادي إرسال JSON من advances_api)
$computePaidAmountsFromDeductions = function($pdo, $employeeId, $salaryType) {
    $employeeId = (int) $employeeId;
    if (!$employeeId) return [];
    $stmt = $pdo->prepare("SELECT id, advance_amount, created_at FROM employee_advances WHERE employee_id = ? AND salary_type = ? ORDER BY created_at ASC, id ASC");
    $stmt->execute([$employeeId, $salaryType]);
    $allAdv = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$allAdv) return [];
    $stmt = $pdo->prepare("SELECT id, period_start, period_end, amount FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' ORDER BY period_start ASC, id ASC");
    $stmt->execute([$employeeId]);
    $deductions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$deductions) return [];
    $advStates = [];
    foreach ($allAdv as $a) {
        $advStates[] = ['id' => (int)$a['id'], 'original_amount' => (float)$a['advance_amount'], 'remaining' => (float)$a['advance_amount']];
    }
    $perAdvancePaid = [];
    foreach ($deductions as $row) {
        $remainingFromRow = (float)$row['amount'];
        if ($remainingFromRow <= 0) continue;
        foreach ($advStates as &$st) {
            if ($remainingFromRow <= 0) break;
            if ($st['remaining'] <= 0) continue;
            $pay = min($st['remaining'], $remainingFromRow);
            $st['remaining'] -= $pay;
            $remainingFromRow -= $pay;
            if (!isset($perAdvancePaid[$st['id']])) $perAdvancePaid[$st['id']] = 0;
            $perAdvancePaid[$st['id']] += $pay;
        }
        unset($st);
    }
    return $perAdvancePaid;
};

// جلب السلف (نفس استعلام getAdvances)
$input = $_GET;
$status = $input['status'] ?? null;
$salaryType = $input['salary_type'] ?? null;
$employeeId = $input['employee_id'] ?? null;
$sql = "SELECT ea.*, COALESCE(NULLIF(TRIM(e.name_ar), ''), e.name) as employee_name, e.name, e.name_ar, e.employee_code, e.department, e.cost_center,
        COUNT(ai.id) as total_installments, COALESCE(SUM(CASE WHEN ai.is_paid = 1 THEN ai.amount ELSE 0 END), 0) as paid_amount_raw
        FROM employee_advances ea LEFT JOIN employees e ON ea.employee_id = e.id LEFT JOIN advance_installments ai ON ea.id = ai.advance_id WHERE 1=1";
$params = [];
if ($status) { $sql .= " AND ea.status = ?"; $params[] = $status; }
if ($salaryType) { $sql .= " AND ea.salary_type = ?"; $params[] = $salaryType; }
if ($employeeId) { $sql .= " AND ea.employee_id = ?"; $params[] = $employeeId; }
$sql .= " GROUP BY ea.id ORDER BY ea.created_at DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$paidFromDeductions = [];
foreach ($rows as $row) {
    $eid = (int)($row['employee_id'] ?? 0);
    $stype = $row['salary_type'] ?? 'Weekly';
    $key = $eid . '_' . $stype;
    if (!isset($paidFromDeductions['_'.$key])) {
        $paidFromDeductions['_'.$key] = true;
        $byAdv = $computePaidAmountsFromDeductions($pdo, $eid, $stype);
        foreach ($byAdv as $aid => $paid) { $paidFromDeductions[$aid] = $paid; }
    }
}
$advances = [];
foreach ($rows as $row) {
    $advanceAmount = (float)($row['advance_amount'] ?? 0);
    $aid = (int)($row['id'] ?? 0);
    $fromInstallments = (float)($row['paid_amount_raw'] ?? 0);
    $fromDeductions = isset($paidFromDeductions[$aid]) ? (float)$paidFromDeductions[$aid] : 0;
    $paidAmount = max($fromInstallments, $fromDeductions);
    $paidAmount = max(0, min($paidAmount, $advanceAmount));
    $row['paid_amount'] = $paidAmount;
    $row['remaining_amount'] = max(0, $advanceAmount - $paidAmount);
    $advances[] = $row;
}

// تقرير أسبوعي بشبكة (البيان، اسم العامل، القسم، سلف سابقة، أيام الأسبوع، إجمالي، مستقطع، باقي)
$useWeeklyGrid = false;
$weeklyRows = [];
$dayDates = [];
$weekStartParam = $input['week_start'] ?? null;
if ($weekStartParam && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStartParam) && ($salaryType === 'Weekly' || $salaryType === '' || $salaryType === null)) {
    $weekStartDt = new DateTime($weekStartParam);
    $weekEndDt = clone $weekStartDt;
    $weekEndDt->modify('+6 days');
    $weekEnd = $weekEndDt->format('Y-m-d');
    $weekStart = $weekStartParam;
    for ($i = 0; $i <= 5; $i++) {
        $d = clone $weekStartDt;
        $d->modify("+$i days");
        $dayDates[] = $d->format('Y-m-d');
    }
    $sqlW = "SELECT DISTINCT e.id as employee_id, COALESCE(NULLIF(TRIM(e.name_ar), ''), e.name) as employee_name, COALESCE(NULLIF(TRIM(e.location), ''), e.department, '') as location
        FROM employees e INNER JOIN employee_advances ea ON ea.employee_id = e.id AND ea.salary_type = 'Weekly' WHERE e.status = 'active'";
    if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
        $sqlW .= " AND ea.status = ?";
    }
    $sqlW .= " ORDER BY employee_name";
    $stmtW = $pdo->prepare($sqlW);
    $stmtW->execute($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true) ? [$status] : []);
    $employees = $stmtW->fetchAll(PDO::FETCH_ASSOC);
    foreach ($employees as $emp) {
        $eid = (int)$emp['employee_id'];
        $prevSql = "SELECT COALESCE(SUM(ea.advance_amount), 0) as total FROM employee_advances ea WHERE ea.employee_id = ? AND ea.status IN ('activated', 'completed') AND DATE(ea.created_at) < ?";
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
            $prevSql = "SELECT COALESCE(SUM(ea.advance_amount), 0) as total FROM employee_advances ea WHERE ea.employee_id = ? AND ea.status = ? AND DATE(ea.created_at) < ?";
        }
        $st = $pdo->prepare($prevSql);
        $st->execute($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true) ? [$eid, $status, $weekStart] : [$eid, $weekStart]);
        $prevAdvances = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $st = $pdo->prepare("SELECT COALESCE(SUM(ai.amount), 0) as total FROM advance_installments ai INNER JOIN employee_advances ea ON ai.advance_id = ea.id WHERE ea.employee_id = ? AND ai.is_paid = 1 AND ai.period_end < ?");
        $st->execute([$eid, $weekStart]);
        $prevDeductedInstallments = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $st = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' AND period_end < ?");
        $st->execute([$eid, $weekStart]);
        $prevDeductedManual = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $previous_balance = max(0, $prevAdvances - $prevDeductedInstallments - $prevDeductedManual);
        $day_sat = $day_sun = $day_mon = $day_tue = $day_wed = $day_thu = 0;
        $daySql = "SELECT COALESCE(SUM(ea.advance_amount), 0) as total FROM employee_advances ea WHERE ea.employee_id = ? AND ea.salary_type = 'Weekly' AND DATE(ea.created_at) = ?";
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) $daySql .= " AND ea.status = ?";
        $stmtDay = $pdo->prepare($daySql);
        foreach ([0 => 'day_sat', 1 => 'day_sun', 2 => 'day_mon', 3 => 'day_tue', 4 => 'day_wed', 5 => 'day_thu'] as $i => $key) {
            $stmtDay->execute($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true) ? [$eid, $dayDates[$i], $status] : [$eid, $dayDates[$i]]);
            $$key = (float)($stmtDay->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        }
        $stmtDed = $pdo->prepare("SELECT amount FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' AND period_start = ? AND period_end = ? LIMIT 1");
        $stmtDed->execute([$eid, $weekStart, $weekEnd]);
        $rowD = $stmtDed->fetch(PDO::FETCH_ASSOC);
        $deducted_this_week = $rowD ? (float)$rowD['amount'] : 0;
        if ($deducted_this_week == 0) {
            $st = $pdo->prepare("SELECT amount FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' AND period_start <= ? AND period_end >= ? ORDER BY updated_at DESC LIMIT 1");
            $st->execute([$eid, $weekEnd, $weekStart]);
            $rowD = $st->fetch(PDO::FETCH_ASSOC);
            $deducted_this_week = $rowD ? (float)$rowD['amount'] : 0;
        }
        if ($deducted_this_week == 0) {
            $st = $pdo->prepare("SELECT COALESCE(SUM(ai.amount), 0) as total FROM advance_installments ai INNER JOIN employee_advances ea ON ai.advance_id = ea.id WHERE ea.employee_id = ? AND ai.is_paid = 1 AND ai.period_start <= ? AND ai.period_end >= ?");
            $st->execute([$eid, $weekEnd, $weekStart]);
            $deducted_this_week = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        }
        $week_total = $day_sat + $day_sun + $day_mon + $day_tue + $day_wed + $day_thu;
        $total_advances = $previous_balance + $week_total;
        $display_deducted = min($deducted_this_week, $total_advances);
        $remaining = max(0, round($total_advances - $display_deducted, 2));
        $weeklyRows[] = [
            'employee_name' => $emp['employee_name'],
            'location' => $emp['location'],
            'previous_balance' => round($previous_balance, 2),
            'day_sat' => round($day_sat, 2), 'day_sun' => round($day_sun, 2), 'day_mon' => round($day_mon, 2),
            'day_tue' => round($day_tue, 2), 'day_wed' => round($day_wed, 2), 'day_thu' => round($day_thu, 2),
            'total_advances' => round($total_advances, 2), 'total_deducted' => round($display_deducted, 2), 'remaining' => $remaining,
        ];
    }
    $useWeeklyGrid = true;
}

// تقرير شهري بشبكة — نفس الشكل والألوان: البيان، اسم العامل، الموقع، سلف سابقة، سلف الشهر، اجمالي السلف، المستقطع، باقي السلفه
$useMonthlyGrid = false;
$monthlyRows = [];
$monthParam = $input['month'] ?? null;
if ($monthParam && preg_match('/^\d{4}-\d{2}$/', $monthParam) && $salaryType === 'Monthly') {
    $monthStart = $monthParam . '-01';
    $monthEnd = date('Y-m-t', strtotime($monthStart));
    $sqlM = "SELECT DISTINCT e.id as employee_id, COALESCE(NULLIF(TRIM(e.name_ar), ''), e.name) as employee_name, COALESCE(NULLIF(TRIM(e.location), ''), e.department, '') as location
        FROM employees e INNER JOIN employee_advances ea ON ea.employee_id = e.id AND ea.salary_type = 'Monthly' WHERE e.status = 'active'";
    if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
        $sqlM .= " AND ea.status = ?";
    }
    $sqlM .= " ORDER BY employee_name";
    $stmtM = $pdo->prepare($sqlM);
    $stmtM->execute($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true) ? [$status] : []);
    $employeesM = $stmtM->fetchAll(PDO::FETCH_ASSOC);
    foreach ($employeesM as $emp) {
        $eid = (int)$emp['employee_id'];
        $prevSql = "SELECT COALESCE(SUM(ea.advance_amount), 0) as total FROM employee_advances ea WHERE ea.employee_id = ? AND ea.status IN ('activated', 'completed') AND DATE(ea.created_at) < ?";
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) {
            $prevSql = "SELECT COALESCE(SUM(ea.advance_amount), 0) as total FROM employee_advances ea WHERE ea.employee_id = ? AND ea.status = ? AND DATE(ea.created_at) < ?";
        }
        $st = $pdo->prepare($prevSql);
        $st->execute($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true) ? [$eid, $status, $monthStart] : [$eid, $monthStart]);
        $prevAdvances = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $st = $pdo->prepare("SELECT COALESCE(SUM(ai.amount), 0) as total FROM advance_installments ai INNER JOIN employee_advances ea ON ai.advance_id = ea.id WHERE ea.employee_id = ? AND ai.is_paid = 1 AND ai.period_end < ?");
        $st->execute([$eid, $monthStart]);
        $prevDeductedInstallments = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $st = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' AND period_end < ?");
        $st->execute([$eid, $monthStart]);
        $prevDeductedManual = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $previous_balance = max(0, $prevAdvances - $prevDeductedInstallments - $prevDeductedManual);
        $monthAdvSql = "SELECT COALESCE(SUM(ea.advance_amount), 0) as total FROM employee_advances ea WHERE ea.employee_id = ? AND ea.salary_type = 'Monthly' AND DATE(ea.created_at) >= ? AND DATE(ea.created_at) <= ?";
        if ($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true)) $monthAdvSql .= " AND ea.status = ?";
        $st = $pdo->prepare($monthAdvSql);
        $st->execute($status && in_array($status, ['pending', 'activated', 'completed', 'cancelled'], true) ? [$eid, $monthStart, $monthEnd, $status] : [$eid, $monthStart, $monthEnd]);
        $month_advances = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        $stmtDed = $pdo->prepare("SELECT amount FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' AND period_start = ? AND period_end = ? LIMIT 1");
        $stmtDed->execute([$eid, $monthStart, $monthEnd]);
        $rowD = $stmtDed->fetch(PDO::FETCH_ASSOC);
        $deducted_this_month = $rowD ? (float)$rowD['amount'] : 0;
        if ($deducted_this_month == 0) {
            $st = $pdo->prepare("SELECT amount FROM manual_adjustments WHERE employee_id = ? AND adj_key = 'advance_deducted' AND period_start <= ? AND period_end >= ? ORDER BY updated_at DESC LIMIT 1");
            $st->execute([$eid, $monthEnd, $monthStart]);
            $rowD = $st->fetch(PDO::FETCH_ASSOC);
            $deducted_this_month = $rowD ? (float)$rowD['amount'] : 0;
        }
        if ($deducted_this_month == 0) {
            $st = $pdo->prepare("SELECT COALESCE(SUM(ai.amount), 0) as total FROM advance_installments ai INNER JOIN employee_advances ea ON ai.advance_id = ea.id WHERE ea.employee_id = ? AND ai.is_paid = 1 AND ai.period_start <= ? AND ai.period_end >= ?");
            $st->execute([$eid, $monthEnd, $monthStart]);
            $deducted_this_month = (float)($st->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
        }
        $total_advances = $previous_balance + $month_advances;
        $display_deducted = min($deducted_this_month, $total_advances);
        $remaining = max(0, round($total_advances - $display_deducted, 2));
        $monthlyRows[] = [
            'employee_name' => $emp['employee_name'],
            'location' => $emp['location'],
            'previous_balance' => round($previous_balance, 2),
            'month_advances' => round($month_advances, 2),
            'total_advances' => round($total_advances, 2),
            'total_deducted' => round($display_deducted, 2),
            'remaining' => $remaining,
        ];
    }
    $useMonthlyGrid = true;
}

// اسم الملف: يدل على نوع التقرير (أسبوعي / شهري)
$reportTypeLabel = $useWeeklyGrid ? 'أسبوعي' : ($useMonthlyGrid ? 'شهري' : '');
$fileBase = 'تقرير_السلف' . ($reportTypeLabel ? '_' . $reportTypeLabel : '') . '_' . date('Y-m-d_His');

// تصدير CSV — يفتح في Excel بدون أخطاء (بديل إذا استمرت مشكلة .xlsx)
$format = strtolower(trim($input['format'] ?? ''));
if ($format === 'csv') {
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $fileBase . '.csv"');
    header('Cache-Control: max-age=0');
    $bom = "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    fwrite($out, $bom);
    if ($useWeeklyGrid && count($weeklyRows) > 0) {
        $dayNames = ['السبت', 'الاحد', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس'];
        $dateStrs = array_map(function($d) { return date('d-M', strtotime($d)); }, $dayDates);
        fputcsv($out, array_merge(['البيان', 'اسم العامل', 'الموقع', 'سلف سابقة'], $dayNames, ['اجمالي السلف', 'المستقطع من السلف', 'باقي السلفه']), ',');
        fputcsv($out, array_merge(['', '', '', ''], $dateStrs, ['', '', '']), ',');
        foreach ($weeklyRows as $idx => $wr) {
            fputcsv($out, [
                $idx + 1, $wr['employee_name'], $wr['location'], $wr['previous_balance'],
                $wr['day_sat'], $wr['day_sun'], $wr['day_mon'], $wr['day_tue'], $wr['day_wed'], $wr['day_thu'],
                $wr['total_advances'], $wr['total_deducted'], $wr['remaining']
            ], ',');
        }
        $sumPrev = $sumSat = $sumSun = $sumMon = $sumTue = $sumWed = $sumThu = 0;
        $sumTotal = $sumDeducted = $sumRemaining = 0;
        foreach ($weeklyRows as $wr) {
            $sumPrev += $wr['previous_balance']; $sumSat += $wr['day_sat']; $sumSun += $wr['day_sun']; $sumMon += $wr['day_mon'];
            $sumTue += $wr['day_tue']; $sumWed += $wr['day_wed']; $sumThu += $wr['day_thu'];
            $sumTotal += $wr['total_advances']; $sumDeducted += $wr['total_deducted']; $sumRemaining += $wr['remaining'];
        }
        fputcsv($out, ['', '', 'الاجمالي', round($sumPrev, 2), round($sumSat, 2), round($sumSun, 2), round($sumMon, 2), round($sumTue, 2), round($sumWed, 2), round($sumThu, 2), round($sumTotal, 2), round($sumDeducted, 2), round($sumRemaining, 2)], ',');
    } elseif ($useMonthlyGrid && count($monthlyRows) > 0) {
        $monthHeaders = ['البيان', 'اسم العامل', 'الموقع', 'سلف سابقة', 'سلف الشهر', 'اجمالي السلف', 'المستقطع من السلف', 'باقي السلفه'];
        fputcsv($out, $monthHeaders, ',');
        $sumPrev = $sumMonth = $sumTotal = $sumDeducted = $sumRemaining = 0;
        foreach ($monthlyRows as $mr) {
            $sumPrev += $mr['previous_balance']; $sumMonth += $mr['month_advances']; $sumTotal += $mr['total_advances'];
            $sumDeducted += $mr['total_deducted']; $sumRemaining += $mr['remaining'];
        }
        fputcsv($out, ['', '', '', '', '', round($sumTotal, 2), round($sumDeducted, 2), round($sumRemaining, 2)], ',');
        foreach ($monthlyRows as $idx => $mr) {
            fputcsv($out, [$idx + 1, $mr['employee_name'], $mr['location'], $mr['previous_balance'], $mr['month_advances'], $mr['total_advances'], $mr['total_deducted'], $mr['remaining']], ',');
        }
        fputcsv($out, ['', '', 'الاجمالي', round($sumPrev, 2), round($sumMonth, 2), round($sumTotal, 2), round($sumDeducted, 2), round($sumRemaining, 2)], ',');
    } else {
        $cols = ['رقم السلفة', 'اسم الموظف', 'الكود', 'نوع الراتب', 'مبلغ السلفة', 'المسدد', 'المتبقي', 'الحالة', 'تاريخ الإنشاء'];
        fputcsv($out, $cols, ',');
        $statusLabels = ['pending' => 'معلقة', 'activated' => 'نشطة', 'completed' => 'مسددة', 'cancelled' => 'ملغاة'];
        $typeLabels = ['Weekly' => 'أسبوعي', 'Monthly' => 'شهري'];
        foreach ($advances as $a) {
            fputcsv($out, [
                $a['id'] ?? '', $a['employee_name'] ?? '', $a['employee_code'] ?? '',
                $typeLabels[$a['salary_type'] ?? ''] ?? ($a['salary_type'] ?? ''),
                $a['advance_amount'] ?? 0, $a['paid_amount'] ?? 0, $a['remaining_amount'] ?? 0,
                $statusLabels[$a['status'] ?? ''] ?? ($a['status'] ?? ''),
                isset($a['created_at']) ? date('Y-m-d', strtotime($a['created_at'])) : ''
            ], ',');
        }
    }
    fclose($out);
    exit;
}

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $fileBase . '.xlsx"');
header('Cache-Control: max-age=0');

$reportDate = date('Y-m-d H:i');
$mergeCellsXml = '';
$sheetViewXml = '';
$colsXml = '';

if ($useWeeklyGrid) {
    // شبكة أسبوعية: البيان، اسم العامل، القسم، سلف سابقة، السبت..الخميس، اجمالي السلف، المستقطع، باقي السلفه
    $colLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M'];
    $dayNames = ['السبت', 'الاحد', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس'];
    $headers = array_merge(['البيان', 'اسم العامل', 'الموقع', 'سلف سابقة'], $dayNames, ['اجمالي السلف', 'المستقطع من السلف', 'باقي السلفه']);
    $reportTitleWeekly = 'تقرير السلف الأسبوعي';
    $subtitleWeekly = 'عرض تفاصيل السلف — الفترة: ' . $weekStart . ' - ' . $weekEnd;
    $allStrings = [$reportTitleWeekly, $subtitleWeekly];
    foreach ($headers as $h) { $allStrings[] = $h; }
    $dateStrs = [];
    foreach ($dayDates as $d) { $dateStrs[] = date('d-M', strtotime($d)); }
    foreach ($dateStrs as $t) { $allStrings[] = $t; }
    $allStrings[] = 'الاجمالي';
    foreach ($weeklyRows as $wr) {
        $allStrings[] = (string)$wr['employee_name'];
        $allStrings[] = (string)$wr['location'];
    }
    $uniqueStrings = array_values(array_unique($allStrings));
    $stringToIdx = array_flip($uniqueStrings);
    // حساب المجاميع مسبقاً لوضعها في صف التواريخ (صف 2) تحت اجمالي السلف / المستقطع / باقي السلفه
    $sumPrev = $sumSat = $sumSun = $sumMon = $sumTue = $sumWed = $sumThu = 0;
    $sumTotal = $sumDeducted = $sumRemaining = 0;
    foreach ($weeklyRows as $wr) {
        $sumPrev += $wr['previous_balance']; $sumSat += $wr['day_sat']; $sumSun += $wr['day_sun']; $sumMon += $wr['day_mon'];
        $sumTue += $wr['day_tue']; $sumWed += $wr['day_wed']; $sumThu += $wr['day_thu'];
        $sumTotal += $wr['total_advances']; $sumDeducted += $wr['total_deducted']; $sumRemaining += $wr['remaining'];
    }
    $rows = [];
    $r = 1;
    $rows[] = '<row r="' . $r . '" ht="28" customHeight="1"><c r="A' . $r . '" t="s" s="4"><v>' . ($stringToIdx[$reportTitleWeekly] ?? 0) . '</v></c></row>';
    $r++;
    $rows[] = '<row r="' . $r . '" ht="24" customHeight="1"><c r="A' . $r . '" t="s" s="5"><v>' . ($stringToIdx[$subtitleWeekly] ?? 0) . '</v></c></row>';
    $r++;
    $lastDataRowWeekly = 4 + count($weeklyRows);
    // صف أسماء الأعمدة — حدود سوداء + wrapText
    $row1 = '<row r="' . $r . '" ht="36" customHeight="1">';
    foreach (['البيان','اسم العامل','الموقع','سلف سابقة'] as $ci => $t) {
        $row1 .= '<c r="' . $colLetters[$ci] . $r . '" t="s" s="3"><v>' . ($stringToIdx[$t] ?? 0) . '</v></c>';
    }
    foreach ($dayNames as $ci => $t) {
        $row1 .= '<c r="' . $colLetters[4+$ci] . $r . '" t="s" s="3"><v>' . ($stringToIdx[$t] ?? 0) . '</v></c>';
    }
    $row1 .= '<c r="K' . $r . '" t="s" s="3"><v>' . ($stringToIdx['اجمالي السلف'] ?? 0) . '</v></c>';
    $row1 .= '<c r="L' . $r . '" t="s" s="3"><v>' . ($stringToIdx['المستقطع من السلف'] ?? 0) . '</v></c>';
    $row1 .= '<c r="M' . $r . '" t="s" s="3"><v>' . ($stringToIdx['باقي السلفه'] ?? 0) . '</v></c>';
    $row1 .= '</row>';
    $rows[] = $row1;
    $r++;
    // الصف 2: تواريخ الأيام في E–J، وتحته معادلات اجمالي السلف والمستقطع وباقي السلفه في K2,L2,M2
    $row2 = '<row r="' . $r . '" ht="22" customHeight="1">';
    for ($ci = 0; $ci < 4; $ci++) { $row2 .= '<c r="' . $colLetters[$ci] . $r . '" s="3"/>'; }
    foreach ($dateStrs as $ci => $t) {
        if (!isset($stringToIdx[$t])) { $stringToIdx[$t] = count($uniqueStrings); $uniqueStrings[] = $t; }
        $row2 .= '<c r="' . $colLetters[4+$ci] . $r . '" t="s" s="3"><v>' . $stringToIdx[$t] . '</v></c>';
    }
    $row2 .= '<c r="K' . $r . '" s="3"><f>SUM(K5:K' . $lastDataRowWeekly . ')</f><v>' . round($sumTotal, 2) . '</v></c>';
    $row2 .= '<c r="L' . $r . '" s="3"><f>SUM(L5:L' . $lastDataRowWeekly . ')</f><v>' . round($sumDeducted, 2) . '</v></c>';
    $row2 .= '<c r="M' . $r . '" s="3"><f>SUM(M5:M' . $lastDataRowWeekly . ')</f><v>' . round($sumRemaining, 2) . '</v></c>';
    $row2 .= '</row>';
    $rows[] = $row2;
    $r++;
    // صفوف البيانات — All Borders أسود (s="9" حد مخصّص)، خلايا الأيام ذات قيمة > 0 بلون أخضر (s="6")
    $dayCols = ['day_sat'=>'E','day_sun'=>'F','day_mon'=>'G','day_tue'=>'H','day_wed'=>'I','day_thu'=>'J'];
    foreach ($weeklyRows as $idx => $wr) {
        $rowXml = '<row r="' . $r . '" ht="22" customHeight="1">';
        $rowXml .= '<c r="A' . $r . '" s="9"><v>' . ($idx + 1) . '</v></c>';
        $v = (string)$wr['employee_name'];
        if (!isset($stringToIdx[$v])) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="B' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $v = (string)$wr['location'];
        if (!isset($stringToIdx[$v])) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="C' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $rowXml .= '<c r="D' . $r . '" s="9"><v>' . $wr['previous_balance'] . '</v></c>';
        foreach ($dayCols as $key => $col) {
            $val = $wr[$key];
            $sty = ($val > 0) ? '6' : '9';
            $rowXml .= '<c r="' . $col . $r . '" s="' . $sty . '"><v>' . $val . '</v></c>';
        }
        $rowXml .= '<c r="K' . $r . '" s="9"><v>' . $wr['total_advances'] . '</v></c>';
        $rowXml .= '<c r="L' . $r . '" s="9"><v>' . $wr['total_deducted'] . '</v></c>';
        $rowXml .= '<c r="M' . $r . '" s="9"><v>' . $wr['remaining'] . '</v></c>';
        $rowXml .= '</row>';
        $rows[] = $rowXml;
        $sumPrev += $wr['previous_balance']; $sumSat += $wr['day_sat']; $sumSun += $wr['day_sun']; $sumMon += $wr['day_mon'];
        $sumTue += $wr['day_tue']; $sumWed += $wr['day_wed']; $sumThu += $wr['day_thu'];
        $sumTotal += $wr['total_advances']; $sumDeducted += $wr['total_deducted']; $sumRemaining += $wr['remaining'];
        $r++;
    }
    // صف المجاميع (فوق الاجمالي) — صيغ SUM فقط (بدون label)، من صف 3 إلى آخر صف بيانات
    $lastDataRow = $r - 1;
    $rowSums = '<row r="' . $r . '" ht="22" customHeight="1">';
    $rowSums .= '<c r="A' . $r . '" s="3"/>';
    $rowSums .= '<c r="B' . $r . '" s="3"/>';
    $rowSums .= '<c r="C' . $r . '" s="3"/>';
    $rowSums .= '<c r="D' . $r . '" s="3"><f>SUM(D5:D' . $lastDataRow . ')</f><v>' . round($sumPrev, 2) . '</v></c>';
    $rowSums .= '<c r="E' . $r . '" s="3"><f>SUM(E5:E' . $lastDataRow . ')</f><v>' . round($sumSat, 2) . '</v></c>';
    $rowSums .= '<c r="F' . $r . '" s="3"><f>SUM(F5:F' . $lastDataRow . ')</f><v>' . round($sumSun, 2) . '</v></c>';
    $rowSums .= '<c r="G' . $r . '" s="3"><f>SUM(G5:G' . $lastDataRow . ')</f><v>' . round($sumMon, 2) . '</v></c>';
    $rowSums .= '<c r="H' . $r . '" s="3"><f>SUM(H5:H' . $lastDataRow . ')</f><v>' . round($sumTue, 2) . '</v></c>';
    $rowSums .= '<c r="I' . $r . '" s="3"><f>SUM(I5:I' . $lastDataRow . ')</f><v>' . round($sumWed, 2) . '</v></c>';
    $rowSums .= '<c r="J' . $r . '" s="3"><f>SUM(J5:J' . $lastDataRow . ')</f><v>' . round($sumThu, 2) . '</v></c>';
    $rowSums .= '<c r="K' . $r . '" s="3"><f>SUM(K5:K' . $lastDataRow . ')</f><v>' . round($sumTotal, 2) . '</v></c>';
    $rowSums .= '<c r="L' . $r . '" s="3"/>';
    $rowSums .= '<c r="M' . $r . '" s="3"/>';
    $rowSums .= '</row>';
    $rows[] = $rowSums;
    $r++;
    // صف الفوتر "الاجمالي" — label في C، وعمود M بصيغة SUM(M3:M(lastDataRow))
    $totalLabelIdx = isset($stringToIdx['الاجمالي']) ? $stringToIdx['الاجمالي'] : 0;
    if (!isset($stringToIdx['الاجمالي'])) { $uniqueStrings[] = 'الاجمالي'; $stringToIdx['الاجمالي'] = count($uniqueStrings) - 1; $totalLabelIdx = $stringToIdx['الاجمالي']; }
    $rowTotal = '<row r="' . $r . '" ht="24" customHeight="1">';
    $rowTotal .= '<c r="A' . $r . '" s="3"/>';
    $rowTotal .= '<c r="B' . $r . '" s="3"/>';
    $rowTotal .= '<c r="C' . $r . '" t="s" s="3"><v>' . $totalLabelIdx . '</v></c>';
    for ($ci = 3; $ci <= 11; $ci++) { $rowTotal .= '<c r="' . $colLetters[$ci] . $r . '" s="3"/>'; }
    $rowTotal .= '<c r="M' . $r . '" s="3"><f>SUM(M5:M' . $lastDataRow . ')</f><v>' . round($sumRemaining, 2) . '</v></c>';
    $rowTotal .= '</row>';
    $rows[] = $rowTotal;
    $sheetData = implode('', $rows);
    $dimension = 'A1:M' . $r;
    $mergeCellsXml = '<mergeCells><mergeCell ref="A1:M1"/><mergeCell ref="A2:M2"/></mergeCells>';
    $sheetViewXml = '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>';
    // عرض الأعمدة: A ضيق، B اسم عريض، C قسم، D سلف سابقة، E–J أيام ضيقة، K–M إجمالي/مستقطع/باقي
    $colsXml = '<cols>';
    $colsXml .= '<col min="1" max="1" width="5" customWidth="1"/>';
    $colsXml .= '<col min="2" max="2" width="18" customWidth="1"/>';
    $colsXml .= '<col min="3" max="3" width="12" customWidth="1"/>';
    $colsXml .= '<col min="4" max="4" width="10" customWidth="1"/>';
    $colsXml .= '<col min="5" max="10" width="8" customWidth="1"/>';
    $colsXml .= '<col min="11" max="11" width="12" customWidth="1"/>';
    $colsXml .= '<col min="12" max="12" width="14" customWidth="1"/>';
    $colsXml .= '<col min="13" max="13" width="12" customWidth="1"/>';
    $colsXml .= '</cols>';
} elseif ($useMonthlyGrid) {
    // شبكة شهرية: البيان، اسم العامل، الموقع، سلف سابقة، سلف الشهر، اجمالي السلف، المستقطع من السلف، باقي السلفه
    $colLetters = ['A','B','C','D','E','F','G','H'];
    $reportTitleMonthly = 'تقرير السلف الشهري';
    $subtitleMonthly = 'عرض تفاصيل السلف — الشهر: ' . $monthParam;
    $headers = ['البيان', 'اسم العامل', 'الموقع', 'سلف سابقة', 'سلف الشهر', 'اجمالي السلف', 'المستقطع من السلف', 'باقي السلفه'];
    $allStrings = [$reportTitleMonthly, $subtitleMonthly];
    foreach ($headers as $h) { $allStrings[] = $h; }
    $allStrings[] = 'الاجمالي';
    foreach ($monthlyRows as $mr) {
        $allStrings[] = (string)$mr['employee_name'];
        $allStrings[] = (string)$mr['location'];
    }
    $uniqueStrings = array_values(array_unique($allStrings));
    $stringToIdx = array_flip($uniqueStrings);
    $sumPrev = $sumMonth = $sumTotal = $sumDeducted = $sumRemaining = 0;
    foreach ($monthlyRows as $mr) {
        $sumPrev += $mr['previous_balance']; $sumMonth += $mr['month_advances']; $sumTotal += $mr['total_advances'];
        $sumDeducted += $mr['total_deducted']; $sumRemaining += $mr['remaining'];
    }
    $rows = [];
    $r = 1;
    $rows[] = '<row r="' . $r . '" ht="28" customHeight="1"><c r="A' . $r . '" t="s" s="4"><v>' . ($stringToIdx[$reportTitleMonthly] ?? 0) . '</v></c></row>';
    $r++;
    $rows[] = '<row r="' . $r . '" ht="24" customHeight="1"><c r="A' . $r . '" t="s" s="5"><v>' . ($stringToIdx[$subtitleMonthly] ?? 0) . '</v></c></row>';
    $r++;
    $lastDataRowMonthly = 4 + count($monthlyRows);
    $row1 = '<row r="' . $r . '" ht="36" customHeight="1">';
    foreach ($headers as $ci => $t) {
        $row1 .= '<c r="' . $colLetters[$ci] . $r . '" t="s" s="3"><v>' . ($stringToIdx[$t] ?? 0) . '</v></c>';
    }
    $row1 .= '</row>';
    $rows[] = $row1;
    $r++;
    $row2 = '<row r="' . $r . '" ht="22" customHeight="1">';
    for ($ci = 0; $ci < 4; $ci++) { $row2 .= '<c r="' . $colLetters[$ci] . $r . '" s="3"/>'; }
    $row2 .= '<c r="E' . $r . '" s="3"/>';
    $row2 .= '<c r="F' . $r . '" s="3"><f>SUM(F5:F' . $lastDataRowMonthly . ')</f><v>' . round($sumTotal, 2) . '</v></c>';
    $row2 .= '<c r="G' . $r . '" s="3"><f>SUM(G5:G' . $lastDataRowMonthly . ')</f><v>' . round($sumDeducted, 2) . '</v></c>';
    $row2 .= '<c r="H' . $r . '" s="3"><f>SUM(H5:H' . $lastDataRowMonthly . ')</f><v>' . round($sumRemaining, 2) . '</v></c>';
    $row2 .= '</row>';
    $rows[] = $row2;
    $r++;
    foreach ($monthlyRows as $idx => $mr) {
        $rowXml = '<row r="' . $r . '" ht="22" customHeight="1">';
        $rowXml .= '<c r="A' . $r . '" s="9"><v>' . ($idx + 1) . '</v></c>';
        $v = (string)$mr['employee_name'];
        if (!isset($stringToIdx[$v])) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="B' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $v = (string)$mr['location'];
        if (!isset($stringToIdx[$v])) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="C' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $rowXml .= '<c r="D' . $r . '" s="9"><v>' . $mr['previous_balance'] . '</v></c>';
        $styE = ($mr['month_advances'] > 0) ? '6' : '9';
        $rowXml .= '<c r="E' . $r . '" s="' . $styE . '"><v>' . $mr['month_advances'] . '</v></c>';
        $rowXml .= '<c r="F' . $r . '" s="9"><v>' . $mr['total_advances'] . '</v></c>';
        $rowXml .= '<c r="G' . $r . '" s="9"><v>' . $mr['total_deducted'] . '</v></c>';
        $rowXml .= '<c r="H' . $r . '" s="9"><v>' . $mr['remaining'] . '</v></c>';
        $rowXml .= '</row>';
        $rows[] = $rowXml;
        $r++;
    }
    $lastDataRow = max(5, $r - 1);
    $rowSums = '<row r="' . $r . '" ht="22" customHeight="1">';
    $rowSums .= '<c r="A' . $r . '" s="3"/>';
    $rowSums .= '<c r="B' . $r . '" s="3"/>';
    $rowSums .= '<c r="C' . $r . '" s="3"/>';
    $rowSums .= '<c r="D' . $r . '" s="3"><f>SUM(D5:D' . $lastDataRow . ')</f><v>' . round($sumPrev, 2) . '</v></c>';
    $rowSums .= '<c r="E' . $r . '" s="3"><f>SUM(E5:E' . $lastDataRow . ')</f><v>' . round($sumMonth, 2) . '</v></c>';
    $rowSums .= '<c r="F' . $r . '" s="3"><f>SUM(F5:F' . $lastDataRow . ')</f><v>' . round($sumTotal, 2) . '</v></c>';
    $rowSums .= '<c r="G' . $r . '" s="3"/>';
    $rowSums .= '<c r="H' . $r . '" s="3"/>';
    $rowSums .= '</row>';
    $rows[] = $rowSums;
    $r++;
    $totalLabelIdx = isset($stringToIdx['الاجمالي']) ? $stringToIdx['الاجمالي'] : 0;
    if (!isset($stringToIdx['الاجمالي'])) { $uniqueStrings[] = 'الاجمالي'; $stringToIdx['الاجمالي'] = count($uniqueStrings) - 1; $totalLabelIdx = $stringToIdx['الاجمالي']; }
    $rowTotal = '<row r="' . $r . '" ht="24" customHeight="1">';
    $rowTotal .= '<c r="A' . $r . '" s="3"/>';
    $rowTotal .= '<c r="B' . $r . '" s="3"/>';
    $rowTotal .= '<c r="C' . $r . '" t="s" s="3"><v>' . $totalLabelIdx . '</v></c>';
    $rowTotal .= '<c r="D' . $r . '" s="3"/>';
    $rowTotal .= '<c r="E' . $r . '" s="3"/>';
    $rowTotal .= '<c r="F' . $r . '" s="3"/>';
    $rowTotal .= '<c r="G' . $r . '" s="3"/>';
    $rowTotal .= '<c r="H' . $r . '" s="3"><f>SUM(H5:H' . $lastDataRow . ')</f><v>' . round($sumRemaining, 2) . '</v></c>';
    $rowTotal .= '</row>';
    $rows[] = $rowTotal;
    $sheetData = implode('', $rows);
    $dimension = 'A1:H' . $r;
    $mergeCellsXml = '<mergeCells><mergeCell ref="A1:H1"/><mergeCell ref="A2:H2"/></mergeCells>';
    $sheetViewXml = '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>';
    $colsXml = '<cols>';
    $colsXml .= '<col min="1" max="1" width="5" customWidth="1"/>';
    $colsXml .= '<col min="2" max="2" width="18" customWidth="1"/>';
    $colsXml .= '<col min="3" max="3" width="12" customWidth="1"/>';
    $colsXml .= '<col min="4" max="4" width="10" customWidth="1"/>';
    $colsXml .= '<col min="5" max="5" width="10" customWidth="1"/>';
    $colsXml .= '<col min="6" max="6" width="12" customWidth="1"/>';
    $colsXml .= '<col min="7" max="7" width="14" customWidth="1"/>';
    $colsXml .= '<col min="8" max="8" width="12" customWidth="1"/>';
    $colsXml .= '</cols>';
} else {
    // تقرير قائمة السلف — نفس تصميم تقارير الأجر: هيدر سطرين مدمج + حدود سوداء
    $reportTitle = 'تقرير السلف';
    $subtitleStr = 'عرض قائمة السلف — تاريخ التصدير: ' . $reportDate;
    $colTitles = ['رقم السلفة', 'اسم الموظف', 'الكود', 'نوع الراتب', 'مبلغ السلفة', 'المسدد', 'المتبقي', 'الحالة', 'تاريخ الإنشاء'];
    $footerText = 'تم إنشاء التقرير في ' . $reportDate . ' — نظام إدارة الحضور والمرتبات';
    $statusLabels = ['pending' => 'معلقة', 'activated' => 'نشطة', 'completed' => 'مسددة', 'cancelled' => 'ملغاة'];
    $typeLabels = ['Weekly' => 'أسبوعي', 'Monthly' => 'شهري'];
    $allStrings = [$reportTitle, $subtitleStr, $reportDate];
    foreach ($colTitles as $t) { $allStrings[] = $t; }
    $allStrings[] = $footerText;
    foreach ($advances as $a) {
        $allStrings[] = (string)($a['employee_name'] ?? '');
        $allStrings[] = (string)($a['employee_code'] ?? '');
        $allStrings[] = $typeLabels[$a['salary_type'] ?? ''] ?? ($a['salary_type'] ?? '');
        $allStrings[] = $statusLabels[$a['status'] ?? ''] ?? ($a['status'] ?? '');
    }
    $uniqueStrings = array_values(array_unique($allStrings));
    $stringToIdx = array_flip($uniqueStrings);
    $colLetters = ['A','B','C','D','E','F','G','H','I'];
    $lastCol = $colLetters[count($colTitles) - 1];
    $rows = [];
    $r = 1;
    $rows[] = '<row r="' . $r . '" ht="28" customHeight="1"><c r="A' . $r . '" t="s" s="4"><v>' . ($stringToIdx[$reportTitle] ?? 0) . '</v></c></row>';
    $r++;
    $rows[] = '<row r="' . $r . '" ht="24" customHeight="1"><c r="A' . $r . '" t="s" s="5"><v>' . ($stringToIdx[$subtitleStr] ?? 0) . '</v></c></row>';
    $r++;
    $headerRow = '<row r="' . $r . '" ht="36" customHeight="1">';
    foreach (array_values($colTitles) as $ci => $t) {
        $headerRow .= '<c r="' . $colLetters[$ci] . $r . '" t="s" s="3"><v>' . ($stringToIdx[$t] ?? 0) . '</v></c>';
    }
    $headerRow .= '</row>';
    $rows[] = $headerRow;
    $r++;
    foreach ($advances as $a) {
        $rowXml = '<row r="' . $r . '" ht="22" customHeight="1">';
        $rowXml .= '<c r="A' . $r . '" s="9"><v>' . (int)($a['id'] ?? 0) . '</v></c>';
        $v = (string)($a['employee_name'] ?? ''); if (!array_key_exists($v, $stringToIdx)) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="B' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $v = (string)($a['employee_code'] ?? ''); if (!array_key_exists($v, $stringToIdx)) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="C' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $v = $typeLabels[$a['salary_type'] ?? ''] ?? ($a['salary_type'] ?? ''); if (!array_key_exists($v, $stringToIdx)) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="D' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $rowXml .= '<c r="E' . $r . '" s="9"><v>' . round((float)($a['advance_amount'] ?? 0), 2) . '</v></c>';
        $rowXml .= '<c r="F' . $r . '" s="9"><v>' . round((float)($a['paid_amount'] ?? 0), 2) . '</v></c>';
        $rowXml .= '<c r="G' . $r . '" s="9"><v>' . round((float)($a['remaining_amount'] ?? 0), 2) . '</v></c>';
        $v = $statusLabels[$a['status'] ?? ''] ?? ($a['status'] ?? ''); if (!array_key_exists($v, $stringToIdx)) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="H' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $v = isset($a['created_at']) ? date('Y-m-d', strtotime($a['created_at'])) : ''; if (!array_key_exists($v, $stringToIdx)) { $stringToIdx[$v] = count($uniqueStrings); $uniqueStrings[] = $v; }
        $rowXml .= '<c r="I' . $r . '" t="s" s="9"><v>' . $stringToIdx[$v] . '</v></c>';
        $rowXml .= '</row>';
        $rows[] = $rowXml;
        $r++;
    }
    $rows[] = '<row r="' . $r . '"><c r="A' . $r . '" t="s" s="2"><v>' . ($stringToIdx[$footerText] ?? 0) . '</v></c></row>';
    $sheetData = implode('', $rows);
    $dimension = 'A1:' . $lastCol . $r;
    $mergeCellsXml = '<mergeCells><mergeCell ref="A1:' . $lastCol . '1"/><mergeCell ref="A2:' . $lastCol . '2"/></mergeCells>';
    $sheetViewXml = '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>';
    $colsXml = '<cols>';
    for ($i = 0; $i < count($colTitles); $i++) {
        $colsXml .= '<col min="' . ($i + 1) . '" max="' . ($i + 1) . '" width="10" customWidth="1"/>';
    }
    $colsXml .= '</cols>';
}

// sharedStrings.xml — إزالة أحرف التحكم التي تكسر XML
$sanitize = function($s) {
    $s = (string) $s;
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
    return $s;
};
$sstBody = '';
foreach ($uniqueStrings as $i => $s) {
    $s = $sanitize($s);
    $esc = htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    if (preg_match('/[<\>&]/', $s)) {
        $sstBody .= '<si><t xml:space="preserve">' . $esc . '</t></si>';
    } else {
        $sstBody .= '<si><t>' . $esc . '</t></si>';
    }
}
$sharedStringsXml = '<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' . count($uniqueStrings) . '" uniqueCount="' . count($uniqueStrings) . '">' . $sstBody . '</sst>';

// styles.xml — نفس تصميم تقارير الأجر: حدود سوداء (All Borders)، هيدر سطرين، wrapText للأعمدة
$stylesXml = '<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
    <font><sz val="10"/><name val="Calibri"/><color rgb="FFE2E8E8"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><name val="Calibri"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F212E"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2F4553"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFC000"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyBorder="1"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
</styleSheet>';

// sheet1.xml — بدون dimension (اختياري؛ Excel يحسب النطاق تلقائياً ويقلل أخطاء الفتح)
$pageSetup = '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>';
$footerEscaped = htmlspecialchars($reportDate, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$headerFooter = '<headerFooter><oddHeader>&amp;C&amp;14&amp;K1F212E تقرير السلف</oddHeader><oddFooter>&amp;C&amp;10&amp;K2F4553 تم الإنشاء في ' . $footerEscaped . '</oddFooter></headerFooter>';
$sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n"
  . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  . $sheetViewXml
  . $colsXml
  . '<sheetData>' . $sheetData . '</sheetData>'
  . $mergeCellsXml
  . '<printOptions horizontalCentered="1"/>'
  . '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
  . $pageSetup
  . $headerFooter
  . '</worksheet>';

$contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>';

$workbookRels = '<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>';

$workbookXml = '<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="السلف" sheetId="1" r:id="rId1"/></sheets>
</workbook>';

$relsRels = '<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>';

$docPropsCore = '<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>TimePay</dc:creator><cp:lastModifiedBy>TimePay</cp:lastModifiedBy><cp:revision>1</cp:revision></cp:coreProperties>';

$docPropsApp = '<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>TimePay</Application></Properties>';


$zip = new ZipArchive();
$tmp = tempnam(sys_get_temp_dir(), 'adv');
$zip->open($tmp, ZipArchive::OVERWRITE | ZipArchive::CREATE);
$zip->addFromString('[Content_Types].xml', $contentTypesXml);
$zip->addFromString('_rels/.rels', $relsRels);
$zip->addFromString('xl/workbook.xml', $workbookXml);
$zip->addFromString('xl/_rels/workbook.xml.rels', $workbookRels);
$zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);
$zip->addFromString('xl/sharedStrings.xml', $sharedStringsXml);
$zip->addFromString('xl/styles.xml', $stylesXml);
$zip->addFromString('docProps/core.xml', $docPropsCore);
$zip->addFromString('docProps/app.xml', $docPropsApp);
$zip->close();

echo file_get_contents($tmp);
unlink($tmp);
