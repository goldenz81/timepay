<?php
// تضمين ملف CORS المشترك
require_once 'cors_headers.php';

// إعداد قاعدة البيانات
require_once 'config_unified.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
    exit;
}

$file = $_FILES['logo'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed']);
    exit;
}

// Validate file size (2MB max)
$maxSize = 2 * 1024 * 1024; // 2MB
if ($file['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'File size too large. Maximum 2MB allowed']);
    exit;
}

// variable_key: أي إعداد نريد حفظ الرابط فيه (company_logo أو company_logo_soft_light)
$variableKey = isset($_POST['variable_key']) && $_POST['variable_key'] === 'company_logo_soft_light' ? 'company_logo_soft_light' : 'company_logo';

// Create uploads directory if it doesn't exist
$uploadDir = '../uploads/logos/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename - use variable_key in name so لوجو الضوء الناعم لا يستبدل لوجو الداكن
$filePrefix = $variableKey === 'company_logo_soft_light' ? 'company_logo_soft_light_' : 'company_logo_';
$fileName = $filePrefix . time() . '_' . uniqid() . '.png';
$filePath = $uploadDir . $fileName;

// Move uploaded file
if (move_uploaded_file($file['tmp_name'], $filePath)) {
    // Generate URL for the uploaded file
    $logoUrl = '/uploads/logos/' . $fileName;
    
    // Save logo URL to database (new dynamic system)
    $nameAr = $variableKey === 'company_logo_soft_light' ? 'شعار قالب الضوء الناعم' : 'شعار الشركة';
    $nameEn = $variableKey === 'company_logo_soft_light' ? 'Soft Light theme logo' : 'company_logo';
    try {
        // Check if setting exists
        $stmt = $pdo->prepare("SELECT id FROM system_variables WHERE variable_key = ?");
        $stmt->execute([$variableKey]);
        
        if ($stmt->rowCount() > 0) {
            // Update existing setting
            $stmt = $pdo->prepare("UPDATE system_variables SET variable_value = ?, updated_at = NOW() WHERE variable_key = ?");
            $stmt->execute([$logoUrl, $variableKey]);
        } else {
            // Insert new setting
            $stmt = $pdo->prepare("INSERT INTO system_variables (variable_key, variable_name_ar, variable_name_en, variable_value, variable_type, category, is_editable, is_required, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 'text', 'general', 1, 0, 1, NOW(), NOW())");
            $stmt->execute([$variableKey, $nameAr, $nameEn, $logoUrl]);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Logo uploaded successfully',
            'logoUrl' => $logoUrl
        ]);
    } catch(PDOException $e) {
        // Delete uploaded file if database save fails
        unlink($filePath);
        echo json_encode(['success' => false, 'message' => 'Failed to save logo to database: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to upload file']);
}
?>
