<?php
// تصدير الموظفين (وملفات مرتبطة اختيارياً) إلى XML
require_once 'cors_headers.php';
require_once 'config.php';

try {
    $includeRelated = isset($_GET['include_related']) && $_GET['include_related'] === '1';

    // تصدير جميع الموظفين (النشط + غير النشط)
    $stmt = $pdo->query("SELECT * FROM employees ORDER BY id");
    $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $doc = new DOMDocument('1.0', 'UTF-8');
    $doc->formatOutput = true;

    $root = $doc->createElement('EmployeesExport');
    $root->setAttribute('exported_at', date('c'));
    $root->setAttribute('include_related', $includeRelated ? '1' : '0');
    $doc->appendChild($root);

    foreach ($employees as $emp) {
      $empNode = $doc->createElement('Employee');
      $empNode->setAttribute('id', (string) $emp['id']);
      $empNode->setAttribute('employee_code', (string) ($emp['employee_code'] ?? ''));

      $fields = [
          'AC-No.' => 'FingerprintCode',
          'employee_code' => 'EmployeeCode',
          'name' => 'NameEn',
          'name_ar' => 'NameAr',
          'is_insured' => 'IsInsured',
          'base_salary' => 'BaseSalary',
          'salary_type' => 'SalaryType',
          'department' => 'Department',
          'cost_center' => 'CostCenter',
          'location' => 'Location',
          'position' => 'Position',
          'hire_date' => 'HireDate',
          'discrimination_incentive_allowance' => 'DiscriminationIncentiveAllowance',
      ];

      foreach ($fields as $dbKey => $xmlKey) {
          if (array_key_exists($dbKey, $emp) && $emp[$dbKey] !== null && $emp[$dbKey] !== '') {
              $child = $doc->createElement($xmlKey);
              $child->appendChild($doc->createTextNode((string) $emp[$dbKey]));
              $empNode->appendChild($child);
          }
      }

      // الحالة تُصدَّر دائماً (active / inactive / terminated)
      $statusChild = $doc->createElement('Status');
      $statusChild->appendChild($doc->createTextNode((string) ($emp['status'] ?? 'active')));
      $empNode->appendChild($statusChild);

      if ($includeRelated) {
          $empId = (int) $emp['id'];

          // attendance_logs
          $attNode = $doc->createElement('AttendanceLogs');
          $stmtAtt = $pdo->prepare("
              SELECT attendance_date, check_in, check_out, status, work_hours, overtime_hours,
                     late_minutes, early_leave_minutes, is_holiday, is_excused, notes
              FROM attendance_logs
              WHERE employee_id = ?
              ORDER BY attendance_date
          ");
          $stmtAtt->execute([$empId]);
          foreach ($stmtAtt->fetchAll(PDO::FETCH_ASSOC) as $row) {
              $a = $doc->createElement('Attendance');
              $map = [
                  'attendance_date' => 'Date',
                  'check_in' => 'CheckIn',
                  'check_out' => 'CheckOut',
                  'status' => 'Status',
                  'work_hours' => 'WorkHours',
                  'overtime_hours' => 'OvertimeHours',
                  'late_minutes' => 'LateMinutes',
                  'early_leave_minutes' => 'EarlyLeaveMinutes',
                  'is_holiday' => 'IsHoliday',
                  'is_excused' => 'IsExcused',
                  'notes' => 'Notes',
              ];
              foreach ($map as $k => $xmlK) {
                  if (isset($row[$k]) && $row[$k] !== null && $row[$k] !== '') {
                      $c = $doc->createElement($xmlK);
                      $c->appendChild($doc->createTextNode((string) $row[$k]));
                      $a->appendChild($c);
                  }
              }
              $attNode->appendChild($a);
          }
          $empNode->appendChild($attNode);

          // employee_advances
          $advNode = $doc->createElement('Advances');
          $stmtAdv = $pdo->prepare("
              SELECT id, salary_type, advance_amount, installment_amount, duration, duration_type,
                     status, notes, created_at, start_date
              FROM employee_advances
              WHERE employee_id = ?
              ORDER BY created_at
          ");
          $stmtAdv->execute([$empId]);
          foreach ($stmtAdv->fetchAll(PDO::FETCH_ASSOC) as $row) {
              $adv = $doc->createElement('Advance');
              $map = [
                  'id' => 'Id',
                  'salary_type' => 'SalaryType',
                  'advance_amount' => 'Amount',
                  'installment_amount' => 'InstallmentAmount',
                  'duration' => 'Duration',
                  'duration_type' => 'DurationType',
                  'status' => 'Status',
                  'notes' => 'Notes',
                  'created_at' => 'CreatedAt',
                  'start_date' => 'StartDate',
              ];
              foreach ($map as $k => $xmlK) {
                  if (isset($row[$k]) && $row[$k] !== null && $row[$k] !== '') {
                      $c = $doc->createElement($xmlK);
                      $c->appendChild($doc->createTextNode((string) $row[$k]));
                      $adv->appendChild($c);
                  }
              }
              $advNode->appendChild($adv);
          }
          $empNode->appendChild($advNode);

          // manual_adjustments (مكافآت / بدل مواصلات / خصومات يدوية)
          $adjNode = $doc->createElement('Adjustments');
          $stmtAdj = $pdo->prepare("
              SELECT period_start, period_end, adj_key, amount, created_at
              FROM manual_adjustments
              WHERE employee_id = ?
              ORDER BY created_at
          ");
          $stmtAdj->execute([$empId]);
          foreach ($stmtAdj->fetchAll(PDO::FETCH_ASSOC) as $row) {
              $adj = $doc->createElement('Adjustment');
              $adj->setAttribute('key', (string) $row['adj_key']);
              $map = [
                  'period_start' => 'PeriodStart',
                  'period_end' => 'PeriodEnd',
                  'amount' => 'Amount',
                  'created_at' => 'CreatedAt',
              ];
              foreach ($map as $k => $xmlK) {
                  if (isset($row[$k]) && $row[$k] !== null && $row[$k] !== '') {
                      $c = $doc->createElement($xmlK);
                      $c->appendChild($doc->createTextNode((string) $row[$k]));
                      $adj->appendChild($c);
                  }
              }
              $adjNode->appendChild($adj);
          }
          $empNode->appendChild($adjNode);
      }

      $root->appendChild($empNode);
    }

    header('Content-Type: application/xml; charset=utf-8');
    header('Content-Disposition: attachment; filename="employees_export_' . date('Ymd_His') . '.xml"');
    echo $doc->saveXML();
} catch (Throwable $e) {
    http_response_code(500);
    echo "Error: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
}

