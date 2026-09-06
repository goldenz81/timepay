<?php
/**
 * نظام تحديث التطبيق
 * يقوم بفك ضغط deploy.zip وتحديث الملفات المعدلة فقط
 */

// معالجة الأخطاء
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// زيادة الحدود
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 300);
set_time_limit(300);

// معالج الأخطاء المخصص
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// معالج الاستثناءات
set_exception_handler(function($e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'خطأ في السيرفر: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// مسارات المجلدات
$rootDir = dirname(__DIR__);
$updatesDir = $rootDir . '/updates';
$deployZip = $updatesDir . '/deploy.zip';
$changelogFile = $updatesDir . '/changelog.json';
$tempDir = $updatesDir . '/temp_extract';

// الحصول على الإجراء المطلوب
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'check':
        checkForUpdates();
        break;
    case 'start':
        startUpdate();
        break;
    case 'progress':
        getProgress();
        break;
    case 'upload':
        uploadUpdate();
        break;
    case 'get_changelog':
        getChangelog();
        break;
    case 'save_changelog':
        saveChangelog();
        break;
    case 'sync_version':
        syncVersionFromFile();
        break;
    case 'delete_package':
        deletePendingPackage();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'إجراء غير صحيح'], JSON_UNESCAPED_UNICODE);
}

/**
 * التحقق من وجود تحديثات
 */
function checkForUpdates() {
    global $deployZip, $changelogFile, $rootDir;
    
    $zipExists = file_exists($deployZip);
    $changelog = [];
    $currentVersion = '1.0.0';
    $newVersion = null;
    $fileSizeFormatted = null;
    
    // محاولة قراءة الإصدار من package.json أولاً (الأكثر دقة)
    $packageFile = $rootDir . '/package.json';
    if (file_exists($packageFile)) {
        $packageContent = file_get_contents($packageFile);
        $packageData = json_decode($packageContent, true);
        if (isset($packageData['version'])) {
            $currentVersion = $packageData['version'];
        }
    }
    
    // قراءة changelog للحصول على سجل التحديثات
    if (file_exists($changelogFile)) {
        $changelogData = json_decode(file_get_contents($changelogFile), true);
        if (isset($changelogData['version'])) {
            $changelogVersion = $changelogData['version'];
            if (version_compare($currentVersion, $changelogVersion, '<=')) {
                $currentVersion = $changelogVersion;
            }
        }
        $changelog = $changelogData['updates'] ?? [];
    }
    
    // قراءة معلومات التحديث من الملف المضغوط إن وجد
    if ($zipExists) {
        $zip = new ZipArchive();
        if ($zip->open($deployZip) === TRUE) {
            $packageInfo = $zip->getFromName('package.json');
            if ($packageInfo) {
                $packageData = json_decode($packageInfo, true);
                if (isset($packageData['version'])) {
                    $newVersion = $packageData['version'];
                }
            }
            
            if (!$newVersion) {
                $versionInfo = $zip->getFromName('version.json');
                if ($versionInfo) {
                    $versionData = json_decode($versionInfo, true);
                    $newVersion = $versionData['version'] ?? null;
                    if (isset($versionData['changelog'])) {
                        $changelog = array_merge($versionData['changelog'], $changelog);
                    }
                }
            }
            $zip->close();
        }
        
        $fileSizeFormatted = formatBytes(filesize($deployZip));
    }
    
    $versionMeta = resolveUpdateVersionStatus($currentVersion, $newVersion, $zipExists);
    
    echo json_encode([
        'success' => true,
        'hasUpdate' => $versionMeta['hasUpdate'],
        'hasPendingPackage' => $zipExists,
        'updateStatus' => $versionMeta['updateStatus'],
        'statusMessage' => $versionMeta['statusMessage'],
        'currentVersion' => $currentVersion,
        'newVersion' => $newVersion,
        'fileSize' => $fileSizeFormatted,
        'changelog' => $changelog,
        'lastCheck' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * تحديد هل الحزمة تحديث فعلي أم نفس/أقدم من المثبت
 */
function resolveUpdateVersionStatus($currentVersion, $newVersion, $zipExists) {
    if (!$zipExists) {
        return [
            'hasUpdate' => false,
            'updateStatus' => 'no_package',
            'statusMessage' => 'لا توجد حزمة تحديث على الخادم.',
        ];
    }
    
    if (!$newVersion) {
        return [
            'hasUpdate' => true,
            'updateStatus' => 'unknown_version',
            'statusMessage' => 'يوجد ملف deploy.zip لكن لم يُعثر على رقم إصدار داخل الحزمة. راجع package.json داخل ZIP قبل التثبيت.',
        ];
    }
    
    $cmp = version_compare($newVersion, $currentVersion);
    
    if ($cmp > 0) {
        return [
            'hasUpdate' => true,
            'updateStatus' => 'update_available',
            'statusMessage' => "يتوفر إصدار أحدث: v{$newVersion} (المثبت حالياً: v{$currentVersion}).",
        ];
    }
    
    if ($cmp === 0) {
        return [
            'hasUpdate' => false,
            'updateStatus' => 'same_version',
            'statusMessage' => "ملف deploy.zip موجود لكنه بنفس الإصدار المثبت (v{$currentVersion}). لا حاجة للتثبيت — ارفع حزمة بإصدار أعلى أو احذف الملف من مجلد updates.",
        ];
    }
    
    return [
        'hasUpdate' => false,
        'updateStatus' => 'downgrade',
        'statusMessage' => "الحزمة المرفوعة أقدم من المثبت (الحزمة: v{$newVersion}، المثبت: v{$currentVersion}).",
    ];
}

/**
 * التحقق قبل بدء التثبيت
 */
function assertUpdateAllowed() {
    global $deployZip, $changelogFile, $rootDir;
    
    $packageFile = $rootDir . '/package.json';
    $currentVersion = '1.0.0';
    if (file_exists($packageFile)) {
        $packageData = json_decode(file_get_contents($packageFile), true);
        if (isset($packageData['version'])) {
            $currentVersion = $packageData['version'];
        }
    }
    if (file_exists($changelogFile)) {
        $changelogData = json_decode(file_get_contents($changelogFile), true);
        if (isset($changelogData['version']) && version_compare($currentVersion, $changelogData['version'], '<=')) {
            $currentVersion = $changelogData['version'];
        }
    }
    
    $newVersion = null;
    if (file_exists($deployZip)) {
        $zip = new ZipArchive();
        if ($zip->open($deployZip) === TRUE) {
            $packageInfo = $zip->getFromName('package.json');
            if ($packageInfo) {
                $packageData = json_decode($packageInfo, true);
                $newVersion = $packageData['version'] ?? null;
            }
            if (!$newVersion) {
                $versionInfo = $zip->getFromName('version.json');
                if ($versionInfo) {
                    $versionData = json_decode($versionInfo, true);
                    $newVersion = $versionData['version'] ?? null;
                }
            }
            $zip->close();
        }
    }
    
    $meta = resolveUpdateVersionStatus($currentVersion, $newVersion, file_exists($deployZip));
    if (!$meta['hasUpdate']) {
        throw new Exception($meta['statusMessage']);
    }
}

/**
 * حذف حزمة deploy.zip المعلّقة (نفس الإصدار أو غير قابلة للتثبيت)
 */
function deletePendingPackage() {
    global $deployZip, $updatesDir;
    
    if (!file_exists($deployZip)) {
        echo json_encode([
            'success' => true,
            'message' => 'لا يوجد ملف deploy.zip لحذفه.',
            'deleted' => false
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    if (!is_writable($deployZip) && !is_writable(dirname($deployZip))) {
        echo json_encode([
            'success' => false,
            'message' => 'لا توجد صلاحية لحذف الملف. تحقق من صلاحيات مجلد updates.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    if (!@unlink($deployZip)) {
        echo json_encode([
            'success' => false,
            'message' => 'تعذر حذف deploy.zip. حاول حذفه يدوياً من مجلد updates.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $progressFile = $updatesDir . '/progress.json';
    if (file_exists($progressFile)) {
        @unlink($progressFile);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'تم حذف deploy.zip بنجاح.',
        'deleted' => true
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * بدء عملية التحديث
 */
function startUpdate() {
    global $deployZip, $rootDir, $tempDir, $updatesDir;
    
    // التحقق من وجود ZipArchive
    if (!class_exists('ZipArchive')) {
        echo json_encode(['success' => false, 'message' => 'خطأ: ZipArchive غير مثبت على السيرفر'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // التأكد من وجود ملف التحديث
    if (!file_exists($deployZip)) {
        echo json_encode(['success' => false, 'message' => 'لا يوجد ملف تحديث في: ' . $deployZip], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    try {
        assertUpdateAllowed();
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // التحقق من صلاحيات الكتابة
    if (!is_writable($rootDir)) {
        echo json_encode(['success' => false, 'message' => 'لا توجد صلاحيات كتابة في: ' . $rootDir], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // إنشاء ملف للتقدم
    $progressFile = $updatesDir . '/progress.json';
    $progressData = json_encode([
        'status' => 'starting',
        'progress' => 0,
        'currentFile' => '',
        'totalFiles' => 0,
        'processedFiles' => 0,
        'updatedFiles' => [],
        'skippedFiles' => [],
        'errors' => []
    ], JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($progressFile, $progressData) === false) {
        echo json_encode(['success' => false, 'message' => 'فشل في إنشاء ملف التقدم'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    try {
        // فتح الملف المضغوط
        $zip = new ZipArchive();
        $zipResult = $zip->open($deployZip);
        if ($zipResult !== TRUE) {
            $zipErrors = [
                ZipArchive::ER_EXISTS => 'الملف موجود مسبقاً',
                ZipArchive::ER_INCONS => 'ملف zip غير متسق',
                ZipArchive::ER_INVAL => 'معامل غير صالح',
                ZipArchive::ER_MEMORY => 'خطأ في الذاكرة',
                ZipArchive::ER_NOENT => 'الملف غير موجود',
                ZipArchive::ER_NOZIP => 'ليس ملف zip',
                ZipArchive::ER_OPEN => 'فشل في فتح الملف',
                ZipArchive::ER_READ => 'خطأ في القراءة',
                ZipArchive::ER_SEEK => 'خطأ في البحث'
            ];
            $errorMsg = $zipErrors[$zipResult] ?? "خطأ غير معروف: $zipResult";
            throw new Exception('فشل في فتح ملف التحديث: ' . $errorMsg);
        }
        
        $totalFiles = $zip->numFiles;
        $processedFiles = 0;
        $updatedFiles = [];
        $skippedFiles = [];
        $errors = [];
        
        // تحديث التقدم
        updateProgress($progressFile, 'extracting', 5, '', $totalFiles, 0, [], [], []);
        
        // المجلدات المحمية التي لا يجب تحديثها
        $protectedPaths = [
            'updates/deploy.zip',
            'updates/progress.json',
            'config/database.php',
            'uploads/'
        ];
        
        // استخراج وتحديث الملفات
        for ($i = 0; $i < $totalFiles; $i++) {
            $filename = $zip->getNameIndex($i);
            
            // تحويل backslash إلى forward slash (مشكلة Windows)
            $filename = str_replace('\\', '/', $filename);
            
            // تخطي المجلدات
            if (substr($filename, -1) === '/') {
                continue;
            }
            
            // تخطي الملفات المحمية
            $isProtected = false;
            foreach ($protectedPaths as $protected) {
                if (strpos($filename, $protected) === 0) {
                    $isProtected = true;
                    $skippedFiles[] = $filename . ' (محمي)';
                    break;
                }
            }
            
            if ($isProtected) {
                $processedFiles++;
                continue;
            }
            
            // المسار الكامل للملف
            $targetPath = $rootDir . '/' . $filename;
            $targetDir = dirname($targetPath);
            
            // إنشاء المجلد إن لم يكن موجوداً
            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }
            
            // قراءة محتوى الملف الجديد
            $newContent = $zip->getFromIndex($i);
            
            // التحقق مما إذا كان الملف موجوداً ومختلفاً
            $shouldUpdate = true;
            if (file_exists($targetPath)) {
                $oldContent = file_get_contents($targetPath);
                if (md5($oldContent) === md5($newContent)) {
                    $shouldUpdate = false;
                    $skippedFiles[] = $filename . ' (بدون تغيير)';
                }
            }
            
            if ($shouldUpdate) {
                // حفظ الملف الجديد
                if (file_put_contents($targetPath, $newContent) !== false) {
                    $updatedFiles[] = $filename;
                } else {
                    $errors[] = 'فشل في تحديث: ' . $filename;
                }
            }
            
            $processedFiles++;
            $progress = round(($processedFiles / $totalFiles) * 90) + 5; // من 5% إلى 95%
            
            // تحديث التقدم كل 5 ملفات لتحسين الأداء
            if ($processedFiles % 5 === 0 || $processedFiles === $totalFiles) {
                updateProgress($progressFile, 'updating', $progress, $filename, $totalFiles, $processedFiles, $updatedFiles, $skippedFiles, $errors);
            }
        }
        
        $zip->close();
        
        // حذف ملف التحديث بعد الانتهاء
        unlink($deployZip);
        
        // تحديث ملف changelog تلقائياً بعد التحديث
        // ملاحظة: يجب أن يكون package.json موجوداً في deploy.zip ليتم قراءة الإصدار منه
        updateChangelog($updatedFiles);
        
        // الانتهاء
        updateProgress($progressFile, 'completed', 100, '', $totalFiles, $processedFiles, $updatedFiles, $skippedFiles, $errors);
        
        echo json_encode([
            'success' => true,
            'message' => 'تم التحديث بنجاح',
            'updatedFiles' => count($updatedFiles),
            'skippedFiles' => count($skippedFiles),
            'errors' => $errors
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        updateProgress($progressFile, 'error', 0, '', 0, 0, [], [], [$e->getMessage()]);
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * الحصول على تقدم التحديث
 */
function getProgress() {
    global $updatesDir;
    
    $progressFile = $updatesDir . '/progress.json';
    
    if (file_exists($progressFile)) {
        $progress = json_decode(file_get_contents($progressFile), true);
        echo json_encode(['success' => true, 'progress' => $progress], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => true, 'progress' => null], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * رفع ملف التحديث
 */
function uploadUpdate() {
    global $deployZip, $updatesDir;
    
    // التأكد من وجود مجلد التحديثات
    if (!is_dir($updatesDir)) {
        mkdir($updatesDir, 0755, true);
    }
    
    if (!isset($_FILES['updateFile'])) {
        echo json_encode(['success' => false, 'message' => 'لم يتم رفع أي ملف'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $file = $_FILES['updateFile'];
    
    // التحقق من نوع الملف
    $allowedTypes = ['application/zip', 'application/x-zip-compressed'];
    if (!in_array($file['type'], $allowedTypes) && pathinfo($file['name'], PATHINFO_EXTENSION) !== 'zip') {
        echo json_encode(['success' => false, 'message' => 'يجب أن يكون الملف بصيغة ZIP'], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // رفع الملف
    if (move_uploaded_file($file['tmp_name'], $deployZip)) {
        echo json_encode([
            'success' => true,
            'message' => 'تم رفع ملف التحديث بنجاح',
            'fileSize' => formatBytes(filesize($deployZip))
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'message' => 'فشل في رفع الملف'], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * الحصول على سجل التغييرات
 */
function getChangelog() {
    global $changelogFile;
    
    if (file_exists($changelogFile)) {
        $changelog = json_decode(file_get_contents($changelogFile), true);
        echo json_encode(['success' => true, 'changelog' => $changelog], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => true, 'changelog' => ['version' => '1.0.0', 'updates' => []]], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * حفظ سجل التغييرات
 */
function saveChangelog() {
    global $changelogFile;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $changelog = $input['changelog'] ?? null;
    
    if ($changelog) {
        file_put_contents($changelogFile, json_encode($changelog, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        echo json_encode(['success' => true, 'message' => 'تم حفظ سجل التغييرات'], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'message' => 'بيانات غير صحيحة'], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * مزامنة الإصدار من package.json إلى changelog.json
 */
function syncVersionFromFile() {
    global $changelogFile, $rootDir;
    
    $packageFile = $rootDir . '/package.json';
    
    // التحقق من وجود package.json
    if (!file_exists($packageFile)) {
        echo json_encode([
            'success' => false, 
            'message' => 'ملف package.json غير موجود في: ' . $packageFile
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // قراءة package.json
    $packageContent = file_get_contents($packageFile);
    
    // إزالة BOM إن وجد
    $packageContent = preg_replace('/^\xEF\xBB\xBF/', '', $packageContent);
    $packageContent = trim($packageContent);
    
    $packageData = json_decode($packageContent, true);
    $jsonError = json_last_error();
    
    if ($jsonError !== JSON_ERROR_NONE || !$packageData) {
        $errorMessages = [
            JSON_ERROR_DEPTH => 'تجاوز الحد الأقصى للعمق',
            JSON_ERROR_STATE_MISMATCH => 'عدم تطابق الحالة',
            JSON_ERROR_CTRL_CHAR => 'حرف تحكم غير صالح',
            JSON_ERROR_SYNTAX => 'خطأ في بناء الجملة',
            JSON_ERROR_UTF8 => 'ترميز UTF-8 غير صالح'
        ];
        $errorMsg = $errorMessages[$jsonError] ?? "خطأ غير معروف: $jsonError";
        
        echo json_encode([
            'success' => false, 
            'message' => 'ملف package.json غير صالح: ' . $errorMsg,
            'debug' => substr($packageContent, 0, 100)
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    if (!isset($packageData['version'])) {
        echo json_encode([
            'success' => false, 
            'message' => 'ملف package.json لا يحتوي على حقل version',
            'data' => $packageData
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // قراءة changelog.json الحالي
    $changelog = ['version' => '1.0.0', 'updates' => []];
    if (file_exists($changelogFile)) {
        $changelogContent = file_get_contents($changelogFile);
        $changelogContent = preg_replace('/^\xEF\xBB\xBF/', '', $changelogContent);
        $changelog = json_decode($changelogContent, true) ?? $changelog;
    }
    
    $oldVersion = $changelog['version'];
    $newVersion = $packageData['version'];
    $summary = 'تحديث النظام';
    $buildDate = date('Y-m-d H:i:s');
    
    // تحديث الإصدار الرئيسي
    $changelog['version'] = $newVersion;
    
    // إضافة سجل جديد إذا كان الإصدار مختلف
    if ($oldVersion !== $newVersion) {
        array_unshift($changelog['updates'], [
            'date' => $buildDate,
            'filesUpdated' => 0,
            'summary' => $summary,
            'version' => $newVersion
        ]);
        
        // الاحتفاظ بآخر 50 تحديث
        $changelog['updates'] = array_slice($changelog['updates'], 0, 50);
    } else {
        // تحديث آخر سجل إذا كان نفس الإصدار
        if (!empty($changelog['updates'])) {
            $changelog['updates'][0]['summary'] = $summary;
        }
    }
    
    // حفظ changelog.json
    file_put_contents($changelogFile, json_encode($changelog, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    echo json_encode([
        'success' => true,
        'message' => 'تم مزامنة الإصدار بنجاح',
        'oldVersion' => $oldVersion,
        'newVersion' => $newVersion,
        'summary' => $summary
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * تحديث ملف التقدم
 */
function updateProgress($file, $status, $progress, $currentFile, $totalFiles, $processedFiles, $updatedFiles, $skippedFiles, $errors) {
    file_put_contents($file, json_encode([
        'status' => $status,
        'progress' => $progress,
        'currentFile' => $currentFile,
        'totalFiles' => $totalFiles,
        'processedFiles' => $processedFiles,
        'updatedFiles' => array_slice($updatedFiles, -20), // آخر 20 ملف
        'skippedFiles' => array_slice($skippedFiles, -10),
        'errors' => $errors,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE));
}

/**
 * تحديث ملف changelog بعد التحديث
 */
function updateChangelog($updatedFiles, $versionData = null) {
    global $changelogFile, $rootDir;
    
    $changelog = ['version' => '1.0.0', 'updates' => []];
    if (file_exists($changelogFile)) {
        $changelogContent = file_get_contents($changelogFile);
        $changelogContent = preg_replace('/^\xEF\xBB\xBF/', '', $changelogContent);
        $changelog = json_decode($changelogContent, true) ?? $changelog;
    }
    
    // قراءة الإصدار من package.json (المصدر الرئيسي للإصدار)
    // ملاحظة: package.json يجب أن يكون موجوداً في deploy.zip ليتم نسخه إلى Production
    $packageFile = $rootDir . '/package.json';
    $newVersion = $changelog['version'] ?? '1.0.0';
    $summary = 'تحديث النظام - ' . count($updatedFiles) . ' ملف';
    
    // محاولة قراءة الإصدار من package.json أولاً (بعد التحديث)
    // package.json يتم نسخه تلقائياً في deploy.zip الآن
    if (file_exists($packageFile)) {
        $packageContent = file_get_contents($packageFile);
        $packageContent = preg_replace('/^\xEF\xBB\xBF/', '', $packageContent);
        $packageContent = trim($packageContent);
        
        $packageData = json_decode($packageContent, true);
        if ($packageData && json_last_error() === JSON_ERROR_NONE) {
            if (isset($packageData['version'])) {
                $newVersion = $packageData['version'];
            }
        }
    } else {
        // محاولة قراءة من version.json كبديل (للتوافق مع الإصدارات القديمة)
        $versionFile = $rootDir . '/version.json';
        if (file_exists($versionFile)) {
            $versionContent = file_get_contents($versionFile);
            $versionContent = preg_replace('/^\xEF\xBB\xBF/', '', $versionContent);
            $versionContent = trim($versionContent);
            
            $versionInfo = json_decode($versionContent, true);
            if ($versionInfo && json_last_error() === JSON_ERROR_NONE) {
                $newVersion = $versionInfo['version'] ?? $newVersion;
                if (isset($versionInfo['changelog'][0]['summary'])) {
                    $summary = $versionInfo['changelog'][0]['summary'];
                }
            }
        }
    }
    
    // تحديث الإصدار في changelog.json تلقائياً
    $oldVersion = $changelog['version'] ?? '1.0.0';
    $changelog['version'] = $newVersion;
    
    // إضافة سجل التحديث الجديد فقط إذا كان الإصدار مختلف أو إذا كان هناك ملفات محدثة
    if ($oldVersion !== $newVersion || count($updatedFiles) > 0) {
        array_unshift($changelog['updates'], [
            'date' => date('Y-m-d H:i:s'),
            'filesUpdated' => count($updatedFiles),
            'summary' => $summary,
            'version' => $newVersion
        ]);
        
        // الاحتفاظ بآخر 50 تحديث فقط
        $changelog['updates'] = array_slice($changelog['updates'], 0, 50);
    }
    
    // حفظ changelog.json مع الإصدار المحدث تلقائياً
    file_put_contents($changelogFile, json_encode($changelog, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

/**
 * تنسيق حجم الملف
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}
?>

