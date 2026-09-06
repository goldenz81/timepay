<?php
// استيراد ملف XML للموظفين (نفس تنسيق employees_export_xml.php)
require_once 'cors_headers.php';
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * قراءة حالة الموظف من XML (مستوى Employee فقط — وليس Status داخل الحضور).
 */
function readEmployeeStatusFromXml(SimpleXMLElement $empNode): string
{
    $nodes = $empNode->xpath('./Status');
    if (!isset($nodes[0])) {
        return '';
    }
    return trim((string) $nodes[0]);
}

/**
 * توحيد قيمة الحالة لقيم enum في جدول employees.
 */
function normalizeEmployeeStatus(string $raw): string
{
    $status = strtolower(trim($raw));
    if (in_array($status, ['active', 'inactive', 'terminated'], true)) {
        return $status;
    }
    if (in_array($status, ['1', 'true', 'yes', 'on', 'نشط', 'فعال'], true)) {
        return 'active';
    }
    if (in_array($status, ['0', 'false', 'no', 'off', 'غير نشط', 'غير_نشط', 'معطل'], true)) {
        return 'inactive';
    }
    return $status !== '' ? $status : 'active';
}

/**
 * اختيار الموظف الصحيح عند تكرار كود البصمة في قاعدة البيانات.
 */
function resolveEmployeeIdFromCandidates(array $rows, SimpleXMLElement $empNode, string $matchCode = ''): ?int
{
    if (!$rows) {
        return null;
    }
    if (count($rows) === 1) {
        return (int) $rows[0]['id'];
    }

    if ($matchCode !== '') {
        foreach ($rows as $row) {
            if (trim((string) ($row['employee_code'] ?? '')) === $matchCode) {
                return (int) $row['id'];
            }
        }
    }

    $xmlIdAttr = trim((string) ($empNode['id'] ?? ''));
    if ($xmlIdAttr !== '' && ctype_digit($xmlIdAttr)) {
        foreach ($rows as $row) {
            if ((int) $row['id'] === (int) $xmlIdAttr) {
                return (int) $row['id'];
            }
        }
    }

    $nameEn = trim((string) ($empNode->NameEn ?? ''));
    if ($nameEn !== '') {
        foreach ($rows as $row) {
            if (strcasecmp(trim((string) ($row['name'] ?? '')), $nameEn) === 0) {
                return (int) $row['id'];
            }
        }
    }

    $nameAr = trim((string) ($empNode->NameAr ?? ''));
    if ($nameAr !== '') {
        foreach ($rows as $row) {
            if (trim((string) ($row['name_ar'] ?? '')) === $nameAr) {
                return (int) $row['id'];
            }
        }
    }

    // عدم التخمين عند تعدد المرشحين — يمنع ربط موظفين مختلفين بنفس كود البصمة
    return null;
}

/**
 * البحث عن موظف بكود البصمة مع حل التعارضات.
 */
function findEmployeeIdByFingerprint(PDO $pdo, string $acNo, SimpleXMLElement $empNode, string $matchCode = ''): ?int
{
    $stmt = $pdo->prepare('SELECT id, employee_code, name, name_ar FROM employees WHERE TRIM(CAST(`AC-No.` AS CHAR)) = ?');
    $stmt->execute([$acNo]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return resolveEmployeeIdFromCandidates($rows, $empNode, $matchCode);
}

/**
 * هل كود البصمة مستخدم لموظف آخر؟
 */
function employeeDisplayNameFromXml(SimpleXMLElement $empNode): string
{
    $nameAr = trim((string) ($empNode->NameAr ?? ''));
    $nameEn = trim((string) ($empNode->NameEn ?? ''));
    if ($nameAr !== '') {
        return $nameAr;
    }
    if ($nameEn !== '') {
        return $nameEn;
    }
    return 'غير معروف';
}

function recordFingerprintSkip(
    array &$details,
    SimpleXMLElement $empNode,
    string $acNo,
    string $reason,
    string $conflictWith = ''
): void {
    $details[] = [
        'xml_id' => trim((string) ($empNode['id'] ?? '')),
        'name' => employeeDisplayNameFromXml($empNode),
        'name_en' => trim((string) ($empNode->NameEn ?? '')),
        'fingerprint_code' => $acNo,
        'reason' => $reason,
        'conflict_with' => $conflictWith,
    ];
}

function findFingerprintCodeConflict(PDO $pdo, string $acNo, int $excludeEmployeeId = 0): ?array
{
    if ($acNo === '') {
        return null;
    }
    $stmt = $pdo->prepare('
        SELECT id, employee_code, name, name_ar
        FROM employees
        WHERE TRIM(CAST(`AC-No.` AS CHAR)) = ? AND id != ?
        LIMIT 1
    ');
    $stmt->execute([$acNo, $excludeEmployeeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * توليد كود موظف رقمي غير مستخدم.
 */
function allocateNextEmployeeCodeForImport(PDO $pdo): string
{
    $stmt = $pdo->query("
        SELECT MAX(CAST(employee_code AS UNSIGNED)) AS max_code
        FROM employees
        WHERE employee_code REGEXP '^[0-9]+$'
    ");
    $maxResult = $stmt->fetch(PDO::FETCH_ASSOC);
    $next = ($maxResult && $maxResult['max_code'] !== null) ? ((int) $maxResult['max_code'] + 1) : 1;

    while (true) {
        $candidate = (string) $next;
        $check = $pdo->prepare('SELECT id FROM employees WHERE employee_code = ? LIMIT 1');
        $check->execute([$candidate]);
        if (!$check->fetchColumn()) {
            return $candidate;
        }
        $next++;
    }
}

/**
 * البحث عن موظف بكود الموظف الرسمي.
 */
function findEmployeeIdByEmployeeCode(PDO $pdo, string $employeeCode): ?int
{
    $employeeCode = trim($employeeCode);
    if ($employeeCode === '') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id FROM employees WHERE TRIM(employee_code) = ? LIMIT 1');
    $stmt->execute([$employeeCode]);
    $id = $stmt->fetchColumn();
    return $id ? (int) $id : null;
}

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data) || empty($data['xml'])) {
        throw new Exception('الطلب يجب أن يحتوي على حقل xml');
    }

    $xmlString = $data['xml'];
    $cleanImport = !empty($data['clean_import']) || (($data['import_mode'] ?? '') === 'clean');

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlString);
    if ($xml === false) {
        throw new Exception('ملف XML غير صالح');
    }

    $created = 0;
    $updated = 0;
    $skippedNoCode = 0;
    $matchedByFingerprint = 0;
    $matchedByXmlId = 0;
    $matchedByEmployeeCode = 0;
    $inactiveImported = 0;
    $insuredImported = 0;
    $attendanceImported = 0;
    $advancesImported = 0;
    $adjustmentsImported = 0;
    $duplicateFingerprintSkipped = 0;
    $duplicateFingerprintSkippedDetails = [];
    $duplicateEmployeeCodeResolved = 0;
    $xmlIdCodeMismatchCount = 0;
    $xmlIdCodeMismatchDetails = [];
    $assignedFingerprintsInFile = [];
    $seenFingerprintCodesInFile = [];
    $seenEmployeeCodesInFile = [];
    $fileEmployeeCount = count($xml->Employee);

    // فحص توفر أعمدة كود البصمة والتمييز والحوافز في جدول الموظفين (مرة واحدة فقط)
    $checkAcNo = $pdo->query("SHOW COLUMNS FROM employees LIKE 'AC-No.'");
    $hasAcNo = $checkAcNo->rowCount() > 0;
    $checkDisc = $pdo->query("SHOW COLUMNS FROM employees LIKE 'discrimination_incentive_allowance'");
    $hasDiscrimination = $checkDisc->rowCount() > 0;

    foreach ($xml->Employee as $empNode) {
        // كود الموظف الرسمي (منفصل عن كود البصمة)
        $matchCode = trim((string)($empNode['employee_code'] ?? ''));
        if ($matchCode === '') $matchCode = trim((string)($empNode->EmployeeCode ?? ''));
        if ($matchCode === '') $matchCode = trim((string)($empNode->EmpCode ?? ''));

        // كود البصمة
        $acNo = trim((string) ($empNode->FingerprintCode ?? ''));

        $xmlIdAttr = trim((string) ($empNode['id'] ?? ''));

        // كود الإدراج عند إنشاء سجل جديد
        if ($cleanImport) {
            // استيراد نظيف: فقط كود الموظف الرسمي — بدون id من XML أو كود البصمة
            $code = $matchCode;
            if ($matchCode === '') {
                $skippedNoCode++;
                continue;
            }
        } else {
            $code = $matchCode;
            if ($code === '' && $xmlIdAttr !== '') {
                $code = $xmlIdAttr;
            }
            if ($code === '' && $acNo !== '') {
                $code = $acNo;
            }

            if ($code === '' && $matchCode === '' && $xmlIdAttr === '' && $acNo === '') {
                $skippedNoCode++;
                continue;
            }
        }

        $employeeStatus = normalizeEmployeeStatus(readEmployeeStatusFromXml($empNode));
        if ($employeeStatus === 'inactive') {
            $inactiveImported++;
        }

        $fields = [
            'name' => (string) ($empNode->NameEn ?? ''),
            'name_ar' => (string) ($empNode->NameAr ?? ''),
            'base_salary' => (string) ($empNode->BaseSalary ?? '0'),
            'salary_type' => (string) ($empNode->SalaryType ?? 'Monthly'),
            'department' => (string) ($empNode->Department ?? ''),
            'cost_center' => (string) ($empNode->CostCenter ?? ''),
            'location' => (string) ($empNode->Location ?? ''),
            'position' => (string) ($empNode->Position ?? ''),
            'hire_date' => (string) ($empNode->HireDate ?? ''),
        ];
        $isInsuredRaw = trim((string)($empNode->IsInsured ?? ''));
        $isInsured = null;
        if ($isInsuredRaw !== '') {
            $normalizedInsured = strtolower($isInsuredRaw);
            $isInsured = in_array($normalizedInsured, ['1', 'true', 'yes', 'on'], true) ? 1 : 0;
            if ($isInsured === 1) {
                $insuredImported++;
            }
        }

        $discrimination = trim((string) ($empNode->DiscriminationIncentiveAllowance ?? ''));

        $isDuplicateFingerprintInFile = false;
        if ($acNo !== '') {
            if (isset($seenFingerprintCodesInFile[$acNo])) {
                $isDuplicateFingerprintInFile = true;
                $duplicateFingerprintSkipped++;
                $firstOwner = $seenFingerprintCodesInFile[$acNo];
                recordFingerprintSkip(
                    $duplicateFingerprintSkippedDetails,
                    $empNode,
                    $acNo,
                    'duplicate_in_file',
                    $firstOwner['name'] . ($firstOwner['xml_id'] !== '' ? " (id={$firstOwner['xml_id']})" : '')
                );
            } else {
                $seenFingerprintCodesInFile[$acNo] = [
                    'name' => employeeDisplayNameFromXml($empNode),
                    'xml_id' => $xmlIdAttr,
                ];
            }
        }

        // مطابقة الموظف
        $existingId = null;
        if ($matchCode !== '') {
            $existingId = findEmployeeIdByEmployeeCode($pdo, $matchCode);
            if ($existingId) {
                $matchedByEmployeeCode++;
            }
        }

        if (!$cleanImport) {
            if (!$existingId && $xmlIdAttr !== '' && ctype_digit($xmlIdAttr)) {
                $stmt = $pdo->prepare('SELECT id, TRIM(CAST(employee_code AS CHAR)) AS employee_code FROM employees WHERE id = ? LIMIT 1');
                $stmt->execute([(int) $xmlIdAttr]);
                $rowById = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($rowById) {
                    $dbCode = trim((string) ($rowById['employee_code'] ?? ''));
                    $canMatchByXmlId = ($matchCode === '')
                        || ($dbCode === '')
                        || ($dbCode === $matchCode);
                    if ($canMatchByXmlId) {
                        $existingId = (int) $rowById['id'];
                        $matchedByXmlId++;
                    } else {
                        $xmlIdCodeMismatchCount++;
                        $xmlIdCodeMismatchDetails[] = [
                            'xml_id' => $xmlIdAttr,
                            'xml_employee_code' => $matchCode,
                            'db_employee_code' => $dbCode,
                            'name' => employeeDisplayNameFromXml($empNode),
                        ];
                    }
                }
            }
            if (!$existingId && $code !== '' && $code !== $matchCode) {
                $byInsertCode = findEmployeeIdByEmployeeCode($pdo, $code);
                if ($byInsertCode) {
                    $existingId = $byInsertCode;
                    $matchedByEmployeeCode++;
                }
            }
            if (!$existingId && $code !== '' && isset($seenEmployeeCodesInFile[$code])) {
                $existingId = (int) $seenEmployeeCodesInFile[$code];
            }
            if (!$existingId && !$isDuplicateFingerprintInFile && $hasAcNo && $acNo !== '') {
                $byAc = findEmployeeIdByFingerprint($pdo, $acNo, $empNode, $matchCode);
                if ($byAc) {
                    $existingId = $byAc;
                    $matchedByFingerprint++;
                }
            }
            if (!$existingId && $matchCode === '') {
                $nameEn = trim((string) ($empNode->NameEn ?? ''));
                if ($nameEn !== '') {
                    $stmt = $pdo->prepare('SELECT id FROM employees WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1');
                    $stmt->execute([$nameEn]);
                    $byName = $stmt->fetchColumn();
                    if ($byName) {
                        $existingId = (int) $byName;
                    }
                }
            }
            if (!$existingId && $matchCode === '') {
                $nameAr = trim((string) ($empNode->NameAr ?? ''));
                if ($nameAr !== '') {
                    $stmt = $pdo->prepare('SELECT id FROM employees WHERE TRIM(name_ar) = ? LIMIT 1');
                    $stmt->execute([$nameAr]);
                    $byNameAr = $stmt->fetchColumn();
                    if ($byNameAr) {
                        $existingId = (int) $byNameAr;
                    }
                }
            }
        } elseif ($code !== '' && isset($seenEmployeeCodesInFile[$code])) {
            // في الاستيراد النظيف: تكرار نفس كود الموظف داخل الملف
            $existingId = (int) $seenEmployeeCodesInFile[$code];
        }

        $empId = null;

        if ($existingId) {
            $updateFields = [];
            $values = [];
            foreach ($fields as $k => $v) {
                if ($v !== '') {
                    $updateFields[] = "$k = ?";
                    $values[] = $v;
                }
            }
            // الحالة تُحدَّث دائماً من XML (حتى inactive / terminated)
            $updateFields[] = 'status = ?';
            $values[] = $employeeStatus;
            if ($isInsured !== null) {
                $updateFields[] = "is_insured = ?";
                $values[] = $isInsured;
            }
            if ($updateFields) {
                $values[] = $existingId;
                $sql = "UPDATE employees SET " . implode(', ', $updateFields) . " WHERE id = ?";
                $upd = $pdo->prepare($sql);
                $upd->execute($values);
            }
            $updated++;
            $empId = (int) $existingId;
        } else {
            $insertCode = $code;
            if ($insertCode !== '') {
                $codeOwnerId = findEmployeeIdByEmployeeCode($pdo, $insertCode);
                if ($codeOwnerId) {
                    $existingId = $codeOwnerId;
                    $duplicateEmployeeCodeResolved++;
                }
            }

            if ($existingId) {
                $updateFields = [];
                $values = [];
                foreach ($fields as $k => $v) {
                    if ($v !== '') {
                        $updateFields[] = "$k = ?";
                        $values[] = $v;
                    }
                }
                $updateFields[] = 'status = ?';
                $values[] = $employeeStatus;
                if ($isInsured !== null) {
                    $updateFields[] = 'is_insured = ?';
                    $values[] = $isInsured;
                }
                if ($updateFields) {
                    $values[] = $existingId;
                    $sql = 'UPDATE employees SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
                    $upd = $pdo->prepare($sql);
                    $upd->execute($values);
                }
                $updated++;
                $empId = (int) $existingId;
            } else {
                if ($insertCode === '') {
                    $insertCode = allocateNextEmployeeCodeForImport($pdo);
                }

                try {
                    $stmt = $pdo->prepare('
                        INSERT INTO employees (employee_code, name, name_ar, base_salary, salary_type, department, cost_center, location, position, hire_date, status, is_insured)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ');
                    $stmt->execute([
                        $insertCode,
                        $fields['name'],
                        $fields['name_ar'],
                        (float) $fields['base_salary'],
                        $fields['salary_type'] ?: 'Monthly',
                        $fields['department'] ?: null,
                        $fields['cost_center'] ?: null,
                        $fields['location'] ?: null,
                        $fields['position'] ?: null,
                        $fields['hire_date'] ?: null,
                        $employeeStatus,
                        $isInsured !== null ? $isInsured : 0,
                    ]);
                    $created++;
                    $empId = (int) $pdo->lastInsertId();
                    $code = $insertCode;
                } catch (PDOException $e) {
                    if ((int) $e->getCode() === 23000 && strpos($e->getMessage(), 'employee_code') !== false) {
                        $fallbackId = findEmployeeIdByEmployeeCode($pdo, $insertCode);
                        if ($fallbackId) {
                            $existingId = $fallbackId;
                            $duplicateEmployeeCodeResolved++;
                            $updateFields = [];
                            $values = [];
                            foreach ($fields as $k => $v) {
                                if ($v !== '') {
                                    $updateFields[] = "$k = ?";
                                    $values[] = $v;
                                }
                            }
                            $updateFields[] = 'status = ?';
                            $values[] = $employeeStatus;
                            if ($isInsured !== null) {
                                $updateFields[] = 'is_insured = ?';
                                $values[] = $isInsured;
                            }
                            if ($updateFields) {
                                $values[] = $existingId;
                                $sql = 'UPDATE employees SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
                                $upd = $pdo->prepare($sql);
                                $upd->execute($values);
                            }
                            $updated++;
                            $empId = (int) $existingId;
                        } else {
                            throw $e;
                        }
                    } else {
                        throw $e;
                    }
                }
            }
        }

        if ($empId && $code !== '') {
            $seenEmployeeCodesInFile[$code] = (int) $empId;
        }

        if (!$empId) {
            continue;
        }

        // تحديث كود البصمة والتمييز والحوافز بعد الإدراج/التحديث إن كانت الأعمدة متوفرة في الجدول
        $extraFields = [];
        $extraValues = [];

        if ($hasAcNo && $acNo !== '' && !$isDuplicateFingerprintInFile) {
            $canAssignFingerprint = true;

            if (isset($assignedFingerprintsInFile[$acNo]) && (int) $assignedFingerprintsInFile[$acNo]['employee_id'] !== (int) $empId) {
                $canAssignFingerprint = false;
                $duplicateFingerprintSkipped++;
                recordFingerprintSkip(
                    $duplicateFingerprintSkippedDetails,
                    $empNode,
                    $acNo,
                    'duplicate_assigned_in_file',
                    $assignedFingerprintsInFile[$acNo]['name']
                );
            }

            if ($canAssignFingerprint) {
                $conflict = findFingerprintCodeConflict($pdo, $acNo, (int) $empId);
                if ($conflict) {
                    $canAssignFingerprint = false;
                    $duplicateFingerprintSkipped++;
                    $ownerName = trim((string) ($conflict['name_ar'] ?? ''));
                    if ($ownerName === '') {
                        $ownerName = trim((string) ($conflict['name'] ?? ''));
                    }
                    recordFingerprintSkip(
                        $duplicateFingerprintSkippedDetails,
                        $empNode,
                        $acNo,
                        'duplicate_in_db',
                        $ownerName !== '' ? $ownerName : 'موظف آخر'
                    );
                }
            }

            if ($canAssignFingerprint) {
                $extraFields[] = "`AC-No.` = ?";
                $extraValues[] = $acNo;
                $assignedFingerprintsInFile[$acNo] = [
                    'employee_id' => (int) $empId,
                    'name' => employeeDisplayNameFromXml($empNode),
                ];
            }
        }

        if ($hasDiscrimination && $discrimination !== '') {
            $extraFields[] = "discrimination_incentive_allowance = ?";
            $extraValues[] = (float) $discrimination;
        }

        if ($extraFields) {
            $extraValues[] = $empId;
            $sqlExtra = "UPDATE employees SET " . implode(', ', $extraFields) . " WHERE id = ?";
            $updExtra = $pdo->prepare($sqlExtra);
            $updExtra->execute($extraValues);
        }

        // 2) استيراد سجلات الحضور (AttendanceLogs)
        if (isset($empNode->AttendanceLogs)) {
            $checkAtt = $pdo->prepare("SELECT id FROM attendance_logs WHERE employee_id = ? AND attendance_date = ? LIMIT 1");
            $insertAtt = $pdo->prepare("
                INSERT INTO attendance_logs (
                    employee_id, attendance_date, check_in, check_out, status,
                    work_hours, overtime_hours, late_minutes, early_leave_minutes,
                    is_holiday, is_excused, notes, transport_allowance,
                    late_hours_calculated, grace_period_late_hours_calculated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
            ");
            $updateAtt = $pdo->prepare("
                UPDATE attendance_logs
                SET check_in = ?, check_out = ?, status = ?, work_hours = ?, overtime_hours = ?,
                    late_minutes = ?, early_leave_minutes = ?, is_holiday = ?, is_excused = ?, notes = ?
                WHERE id = ?
            ");

            foreach ($empNode->AttendanceLogs->Attendance as $attNode) {
                $attDate = (string)($attNode->Date ?? '');
                if (!$attDate) {
                    continue;
                }
                $checkIn = (string)($attNode->CheckIn ?? '');
                $checkOut = (string)($attNode->CheckOut ?? '');
                $status = (string)($attNode->Status ?? 'present');
                $workHours = (float)($attNode->WorkHours ?? 0);
                $otHours = (float)($attNode->OvertimeHours ?? 0);
                $lateMinutes = (int)($attNode->LateMinutes ?? 0);
                $earlyLeave = (int)($attNode->EarlyLeaveMinutes ?? 0);
                $isHoliday = (int)($attNode->IsHoliday ?? 0);
                $isExcused = (int)($attNode->IsExcused ?? 0);
                $notes = (string)($attNode->Notes ?? '');

                $checkAtt->execute([$empId, $attDate]);
                $existingAttId = $checkAtt->fetchColumn();

                if ($existingAttId) {
                    $updateAtt->execute([
                        $checkIn ?: null,
                        $checkOut ?: null,
                        $status ?: 'present',
                        $workHours,
                        $otHours,
                        $lateMinutes,
                        $earlyLeave,
                        $isHoliday ? 1 : 0,
                        $isExcused ? 1 : 0,
                        $notes !== '' ? $notes : null,
                        $existingAttId,
                    ]);
                } else {
                    $insertAtt->execute([
                        $empId,
                        $attDate,
                        $checkIn ?: null,
                        $checkOut ?: null,
                        $status ?: 'present',
                        $workHours,
                        $otHours,
                        $lateMinutes,
                        $earlyLeave,
                        $isHoliday ? 1 : 0,
                        $isExcused ? 1 : 0,
                        $notes !== '' ? $notes : null,
                    ]);
                }
                $attendanceImported++;
            }
        }

        // 3) استيراد السلف (Advances) – إدراج فقط إن لم يوجد سجل مطابق تقريباً
        if (isset($empNode->Advances)) {
            $checkAdv = $pdo->prepare("
                SELECT id FROM employee_advances
                WHERE employee_id = ? AND salary_type = ? AND advance_amount = ? AND start_date <=> ?
                LIMIT 1
            ");
            $insertAdv = $pdo->prepare("
                INSERT INTO employee_advances (
                    employee_id, salary_type, advance_amount, installment_amount,
                    duration, duration_type, status, notes, created_at, start_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($empNode->Advances->Advance as $advNode) {
                $salaryType = (string)($advNode->SalaryType ?? 'Monthly');
                $amount = (float)($advNode->Amount ?? 0);
                if ($amount <= 0) continue;
                $installment = (float)($advNode->InstallmentAmount ?? $amount);
                $duration = (int)($advNode->Duration ?? 1);
                $durationType = (string)($advNode->DurationType ?? ($salaryType === 'Weekly' ? 'weekly' : 'monthly'));
                $statusAdv = (string)($advNode->Status ?? 'activated');
                $notesAdv = (string)($advNode->Notes ?? '');
                $createdAt = (string)($advNode->CreatedAt ?? date('Y-m-d H:i:s'));
                $startDate = (string)($advNode->StartDate ?? substr($createdAt, 0, 10));

                $checkAdv->execute([$empId, $salaryType, $amount, $startDate ?: null]);
                $existingAdvId = $checkAdv->fetchColumn();
                if ($existingAdvId) {
                    continue; // لا نكرر نفس السلفة
                }

                $insertAdv->execute([
                    $empId,
                    $salaryType,
                    $amount,
                    $installment,
                    $duration > 0 ? $duration : 1,
                    $durationType ?: ($salaryType === 'Weekly' ? 'weekly' : 'monthly'),
                    $statusAdv ?: 'activated',
                    $notesAdv !== '' ? $notesAdv : null,
                    $createdAt,
                    $startDate ?: null,
                ]);
                $advancesImported++;
            }
        }

        // 4) استيراد التعديلات (المكافآت / بدل المواصلات ... من manual_adjustments)
        if (isset($empNode->Adjustments)) {
            $checkAdj = $pdo->prepare("
                SELECT id FROM manual_adjustments
                WHERE employee_id = ? AND period_start = ? AND period_end = ? AND adj_key = ?
                LIMIT 1
            ");
            $insertAdj = $pdo->prepare("
                INSERT INTO manual_adjustments (employee_id, period_start, period_end, adj_key, amount)
                VALUES (?, ?, ?, ?, ?)
            ");
            $updateAdj = $pdo->prepare("
                UPDATE manual_adjustments SET amount = ?
                WHERE id = ?
            ");

            foreach ($empNode->Adjustments->Adjustment as $adjNode) {
                $adjKey = (string)($adjNode['key'] ?? '');
                $pStart = (string)($adjNode->PeriodStart ?? '');
                $pEnd = (string)($adjNode->PeriodEnd ?? '');
                $amountAdj = (float)($adjNode->Amount ?? 0);
                if ($adjKey === '' || !$pStart || !$pEnd) {
                    continue;
                }

                $checkAdj->execute([$empId, $pStart, $pEnd, $adjKey]);
                $existingAdjId = $checkAdj->fetchColumn();

                if ($existingAdjId) {
                    $updateAdj->execute([$amountAdj, $existingAdjId]);
                } else {
                    $insertAdj->execute([$empId, $pStart, $pEnd, $adjKey, $amountAdj]);
                }
                $adjustmentsImported++;
            }
        }
    }

    $totalEmployeesInDb = (int) $pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => "تم استيراد الموظفين والبيانات المرتبطة بنجاح (صفوف في الملف: {$fileEmployeeCount}، موظفون جدد: {$created}، محدّثون: {$updated}، إجمالي الموظفين في النظام: {$totalEmployeesInDb}، مطابقون بكود الموظف: {$matchedByEmployeeCode}، مطابقون بـ id من XML: {$matchedByXmlId}، دُمج خاطئ بـ id تم تجنّبه: {$xmlIdCodeMismatchCount}، مطابقون بكود البصمة AC-No.: {$matchedByFingerprint}، غير نشط من الملف: {$inactiveImported}، تخطّي كود بصمة مكرر: {$duplicateFingerprintSkipped}، مؤمن عليهم (من الملف): {$insuredImported}، متخطّون بدون كود: {$skippedNoCode}، سجلات حضور: {$attendanceImported}، سلف: {$advancesImported}، تعديلات: {$adjustmentsImported})",
        'file_employee_count' => $fileEmployeeCount,
        'total_employees_in_db' => $totalEmployeesInDb,
        'created' => $created,
        'updated' => $updated,
        'matched_by_employee_code' => $matchedByEmployeeCode,
        'matched_by_xml_id' => $matchedByXmlId,
        'matched_by_fingerprint' => $matchedByFingerprint,
        'inactive_imported' => $inactiveImported,
        'duplicate_fingerprint_skipped' => $duplicateFingerprintSkipped,
        'duplicate_fingerprint_skipped_details' => $duplicateFingerprintSkippedDetails,
        'duplicate_employee_code_resolved' => $duplicateEmployeeCodeResolved,
        'xml_id_code_mismatch_count' => $xmlIdCodeMismatchCount,
        'xml_id_code_mismatch_details' => $xmlIdCodeMismatchDetails,
        'insured_imported' => $insuredImported,
        'skipped_no_code' => $skippedNoCode,
        'attendance_imported' => $attendanceImported,
        'advances_imported' => $advancesImported,
        'adjustments_imported' => $adjustmentsImported,
        'clean_import' => $cleanImport,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

