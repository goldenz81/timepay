<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

// Debug: Log the action and input
error_log("Modal Settings API - Action: " . $action);
error_log("Modal Settings API - Input: " . json_encode($input));
error_log("Modal Settings API - GET: " . json_encode($_GET));

// Path to JSON file
$configFile = '../config/modal_settings.json';

switch ($action) {
    case 'save_modal_settings':
        saveModalSettings($configFile, $input['settings']);
        break;
    
    case 'get_modal_settings':
        getModalSettings($configFile);
        break;
    
    case 'reset_modal_settings':
        resetModalSettings($configFile);
        break;
    
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
}

function saveModalSettings($configFile, $settings) {
    try {
        // Ensure config directory exists
        $configDir = dirname($configFile);
        if (!is_dir($configDir)) {
            mkdir($configDir, 0755, true);
        }
        
        // Default settings
        $defaultSettings = [
            'modalCustomizationEnabled' => false,
            'headerGradient' => 'linear-gradient(225deg, #667eea 0%, #764ba2 100%)',
            'titleColor' => '#ffffff',
            'titleFontFamily' => 'Cairo',
            'titleFontSize' => '1.25rem',
            'titleFontWeight' => 'bold',
            'closeIconColor' => '#ffffff',
            'fieldFontFamily' => 'Cairo',
            'fieldFontSize' => '1rem',
            'fieldFontWeight' => 'normal',
            'position' => 'center',
            'maskBlur' => '8px'
        ];
        
        // Merge with provided settings
        $finalSettings = array_merge($defaultSettings, $settings);
        
        // Add timestamp
        $finalSettings['lastUpdated'] = date('Y-m-d H:i:s');
        
        // Write to JSON file
        $jsonData = json_encode($finalSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        if (file_put_contents($configFile, $jsonData) === false) {
            throw new Exception('Failed to write to config file');
        }
        
        echo json_encode([
            'success' => true, 
            'message' => 'Modal settings saved successfully',
            'settings' => $finalSettings
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getModalSettings($configFile) {
    try {
        if (!file_exists($configFile)) {
            // Return default settings if file doesn't exist
            $defaultSettings = [
                'modalCustomizationEnabled' => false,
                'headerGradient' => 'linear-gradient(225deg, #667eea 0%, #764ba2 100%)',
                'titleColor' => '#ffffff',
                'titleFontFamily' => 'Cairo',
                'titleFontSize' => '1.25rem',
                'titleFontWeight' => 'bold',
                'closeIconColor' => '#ffffff',
                'fieldFontFamily' => 'Cairo',
                'fieldFontSize' => '1rem',
                'fieldFontWeight' => 'normal',
                'position' => 'center',
                'maskBlur' => '8px'
            ];
            
            echo json_encode([
                'success' => true,
                'settings' => $defaultSettings,
                'message' => 'Using default settings'
            ]);
            return;
        }
        
        $jsonData = file_get_contents($configFile);
        $settings = json_decode($jsonData, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON format: ' . json_last_error_msg());
        }
        
        echo json_encode([
            'success' => true,
            'settings' => $settings
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function resetModalSettings($configFile) {
    try {
        if (file_exists($configFile)) {
            unlink($configFile);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Modal settings reset to default'
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
