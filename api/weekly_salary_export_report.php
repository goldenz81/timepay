<?php
/**
 * تصدير تقرير الأجر الأسبوعي إلى Excel .xlsx — نفس أعمدة "عرض تفاصيل الأجر" (A4 Landscape)
 * الاستخدام: GET api/weekly_salary_export_report.php?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
require_once __DIR__ . '/config.php';

$startDate = isset($_GET['start_date']) ? trim($_GET['start_date']) : '';
$endDate   = isset($_GET['end_date'])   ? trim($_GET['end_date'])   : '';

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'يجب تحديد start_date و end_date بصيغة YYYY-MM-DD']);
    exit;
}

// منع التصدير إن وُجدت سجلات حضور/انصراف ناقصة لموظفي الأجر الأسبوعي في نفس الفترة
$incSql = "
    SELECT COUNT(*) AS cnt
    FROM attendance_logs al
    INNER JOIN employees e ON e.id = al.employee_id AND e.salary_type = 'Weekly'
    WHERE al.attendance_date BETWEEN ? AND ?
    AND (
        (
            al.check_in IS NOT NULL AND TRIM(al.check_in) <> ''
            AND al.check_in NOT IN ('00:00', '00:00:00')
            AND (
                al.check_out IS NULL OR TRIM(COALESCE(al.check_out, '')) = ''
                OR al.check_out IN ('00:00', '00:00:00')
            )
        )
        OR (
            al.check_out IS NOT NULL AND TRIM(al.check_out) <> ''
            AND al.check_out NOT IN ('00:00', '00:00:00')
            AND (
                al.check_in IS NULL OR TRIM(COALESCE(al.check_in, '')) = ''
                OR al.check_in IN ('00:00', '00:00:00')
            )
        )
    )
";
$incStmt = $pdo->prepare($incSql);
$incStmt->execute([$startDate, $endDate]);
$incompleteCnt = (int)($incStmt->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
if ($incompleteCnt > 0) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'لا يمكن تصدير التقرير: يوجد سجلات حضور أو انصراف ناقصة في الفترة. يرجى إصلاحها من إدارة الحضور.',
        'incomplete_count' => $incompleteCnt,
    ]);
    exit;
}

// استدعاء نفس API الراتب الأسبوعي لجلب البيانات
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$path = dirname($_SERVER['SCRIPT_NAME'] ?? '/api');
$apiUrl = rtrim($baseUrl, '/') . $path . '/unified_salary_api_v2.php';

$ctx = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/json',
        'content' => json_encode([
            'action'     => 'get_weekly_salary_data',
            'start_date' => $startDate,
            'end_date'   => $endDate,
        ]),
        'timeout' => 60,
    ],
]);
$json = @file_get_contents($apiUrl, false, $ctx);
if ($json === false) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'فشل جلب بيانات الراتب من الخادم']);
    exit;
}

$decoded = json_decode($json, true);
$rows = isset($decoded['data']) && is_array($decoded['data']) ? $decoded['data'] : [];
if (empty($rows)) {
    $rows = [];
}

$reportDate = date('Y-m-d H:i');
$fileBase = 'تقرير_الأجر_الأسبوعي_' . $startDate . '_' . date('His');

// أعمدة التقرير (بدون أيام الغياب وساعات التأخير)
$colTitles = [
    'الاسم', 'الكود', 'الأساسي', 'التمييز', 'أيام الانتظام', 'أجر الانتظام', 'الإضافي', 'بدل المواصلات', 'مكافأة خاصة',
    'خصم الغياب', 'خصم التأخير', 'قيمة التأمين', 'خصم السلفة', 'خصم الانصراف المبكر',
    'إجمالي المستحقات', 'إجمالي المستقطعات', 'فروقات تقريب', 'صافي المرتب',
];

$subtitleWithPeriod = 'عرض تفاصيل الأجر الفترة: ' . $startDate . ' - ' . $endDate;
$allStrings = ['تقرير الأجر الأسبوعي', $subtitleWithPeriod, $reportDate];
foreach ($colTitles as $t) {
    $allStrings[] = $t;
}
$allStrings[] = 'الإجمالي';
foreach ($rows as $row) {
    $allStrings[] = (string)($row['name'] ?? '');
    $allStrings[] = (string)($row['employee_code'] ?? '');
}
$uniqueStrings = array_values(array_unique($allStrings));
$stringToIdx = array_flip($uniqueStrings);

$colLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R'];
$sheetRows = [];
$r = 1;
$sheetRows[] = '<row r="' . $r . '" ht="28" customHeight="1"><c r="A' . $r . '" t="s" s="4"><v>' . ($stringToIdx['تقرير الأجر الأسبوعي'] ?? 0) . '</v></c></row>';
$r++;
$sheetRows[] = '<row r="' . $r . '" ht="24" customHeight="1"><c r="A' . $r . '" t="s" s="5"><v>' . ($stringToIdx[$subtitleWithPeriod] ?? 0) . '</v></c></row>';
$r++;
$headerRow = '<row r="' . $r . '" ht="36" customHeight="1">';
foreach ($colTitles as $ci => $t) {
    $headerRow .= '<c r="' . $colLetters[$ci] . $r . '" t="s" s="2"><v>' . ($stringToIdx[$t] ?? 0) . '</v></c>';
}
$headerRow .= '</row>';
$sheetRows[] = $headerRow;
$r++;

// مجاميع الأعمدة الرقمية
$sumC = 0.0;  // الأساسي
$sumD = 0.0;  // التمييز
$sumE = 0.0;  // أيام الانتظام
$sumF = 0.0;  // أجر الانتظام
$sumG = 0.0;  // الإضافي
$sumH = 0.0;  // بدل المواصلات
$sumI = 0.0;  // مكافأة خاصة
$sumJ = 0.0;  // خصم الغياب
$sumK = 0.0;  // خصم التأخير
$sumL = 0.0;  // قيمة التأمين
$sumM = 0.0;  // خصم السلفة
$sumN = 0.0;  // خصم الانصراف المبكر
$sumO = 0.0;  // إجمالي المستحقات
$sumP = 0.0;  // إجمالي المستقطعات
$sumQ = 0.0;  // فروقات تقريب
$sumR = 0.0;  // صافي المرتب

foreach ($rows as $row) {
    $netRaw = (float)($row['net_salary'] ?? 0);
    $roundedNet = round($netRaw / 5) * 5;
    $roundingDiff = $roundedNet - $netRaw;

    $name = (string)($row['name'] ?? '');
    $code = (string)($row['employee_code'] ?? '');
    if (!isset($stringToIdx[$name])) { $stringToIdx[$name] = count($uniqueStrings); $uniqueStrings[] = $name; }
    $codeIsNumeric = is_numeric($code);
    if (!$codeIsNumeric && !isset($stringToIdx[$code])) { $stringToIdx[$code] = count($uniqueStrings); $uniqueStrings[] = $code; }

    $rowXml = '<row r="' . $r . '" ht="22" customHeight="1">';
    $rowXml .= '<c r="A' . $r . '" t="s" s="3"><v>' . $stringToIdx[$name] . '</v></c>';
    if ($codeIsNumeric) {
        $rowXml .= '<c r="B' . $r . '" s="3"><v>' . (strpos($code, '.') !== false ? (float)$code : (int)$code) . '</v></c>';
    } else {
        $rowXml .= '<c r="B' . $r . '" t="s" s="3"><v>' . $stringToIdx[$code] . '</v></c>';
    }
    $rowXml .= '<c r="C' . $r . '" s="3"><v>' . round((float)($row['base_salary'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="D' . $r . '" s="3"><v>' . round((float)($row['discrimination_incentive_allowance'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="E' . $r . '" s="3"><v>' . (float)($row['regularity_days'] ?? 0) . '</v></c>';
    $rowXml .= '<c r="F' . $r . '" s="3"><v>' . round((float)($row['regularity_pay'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="G' . $r . '" s="3"><v>' . round((float)($row['overtime_pay'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="H' . $r . '" s="3"><v>' . round((float)($row['transport_allowance'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="I' . $r . '" s="3"><v>' . round((float)($row['special_bonus_weekly'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="J' . $r . '" s="3"><v>' . round((float)($row['absence_deduction'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="K' . $r . '" s="3"><v>' . round((float)($row['late_deduction'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="L' . $r . '" s="3"><v>' . round((float)($row['insurance_deduction'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="M' . $r . '" s="3"><v>' . round((float)($row['advance_installment'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="N' . $r . '" s="3"><v>' . round((float)($row['early_leave_deduction'] ?? $row['early_leave_penalty'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="O' . $r . '" s="3"><f>C' . $r . '+D' . $r . '+F' . $r . '+G' . $r . '+H' . $r . '+I' . $r . '</f><v>' . round((float)($row['total_entitlements'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="P' . $r . '" s="3"><f>J' . $r . '+K' . $r . '+L' . $r . '+M' . $r . '+N' . $r . '</f><v>' . round((float)($row['total_deductions'] ?? 0), 2) . '</v></c>';
    $rowXml .= '<c r="Q' . $r . '" s="3"><v>' . round($roundingDiff, 2) . '</v></c>';
    $rowXml .= '<c r="R' . $r . '" s="3"><f>ROUND((O' . $r . '-P' . $r . ')/5,0)*5</f><v>' . round($roundedNet, 2) . '</v></c>';
    $rowXml .= '</row>';
    $sheetRows[] = $rowXml;

    // تجميع القيم
    $cVal = (float)($row['base_salary'] ?? 0);
    $dVal = (float)($row['discrimination_incentive_allowance'] ?? 0);
    $eVal = (float)($row['regularity_days'] ?? 0);
    $fVal = (float)($row['regularity_pay'] ?? 0);
    $gVal = (float)($row['overtime_pay'] ?? 0);
    $hVal = (float)($row['transport_allowance'] ?? 0);
    $iVal = (float)($row['special_bonus_weekly'] ?? 0);
    $jVal = (float)($row['absence_deduction'] ?? 0);
    $kVal = (float)($row['late_deduction'] ?? 0);
    $lVal = (float)($row['insurance_deduction'] ?? 0);
    $mVal = (float)($row['advance_installment'] ?? 0);
    $nVal = (float)($row['early_leave_deduction'] ?? $row['early_leave_penalty'] ?? 0);
    $oVal = (float)($row['total_entitlements'] ?? ($cVal + $dVal + $fVal + $gVal + $hVal + $iVal));
    $pVal = (float)($row['total_deductions'] ?? ($jVal + $kVal + $lVal + $mVal + $nVal));
    $qVal = (float)round($roundingDiff, 2);
    $rVal = (float)round($roundedNet, 2);

    $sumC += $cVal; $sumD += $dVal; $sumE += $eVal; $sumF += $fVal; $sumG += $gVal;
    $sumH += $hVal; $sumI += $iVal; $sumJ += $jVal; $sumK += $kVal; $sumL += $lVal;
    $sumM += $mVal; $sumN += $nVal; $sumO += $oVal; $sumP += $pVal; $sumQ += $qVal; $sumR += $rVal;
    $r++;
}

// صف الإجمالي
$totalLabelIdx = $stringToIdx['الإجمالي'] ?? 0;
$totalRow = '<row r="' . $r . '" ht="26" customHeight="1">';
$totalRow .= '<c r="A' . $r . '" t="s" s="2"><v>' . $totalLabelIdx . '</v></c>';
$totalRow .= '<c r="B' . $r . '" s="2"/>';
$totalRow .= '<c r="C' . $r . '" s="2"><v>' . round($sumC, 2) . '</v></c>';
$totalRow .= '<c r="D' . $r . '" s="2"><v>' . round($sumD, 2) . '</v></c>';
$totalRow .= '<c r="E' . $r . '" s="2"><v>' . round($sumE, 2) . '</v></c>';
$totalRow .= '<c r="F' . $r . '" s="2"><v>' . round($sumF, 2) . '</v></c>';
$totalRow .= '<c r="G' . $r . '" s="2"><v>' . round($sumG, 2) . '</v></c>';
$totalRow .= '<c r="H' . $r . '" s="2"><v>' . round($sumH, 2) . '</v></c>';
$totalRow .= '<c r="I' . $r . '" s="2"><v>' . round($sumI, 2) . '</v></c>';
$totalRow .= '<c r="J' . $r . '" s="2"><v>' . round($sumJ, 2) . '</v></c>';
$totalRow .= '<c r="K' . $r . '" s="2"><v>' . round($sumK, 2) . '</v></c>';
$totalRow .= '<c r="L' . $r . '" s="2"><v>' . round($sumL, 2) . '</v></c>';
$totalRow .= '<c r="M' . $r . '" s="2"><v>' . round($sumM, 2) . '</v></c>';
$totalRow .= '<c r="N' . $r . '" s="2"><v>' . round($sumN, 2) . '</v></c>';
$totalRow .= '<c r="O' . $r . '" s="2"><v>' . round($sumO, 2) . '</v></c>';
$totalRow .= '<c r="P' . $r . '" s="2"><v>' . round($sumP, 2) . '</v></c>';
$totalRow .= '<c r="Q' . $r . '" s="2"><v>' . round($sumQ, 2) . '</v></c>';
$totalRow .= '<c r="R' . $r . '" s="2"><v>' . round($sumR, 2) . '</v></c>';
$totalRow .= '</row>';
$sheetRows[] = $totalRow;

$sheetData = implode('', $sheetRows);
$lastCol = $colLetters[count($colTitles) - 1];
$sheetViewXml = '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>';
$mergeCellsXml = '<mergeCells><mergeCell ref="A1:' . $lastCol . '1"/><mergeCell ref="A2:' . $lastCol . '2"/></mergeCells>';
$colsXml = '<cols>';
$colWidths = [20, 11, 11, 11, 10, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 11, 12];
for ($i = 0; $i < count($colTitles); $i++) {
    $width = isset($colWidths[$i]) ? $colWidths[$i] : 11;
    $colsXml .= '<col min="' . ($i + 1) . '" max="' . ($i + 1) . '" width="' . $width . '" customWidth="1"/>';
}
$colsXml .= '</cols>';

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

$stylesXml = '<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
    <font><sz val="10"/><name val="Calibri"/><color rgb="FFE2E8E8"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F212E"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2F4553"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFC000"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyBorder="1"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
</styleSheet>';

$pageSetup = '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>';
$footerEsc = htmlspecialchars($reportDate, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$headerFooter = '<headerFooter><oddHeader>&amp;C&amp;14 تقرير الأجر الأسبوعي</oddHeader><oddFooter>&amp;C&amp;10 تم الإنشاء في ' . $footerEsc . '</oddFooter></headerFooter>';
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
  <sheets><sheet name="الأجر الأسبوعي" sheetId="1" r:id="rId1"/></sheets>
</workbook>';

$relsRels = '<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>';

$docPropsCore = '<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>TimePay</dc:creator><cp:lastModifiedBy>TimePay</cp:lastModifiedBy><cp:revision>1</cp:revision></cp:coreProperties>';
$docPropsApp = '<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>TimePay</Application></Properties>';

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $fileBase . '.xlsx"');
header('Cache-Control: max-age=0');

$zip = new ZipArchive();
$tmp = tempnam(sys_get_temp_dir(), 'weekly');
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
@unlink($tmp);
