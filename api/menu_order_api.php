<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'get_menu_order':
        getMenuOrder();
        break;
    case 'save_menu_order':
        saveMenuOrder();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getMenuOrder() {
    $filePath = 'config/menu_order.json';
    
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $menuOrder = json_decode($content, true);
        
        if ($menuOrder) {
            echo json_encode(['success' => true, 'menuOrder' => $menuOrder]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON format']);
        }
    } else {
        // Return default order if file doesn't exist
        $defaultOrder = [
            '/',
            '/unified-employees',
            '/departments',
            '/unified-attendance',
            '/import-attendance',
            '/salary-payroll',
            '/dynamic-system-manager',
            '/fingerprint-management',
            '/system-settings'
        ];
        echo json_encode(['success' => true, 'menuOrder' => $defaultOrder]);
    }
}

function saveMenuOrder() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['menuOrder']) || !is_array($input['menuOrder'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid menu order data']);
        return;
    }
    
    $filePath = 'config/menu_order.json';
    $configDir = dirname($filePath);
    
    // Create config directory if it doesn't exist
    if (!is_dir($configDir)) {
        mkdir($configDir, 0755, true);
    }
    
    $result = file_put_contents($filePath, json_encode($input['menuOrder'], JSON_PRETTY_PRINT));
    
    if ($result !== false) {
        echo json_encode(['success' => true, 'message' => 'Menu order saved successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save menu order']);
    }
}
?>
