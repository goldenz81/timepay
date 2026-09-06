<?php
/**
 * مساعدات تنظيف بيانات الموظف المرتبطة (البصمة وغيرها)
 */

function employeesTableHasAcNoColumn(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    try {
        $check = $pdo->query("SHOW COLUMNS FROM employees LIKE 'AC-No.'");
        $cached = $check && $check->rowCount() > 0;
    } catch (Exception $e) {
        $cached = false;
    }
    return $cached;
}

/**
 * جمع أكواد البصمة المحتملة للموظف (AC-No. ثم employee_code للتوافق مع بيانات قديمة).
 *
 * @return string[]
 */
function collectEmployeeFingerprintAcNos(PDO $pdo, $employeeId): array
{
    $acNos = [];

    if (employeesTableHasAcNoColumn($pdo)) {
        $stmt = $pdo->prepare('SELECT TRIM(CAST(`AC-No.` AS CHAR)) FROM employees WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $employeeId]);
        $ac = trim((string) $stmt->fetchColumn());
        if ($ac !== '') {
            $acNos[] = $ac;
        }
    }

    $stmt = $pdo->prepare('SELECT TRIM(CAST(employee_code AS CHAR)) FROM employees WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $employeeId]);
    $employeeCode = trim((string) $stmt->fetchColumn());
    if ($employeeCode !== '' && !in_array($employeeCode, $acNos, true)) {
        $acNos[] = $employeeCode;
    }

    return $acNos;
}

/**
 * حذف سجلات fingerprint_attendance المرتبطة بموظف واحد.
 */
function deleteFingerprintAttendanceForEmployee(PDO $pdo, $employeeId): int
{
    $acNos = collectEmployeeFingerprintAcNos($pdo, $employeeId);
    if (!$acNos) {
        return 0;
    }

    $deleted = 0;
    $stmt = $pdo->prepare('DELETE FROM fingerprint_attendance WHERE TRIM(ac_no) = ?');
    foreach ($acNos as $acNo) {
        $stmt->execute([$acNo]);
        $deleted += (int) $stmt->rowCount();
    }

    return $deleted;
}

/**
 * حذف سجلات fingerprint_attendance لعدة موظفين.
 *
 * @param int[] $employeeIds
 */
function deleteFingerprintAttendanceForEmployeeIds(PDO $pdo, array $employeeIds): int
{
    $employeeIds = array_values(array_unique(array_filter(array_map('intval', $employeeIds))));
    if (!$employeeIds) {
        return 0;
    }

    $acNos = [];
    $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));

    if (employeesTableHasAcNoColumn($pdo)) {
        $stmt = $pdo->prepare("SELECT TRIM(CAST(`AC-No.` AS CHAR)) FROM employees WHERE id IN ($placeholders)");
        $stmt->execute($employeeIds);
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $ac) {
            $ac = trim((string) $ac);
            if ($ac !== '') {
                $acNos[$ac] = true;
            }
        }
    }

    $stmt = $pdo->prepare("SELECT TRIM(CAST(employee_code AS CHAR)) FROM employees WHERE id IN ($placeholders)");
    $stmt->execute($employeeIds);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $code) {
        $code = trim((string) $code);
        if ($code !== '') {
            $acNos[$code] = true;
        }
    }

    if (!$acNos) {
        return 0;
    }

    $deleted = 0;
    $deleteStmt = $pdo->prepare('DELETE FROM fingerprint_attendance WHERE TRIM(ac_no) = ?');
    foreach (array_keys($acNos) as $acNo) {
        $deleteStmt->execute([$acNo]);
        $deleted += (int) $deleteStmt->rowCount();
    }

    return $deleted;
}
