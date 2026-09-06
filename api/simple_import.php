<?php
require_once 'cors_headers.php';
require_once 'config.php';

error_log("=== بدء الاستيراد البسيط ===");

try {
    error_log("فك شفرة الإدخال...");
    $input = json_decode(file_get_contents('php://input'), true);

    if ($input === null) {
        throw new Exception('فشل في فك شفرة JSON');
    }

    error_log("Action: " . ($input['action'] ?? 'no action'));

    if (($input['action'] ?? '') === 'import_csv_data') {
        error_log("معالجة البيانات...");

        // تعريف المتغيرات
        $processedLines = 0;
        $skippedLines = 0;
        $importedCount = 0;

        error_log("المتغيرات مُعرفة: processedLines=$processedLines");

        echo json_encode([
            'success' => true,
            'message' => 'تم الاستيراد البسيط بنجاح',
            'processed_lines' => $processedLines
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'إجراء غير صحيح'
        ]);
    }

} catch (Exception $e) {
    error_log("خطأ: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'خطأ: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>