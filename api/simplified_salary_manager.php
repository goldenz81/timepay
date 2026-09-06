<?php
/**
 * API للنظام المبسط للرواتب
 * Simplified Salary Manager API
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../models/Database.php';

class SimplifiedSalaryManagerAPI {
    private $conn;
    
    public function __construct() {
        try {
            $this->conn = Database::connect();
        } catch (Exception $e) {
            $this->sendError('خطأ في الاتصال بقاعدة البيانات: ' . $e->getMessage());
        }
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? $_POST['action'] ?? '';
        
        try {
            switch ($action) {
                // Tables
                case 'get_tables':
                    $this->sendResponse($this->getTables());
                case 'create_table':
                    $this->sendResponse($this->createTable());
                case 'update_table':
                    $this->sendResponse($this->updateTable());
                case 'delete_table':
                    $this->sendResponse($this->deleteTable());
                
                // Columns
                case 'get_columns':
                    $this->sendResponse($this->getColumns());
                case 'create_column':
                    $this->sendResponse($this->createColumn());
                case 'update_column':
                    $this->sendResponse($this->updateColumn());
                case 'delete_column':
                    $this->sendResponse($this->deleteColumn());
                case 'reorder_columns':
                    $this->sendResponse($this->reorderColumns());
                
                // Formulas
                case 'get_formulas':
                    $this->sendResponse($this->getFormulas());
                case 'create_formula':
                    $this->sendResponse($this->createFormula());
                case 'update_formula':
                    $this->sendResponse($this->updateFormula());
                case 'delete_formula':
                    $this->sendResponse($this->deleteFormula());
                case 'test_formula':
                    $this->sendResponse($this->testFormula());
                
                // Variables
                case 'get_variables':
                    $this->sendResponse($this->getVariables());
                case 'create_variable':
                    $this->sendResponse($this->createVariable());
                case 'update_variable':
                    $this->sendResponse($this->updateVariable());
                case 'delete_variable':
                    $this->sendResponse($this->deleteVariable());
                
                // Currency Settings
                case 'get_currency_settings':
                    $this->sendResponse($this->getCurrencySettings());
                case 'update_currency_settings':
                    $this->sendResponse($this->updateCurrencySettings());
                
                default:
                    $this->sendError('إجراء غير صحيح', 400);
            }
        } catch (Exception $e) {
            $this->sendError('خطأ في الخادم: ' . $e->getMessage(), 500);
        }
    }
    
    // Tables methods
    private function getTables() {
        $stmt = $this->conn->query("
            SELECT * FROM salary_tables 
            ORDER BY display_order ASC, id ASC
        ");
        $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->sendSuccess($tables);
    }
    
    private function createTable() {
        $data = $this->getRequestData();
        
        $required_fields = ['table_key', 'table_name_ar', 'table_name_en', 'table_type'];
        $this->validateRequiredFields($data, $required_fields);
        
        $sql = "
            INSERT INTO salary_tables 
            (table_key, table_name_ar, table_name_en, table_type, display_order, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['table_key'],
            $data['table_name_ar'],
            $data['table_name_en'],
            $data['table_type'],
            $data['display_order'] ?? 0,
            $data['description'] ?? '',
            $data['is_active'] ?? 1
        ]);
        
        $table_id = $this->conn->lastInsertId();
        
        return $this->sendSuccess(['id' => $table_id, 'message' => 'تم إنشاء الجدول بنجاح']);
    }
    
    private function updateTable() {
        $data = $this->getRequestData();
        $table_id = $data['id'] ?? null;
        
        if (!$table_id) {
            return $this->sendError('معرف الجدول مطلوب', 400);
        }
        
        $sql = "
            UPDATE salary_tables 
            SET table_name_ar = ?, table_name_en = ?, table_type = ?, 
                display_order = ?, description = ?, is_active = ?
            WHERE id = ?
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['table_name_ar'],
            $data['table_name_en'],
            $data['table_type'],
            $data['display_order'],
            $data['description'],
            $data['is_active'],
            $table_id
        ]);
        
        return $this->sendSuccess(['message' => 'تم تحديث الجدول بنجاح']);
    }
    
    private function deleteTable() {
        $table_id = $_GET['id'] ?? null;
        
        if (!$table_id) {
            return $this->sendError('معرف الجدول مطلوب', 400);
        }
        
        $stmt = $this->conn->prepare("DELETE FROM salary_tables WHERE id = ?");
        $stmt->execute([$table_id]);
        
        return $this->sendSuccess(['message' => 'تم حذف الجدول بنجاح']);
    }
    
    // Columns methods
    private function getColumns() {
        $table_id = $_GET['table_id'] ?? $_POST['table_id'] ?? null;
        $table_type = $_GET['table_type'] ?? $_POST['table_type'] ?? null;
        
        $sql = "
            SELECT sc.*, st.table_name_ar as table_name, sf.formula_name_ar as formula_name
            FROM salary_columns sc
            LEFT JOIN salary_tables st ON sc.table_id = st.id
            LEFT JOIN salary_formulas sf ON sc.formula_id = sf.id
        ";
        
        $params = [];
        $conditions = [];
        
        if ($table_id) {
            $conditions[] = "sc.table_id = ?";
            $params[] = $table_id;
        }
        
        if ($table_type) {
            $conditions[] = "(st.table_type = ? OR st.table_type = 'both')";
            $params[] = $table_type;
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        
        $sql .= " ORDER BY sc.display_order ASC, sc.id ASC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->sendSuccess($columns);
    }
    
    private function createColumn() {
        $data = $this->getRequestData();
        
        $required_fields = ['table_id', 'column_key', 'column_name_ar', 'column_name_en', 'data_type'];
        $this->validateRequiredFields($data, $required_fields);
        
        $sql = "
            INSERT INTO salary_columns 
            (table_id, column_key, column_name_ar, column_name_en, data_type, 
             display_order, is_visible, is_editable, is_calculated, formula_id,
             width, alignment, is_currency, decimal_places, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['table_id'],
            $data['column_key'],
            $data['column_name_ar'],
            $data['column_name_en'],
            $data['data_type'],
            $data['display_order'] ?? 0,
            $data['is_visible'] ?? 1,
            $data['is_editable'] ?? 1,
            $data['is_calculated'] ?? 0,
            $data['formula_id'] ?? null,
            $data['width'] ?? 150,
            $data['alignment'] ?? 'left',
            $data['is_currency'] ?? 0,
            $data['decimal_places'] ?? 2,
            $data['description'] ?? ''
        ]);
        
        $column_id = $this->conn->lastInsertId();
        
        return $this->sendSuccess(['id' => $column_id, 'message' => 'تم إنشاء العمود بنجاح']);
    }
    
    private function updateColumn() {
        $data = $this->getRequestData();
        $column_id = $data['id'] ?? null;
        
        if (!$column_id) {
            return $this->sendError('معرف العمود مطلوب', 400);
        }
        
        $sql = "
            UPDATE salary_columns 
            SET column_name_ar = ?, column_name_en = ?, data_type = ?, 
                display_order = ?, is_visible = ?, is_editable = ?, is_calculated = ?,
                formula_id = ?, width = ?, alignment = ?, is_currency = ?, 
                decimal_places = ?, description = ?
            WHERE id = ?
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['column_name_ar'],
            $data['column_name_en'],
            $data['data_type'],
            $data['display_order'],
            $data['is_visible'],
            $data['is_editable'],
            $data['is_calculated'],
            $data['formula_id'],
            $data['width'],
            $data['alignment'],
            $data['is_currency'],
            $data['decimal_places'],
            $data['description'],
            $column_id
        ]);
        
        return $this->sendSuccess(['message' => 'تم تحديث العمود بنجاح']);
    }
    
    private function deleteColumn() {
        $column_id = $_GET['id'] ?? null;
        
        if (!$column_id) {
            return $this->sendError('معرف العمود مطلوب', 400);
        }
        
        $stmt = $this->conn->prepare("DELETE FROM salary_columns WHERE id = ?");
        $stmt->execute([$column_id]);
        
        return $this->sendSuccess(['message' => 'تم حذف العمود بنجاح']);
    }
    
    private function reorderColumns() {
        $data = $this->getRequestData();
        $columns = $data['columns'] ?? [];
        
        if (empty($columns)) {
            return $this->sendError('قائمة الأعمدة فارغة', 400);
        }
        
        $this->conn->beginTransaction();
        
        try {
            foreach ($columns as $index => $column_id) {
                $stmt = $this->conn->prepare("UPDATE salary_columns SET display_order = ? WHERE id = ?");
                $stmt->execute([$index + 1, $column_id]);
            }
            
            $this->conn->commit();
            return $this->sendSuccess(['message' => 'تم إعادة ترتيب الأعمدة بنجاح']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    // Formulas methods
    private function getFormulas() {
        $stmt = $this->conn->query("
            SELECT * FROM salary_formulas 
            ORDER BY formula_type ASC, id ASC
        ");
        $formulas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->sendSuccess($formulas);
    }
    
    private function createFormula() {
        $data = $this->getRequestData();
        
        $required_fields = ['formula_key', 'formula_name_ar', 'formula_name_en', 'formula_expression', 'formula_type'];
        $this->validateRequiredFields($data, $required_fields);
        
        $sql = "
            INSERT INTO salary_formulas 
            (formula_key, formula_name_ar, formula_name_en, formula_expression, 
             formula_type, description, dependencies, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['formula_key'],
            $data['formula_name_ar'],
            $data['formula_name_en'],
            $data['formula_expression'],
            $data['formula_type'],
            $data['description'] ?? '',
            json_encode($data['dependencies'] ?? []),
            $data['is_active'] ?? 1
        ]);
        
        $formula_id = $this->conn->lastInsertId();
        
        return $this->sendSuccess(['id' => $formula_id, 'message' => 'تم إنشاء المعادلة بنجاح']);
    }
    
    private function updateFormula() {
        $data = $this->getRequestData();
        $formula_id = $data['id'] ?? null;
        
        if (!$formula_id) {
            return $this->sendError('معرف المعادلة مطلوب', 400);
        }
        
        $sql = "
            UPDATE salary_formulas 
            SET formula_name_ar = ?, formula_name_en = ?, formula_expression = ?,
                formula_type = ?, description = ?, dependencies = ?, is_active = ?
            WHERE id = ?
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['formula_name_ar'],
            $data['formula_name_en'],
            $data['formula_expression'],
            $data['formula_type'],
            $data['description'],
            json_encode($data['dependencies'] ?? []),
            $data['is_active'],
            $formula_id
        ]);
        
        return $this->sendSuccess(['message' => 'تم تحديث المعادلة بنجاح']);
    }
    
    private function deleteFormula() {
        $formula_id = $_GET['id'] ?? null;
        
        if (!$formula_id) {
            return $this->sendError('معرف المعادلة مطلوب', 400);
        }
        
        $stmt = $this->conn->prepare("DELETE FROM salary_formulas WHERE id = ?");
        $stmt->execute([$formula_id]);
        
        return $this->sendSuccess(['message' => 'تم حذف المعادلة بنجاح']);
    }
    
    private function testFormula() {
        $data = $this->getRequestData();
        $formula_expression = $data['formula_expression'] ?? '';
        $test_data = $data['test_data'] ?? [];
        
        if (empty($formula_expression)) {
            return $this->sendError('تعبير المعادلة مطلوب', 400);
        }
        
        try {
            // Simple formula evaluation (in production, use a proper formula engine)
            $result = $this->evaluateFormula($formula_expression, $test_data);
            
            return $this->sendSuccess([
                'result' => $result,
                'message' => 'تم اختبار المعادلة بنجاح'
            ]);
        } catch (Exception $e) {
            return $this->sendError('خطأ في المعادلة: ' . $e->getMessage(), 400);
        }
    }
    
    // Variables methods
    private function getVariables() {
        $stmt = $this->conn->query("
            SELECT * FROM salary_variables 
            ORDER BY scope ASC, id ASC
        ");
        $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->sendSuccess($variables);
    }
    
    private function createVariable() {
        $data = $this->getRequestData();
        
        $required_fields = ['variable_key', 'variable_name_ar', 'variable_name_en', 'variable_value', 'variable_type', 'scope'];
        $this->validateRequiredFields($data, $required_fields);
        
        $sql = "
            INSERT INTO salary_variables 
            (variable_key, variable_name_ar, variable_name_en, variable_value, 
             variable_type, scope, is_system, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['variable_key'],
            $data['variable_name_ar'],
            $data['variable_name_en'],
            $data['variable_value'],
            $data['variable_type'],
            $data['scope'],
            $data['is_system'] ?? 0,
            $data['description'] ?? ''
        ]);
        
        $variable_id = $this->conn->lastInsertId();
        
        return $this->sendSuccess(['id' => $variable_id, 'message' => 'تم إنشاء المتغير بنجاح']);
    }
    
    private function updateVariable() {
        $data = $this->getRequestData();
        $variable_id = $data['id'] ?? null;
        
        if (!$variable_id) {
            return $this->sendError('معرف المتغير مطلوب', 400);
        }
        
        $sql = "
            UPDATE salary_variables 
            SET variable_name_ar = ?, variable_name_en = ?, variable_value = ?,
                variable_type = ?, scope = ?, is_system = ?, description = ?
            WHERE id = ?
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['variable_name_ar'],
            $data['variable_name_en'],
            $data['variable_value'],
            $data['variable_type'],
            $data['scope'],
            $data['is_system'],
            $data['description'],
            $variable_id
        ]);
        
        return $this->sendSuccess(['message' => 'تم تحديث المتغير بنجاح']);
    }
    
    private function deleteVariable() {
        $variable_id = $_GET['id'] ?? null;
        
        if (!$variable_id) {
            return $this->sendError('معرف المتغير مطلوب', 400);
        }
        
        $stmt = $this->conn->prepare("DELETE FROM salary_variables WHERE id = ?");
        $stmt->execute([$variable_id]);
        
        return $this->sendSuccess(['message' => 'تم حذف المتغير بنجاح']);
    }
    
    // Helper methods
    private function getRequestData() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = $_POST;
        }
        
        return $data;
    }
    
    private function validateRequiredFields($data, $required_fields) {
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            throw new Exception('الحقول المطلوبة مفقودة: ' . implode(', ', $missing_fields));
        }
    }
    
    private function evaluateFormula($expression, $variables = []) {
        // Simple formula evaluation (in production, use a proper formula engine)
        $expression = str_replace(' ', '', $expression);
        
        // Replace variables with their values
        foreach ($variables as $key => $value) {
            $expression = str_replace($key, $value, $expression);
        }
        
        // Basic math operations
        if (preg_match('/^[0-9+\-*\/\(\)\.\s]+$/', $expression)) {
            $result = eval("return $expression;");
            return $result;
        }
        
        throw new Exception('تعبير المعادلة غير صحيح');
    }
    
    private function sendSuccess($data, $message = 'تم بنجاح') {
        return $this->sendResponse([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }
    
    // Currency Settings methods
    private function getCurrencySettings() {
        try {
            $stmt = $this->conn->prepare("
                SELECT setting_value 
                FROM system_settings 
                WHERE setting_key = 'currency_config'
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                $config = json_decode($result['setting_value'], true);
            } else {
                // إعدادات افتراضية
                $config = [
                    'enabled' => true,
                    'symbol' => 'ج.م',
                    'position' => 'after',
                    'decimal_places' => 2,
                    'thousands_separator' => ',',
                    'decimal_separator' => '.',
                    'show_symbol' => true
                ];
            }
            
            return [
                'success' => true,
                'data' => $config,
                'message' => 'تم تحميل إعدادات العملة بنجاح'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في تحميل إعدادات العملة: ' . $e->getMessage()
            ];
        }
    }
    
    private function updateCurrencySettings() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return [
                    'success' => false,
                    'message' => 'بيانات غير صحيحة'
                ];
            }
            
            $config = json_encode($input, JSON_UNESCAPED_UNICODE);
            
            $stmt = $this->conn->prepare("
                INSERT INTO system_settings (setting_key, setting_value, updated_at)
                VALUES ('currency_config', ?, NOW())
                ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_at = NOW()
            ");
            $stmt->execute([$config]);
            
            return [
                'success' => true,
                'message' => 'تم حفظ إعدادات العملة بنجاح'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'خطأ في حفظ إعدادات العملة: ' . $e->getMessage()
            ];
        }
    }
    
    private function sendError($message, $code = 400) {
        http_response_code($code);
        return $this->sendResponse([
            'success' => false,
            'message' => $message,
            'data' => null
        ]);
    }
    
    private function sendResponse($response) {
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// Handle the request
$api = new SimplifiedSalaryManagerAPI();
$api->handleRequest();
?>
