<?php
/**
 * توزيع FIFO للمستقطعات + مزامنة حالة السلف (نشطة ↔ مسددة)
 */

/**
 * FIFO: advance_deducted يُوزَّع على السلف (أقدم أولاً).
 *
 * @param array $options
 *   - deductions_before_end (Y-m-d): مستقطعات period_end < هذا التاريخ فقط
 *   - advances_granted_before (Y-m-d): سلف DATE(COALESCE(start_date,created_at)) < هذا التاريخ فقط
 *
 * @return array [advance_id => total_paid_from_deductions]
 */
function computeFifoPaidForEmployees($pdo, array $employeeIds, array $options = []) {
    $employeeIds = array_values(array_unique(array_filter(array_map('intval', $employeeIds))));
    if (!$employeeIds) {
        return [];
    }

    $deductionsBeforeEnd = $options['deductions_before_end'] ?? null;
    $advancesGrantedBefore = $options['advances_granted_before'] ?? null;

    $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));

    $advSql = "
        SELECT id, employee_id, advance_amount, status,
               DATE(COALESCE(start_date, created_at)) AS grant_date
        FROM employee_advances
        WHERE employee_id IN ($placeholders)
          AND status NOT IN ('cancelled', 'pending')
        ORDER BY employee_id, created_at ASC, id ASC
    ";
    $stmt = $pdo->prepare($advSql);
    $stmt->execute($employeeIds);
    $allAdvances = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $dedSql = "
        SELECT employee_id, amount
        FROM manual_adjustments
        WHERE employee_id IN ($placeholders) AND adj_key = 'advance_deducted'
    ";
    $dedParams = $employeeIds;
    if ($deductionsBeforeEnd && preg_match('/^\d{4}-\d{2}-\d{2}$/', $deductionsBeforeEnd)) {
        $dedSql .= ' AND period_end < ?';
        $dedParams[] = $deductionsBeforeEnd;
    }
    $dedSql .= ' ORDER BY employee_id, period_start ASC, id ASC';

    $stmt = $pdo->prepare($dedSql);
    $stmt->execute($dedParams);
    $allDeductions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    $advByEmp = [];

    foreach ($allAdvances as $a) {
        $eid = (int)$a['employee_id'];
        $id = (int)$a['id'];
        $amount = (float)$a['advance_amount'];
        $grantDate = (string)($a['grant_date'] ?? '');

        if ($advancesGrantedBefore && preg_match('/^\d{4}-\d{2}-\d{2}$/', $advancesGrantedBefore)) {
            if ($grantDate === '' || $grantDate >= $advancesGrantedBefore) {
                continue;
            }
        }

        $advByEmp[$eid][] = [
            'id' => $id,
            'remaining' => $amount,
        ];
    }

    $dedByEmp = [];
    foreach ($allDeductions as $d) {
        $eid = (int)$d['employee_id'];
        $dedByEmp[$eid][] = (float)$d['amount'];
    }

    foreach ($employeeIds as $eid) {
        $advs = $advByEmp[$eid] ?? [];
        $deductions = $dedByEmp[$eid] ?? [];
        if (!$advs || !$deductions) {
            continue;
        }
        foreach ($deductions as $amount) {
            $remainingFromRow = $amount;
            if ($remainingFromRow <= 0) {
                continue;
            }
            foreach ($advs as &$st) {
                if ($remainingFromRow <= 0) {
                    break;
                }
                if ($st['remaining'] <= 0) {
                    continue;
                }
                $pay = min($st['remaining'], $remainingFromRow);
                $st['remaining'] -= $pay;
                $remainingFromRow -= $pay;
                $result[$st['id']] = ($result[$st['id']] ?? 0) + $pay;
            }
            unset($st);
        }
    }

    return $result;
}

/**
 * مجموع المتبقي من سلف قبل تاريخ (سلف سابقة) — نفس منطق FIFO
 */
function computeUnpaidAdvancesBeforeDate($pdo, $employeeId, $beforeDate, $statusFilter = null) {
    $employeeId = (int)$employeeId;
    if (!$employeeId || !$beforeDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $beforeDate)) {
        return 0.0;
    }

    $sql = "
        SELECT id, advance_amount, status
        FROM employee_advances
        WHERE employee_id = ?
          AND status NOT IN ('cancelled', 'pending')
          AND DATE(COALESCE(start_date, created_at)) < ?
    ";
    $params = [$employeeId, $beforeDate];
    if ($statusFilter && in_array($statusFilter, ['pending', 'activated', 'completed', 'cancelled'], true)) {
        $sql = "
            SELECT id, advance_amount, status
            FROM employee_advances
            WHERE employee_id = ?
              AND status = ?
              AND DATE(COALESCE(start_date, created_at)) < ?
        ";
        $params = [$employeeId, $statusFilter, $beforeDate];
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $advances = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$advances) {
        return 0.0;
    }

    $paidMap = computeFifoPaidForEmployees($pdo, [$employeeId], [
        'deductions_before_end' => $beforeDate,
        'advances_granted_before' => $beforeDate,
    ]);

    $totalUnpaid = 0.0;
    foreach ($advances as $a) {
        $id = (int)$a['id'];
        $amount = (float)$a['advance_amount'];
        $paid = min($amount, (float)($paidMap[$id] ?? 0));
        $totalUnpaid += max(0, $amount - $paid);
    }

    return $totalUnpaid;
}

/**
 * نشطة → مسددة فقط عند اكتمال السداد؛ مسددة → نشطة إذا بقي متبقٍ (بعد تصحيح مستقطع).
 */
function syncAdvanceStatusesForEmployee($pdo, $employeeId) {
    $employeeId = (int)$employeeId;
    if (!$employeeId) {
        return;
    }

    $paidMap = computeFifoPaidForEmployees($pdo, [$employeeId]);

    $stmt = $pdo->prepare("
        SELECT id, advance_amount, status
        FROM employee_advances
        WHERE employee_id = ? AND status IN ('activated', 'completed')
    ");
    $stmt->execute([$employeeId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $markCompleted = $pdo->prepare("
        UPDATE employee_advances
        SET status = 'completed', completed_at = NOW()
        WHERE id = ? AND status = 'activated'
    ");
    $markActivated = $pdo->prepare("
        UPDATE employee_advances
        SET status = 'activated', completed_at = NULL
        WHERE id = ? AND status = 'completed'
    ");

    foreach ($rows as $row) {
        $id = (int)$row['id'];
        $amount = (float)$row['advance_amount'];
        $status = (string)$row['status'];
        if ($amount <= 0) {
            continue;
        }
        $paid = min($amount, (float)($paidMap[$id] ?? 0));
        $fullyPaid = $paid + 0.001 >= $amount;

        if ($fullyPaid && $status === 'activated') {
            $markCompleted->execute([$id]);
        } elseif (!$fullyPaid && $status === 'completed') {
            $markActivated->execute([$id]);
        }
    }
}

/** @deprecated استخدم syncAdvanceStatusesForEmployee */
function markCompletedAdvancesIfFullyPaid($pdo, $employeeId) {
    syncAdvanceStatusesForEmployee($pdo, $employeeId);
}
