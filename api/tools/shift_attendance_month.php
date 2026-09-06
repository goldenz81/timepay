<?php
// Usage (dry-run):  php api/tools/shift_attendance_month.php 2025-08 --dry
// Usage (execute):  php api/tools/shift_attendance_month.php 2025-08

declare(strict_types=1);

// Load DB config
$config = require __DIR__ . '/../../config/database_config.php';

function getPdo(array $config): PDO {
	$dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $config['host'], $config['dbname'], $config['charset']);
	return new PDO($dsn, $config['username'], $config['password'], $config['options']);
}

function println(string $msg): void { echo $msg . PHP_EOL; }

[$script, $sourcePeriod] = $argv + [null, null];
$isDry = in_array('--dry', $argv, true) || in_array('--dry-run', $argv, true);

if (!$sourcePeriod || !preg_match('/^\d{4}-\d{2}$/', $sourcePeriod)) {
	println('ERROR: Provide period as YYYY-MM, e.g. 2025-08');
	exit(1);
}

$pdo = getPdo($config);
$pdo->exec("SET time_zone = '+00:00'");

// Compute target period by adding one month
$dt = DateTime::createFromFormat('Y-m', $sourcePeriod)->setTime(0, 0, 0);
$targetDt = (clone $dt)->modify('+1 month');
$targetPeriod = $targetDt->format('Y-m');

println("Source period: $sourcePeriod → Target period: $targetPeriod");

// Count source rows
$stmt = $pdo->prepare("SELECT COUNT(*) cnt FROM attendance_logs WHERE DATE_FORMAT(attendance_date, '%Y-%m') = ?");
$stmt->execute([$sourcePeriod]);
$cntSource = (int)$stmt->fetchColumn();
println("Source rows in $sourcePeriod: $cntSource");

if ($cntSource === 0) {
	println('No rows to update. Exiting.');
	exit(0);
}

// Check collisions
$sqlCollision = <<<SQL
SELECT COUNT(*) AS collisions
FROM attendance_logs a
JOIN attendance_logs b
  ON b.employee_id = a.employee_id
 AND b.attendance_date = DATE_ADD(a.attendance_date, INTERVAL 1 MONTH)
WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
SQL;
$stmt = $pdo->prepare($sqlCollision);
$stmt->execute([$sourcePeriod]);
$collisions = (int)$stmt->fetchColumn();
println("Potential collisions after shift: $collisions");

if ($isDry) {
	println('[DRY-RUN] Skipping any data changes.');
	exit(0);
}

// Backup
$backupTable = 'attendance_logs_backup_' . str_replace('-', '_', $sourcePeriod);
try {
	// Backup outside of transaction (DDL causes implicit commit in MySQL)
	$pdo->exec("CREATE TABLE IF NOT EXISTS `$backupTable` AS SELECT * FROM attendance_logs WHERE DATE_FORMAT(attendance_date, '%Y-%m') = " . $pdo->quote($sourcePeriod));
	println("Backup table ensured: $backupTable");

	// Begin transaction for DELETE/UPDATE only
	$pdo->beginTransaction();

	if ($collisions > 0) {
		// Remove conflicting target-day rows
		$deleteSql = <<<SQL
DELETE b
FROM attendance_logs a
JOIN attendance_logs b
  ON b.employee_id = a.employee_id
 AND b.attendance_date = DATE_ADD(a.attendance_date, INTERVAL 1 MONTH)
WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
SQL;
		$stmt = $pdo->prepare($deleteSql);
		$stmt->execute([$sourcePeriod]);
		println("Deleted conflicting target rows: " . $stmt->rowCount());
	}

	// Shift dates
	$updateSql = "UPDATE attendance_logs SET attendance_date = DATE_ADD(attendance_date, INTERVAL 1 MONTH), updated_at = NOW() WHERE DATE_FORMAT(attendance_date, '%Y-%m') = ?";
	$stmt = $pdo->prepare($updateSql);
	$stmt->execute([$sourcePeriod]);
	println("Updated rows: " . $stmt->rowCount());

	$pdo->commit();
	println('Done.');
} catch (Throwable $e) {
	if ($pdo->inTransaction()) {
		$pdo->rollBack();
	}
	println('ERROR: ' . $e->getMessage());
	exit(1);
}


