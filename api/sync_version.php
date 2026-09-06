<?php
/**
 * سكريبت لمزامنة الإصدار من package.json إلى changelog.json
 * يمكن تشغيله يدوياً أو من خلال API
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$rootDir = dirname(dirname(__FILE__));
$packageFile = $rootDir . '/package.json';
$changelogFile = $rootDir . '/updates/changelog.json';

try {
    // قراءة package.json
    if (!file_exists($packageFile)) {
        throw new Exception('ملف package.json غير موجود');
    }
    
    $packageContent = file_get_contents($packageFile);
    $packageContent = preg_replace('/^\xEF\xBB\xBF/', '', $packageContent);
    $packageContent = trim($packageContent);
    
    $packageData = json_decode($packageContent, true);
    if (!$packageData || json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('خطأ في قراءة package.json: ' . json_last_error_msg());
    }
    
    if (!isset($packageData['version'])) {
        throw new Exception('package.json لا يحتوي على حقل version');
    }
    
    $newVersion = $packageData['version'];
    
    // قراءة changelog.json
    $changelog = ['version' => '1.0.0', 'updates' => []];
    if (file_exists($changelogFile)) {
        $changelogContent = file_get_contents($changelogFile);
        $changelogContent = preg_replace('/^\xEF\xBB\xBF/', '', $changelogContent);
        $changelog = json_decode($changelogContent, true) ?? $changelog;
    }
    
    $oldVersion = $changelog['version'];
    
    // تحديث الإصدار
    $changelog['version'] = $newVersion;
    
    // إضافة سجل جديد إذا كان الإصدار مختلف
    if ($oldVersion !== $newVersion) {
        array_unshift($changelog['updates'], [
            'date' => date('Y-m-d H:i:s'),
            'filesUpdated' => 0,
            'summary' => 'مزامنة الإصدار من package.json',
            'version' => $newVersion
        ]);
        
        // الاحتفاظ بآخر 50 تحديث
        $changelog['updates'] = array_slice($changelog['updates'], 0, 50);
    }
    
    // حفظ changelog.json
    if (file_put_contents($changelogFile, json_encode($changelog, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) {
        throw new Exception('فشل في حفظ changelog.json');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'تم مزامنة الإصدار بنجاح',
        'oldVersion' => $oldVersion,
        'newVersion' => $newVersion
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

