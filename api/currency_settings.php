<?php
// Simple Currency Settings API (read-only)
error_reporting(0);
ini_set('display_errors', 0);

// CORS - send on every request (preflight and actual)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('Vary: Origin');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit();
}

// Defaults
$defaults = [
  'currency.enabled' => 'true',
  'currency.symbol' => 'ج.م',
  'currency.name' => 'جنيه مصري',
  'currency.code' => 'EGP',
  'currency.position' => 'after',
  'currency.decimals' => '0',
  'currency.thousands_separator' => ',',
  'currency.decimal_separator' => '.',
  'currency.format' => '{amount} {symbol} {name}',
  'currency.show_symbol' => 'true',
  'currency.show_name' => 'true'
];

// Try load from config if exists
$configPath = __DIR__ . '/../config/currency_settings.json';
if (file_exists($configPath)) {
  $json = json_decode(file_get_contents($configPath), true);
  if (is_array($json)) {
    $defaults = array_merge($defaults, $json);
  }
}
// Save handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $raw = file_get_contents('php://input');
  $input = json_decode($raw, true) ?: [];
  $settings = $input['settings'] ?? [];
  if (!is_array($settings)) {
    echo json_encode(['success' => false, 'error' => 'إعدادات غير صالحة'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  // whitelist keys
  $allowed = array_keys($defaults);
  $toWrite = $defaults;
  foreach ($settings as $k => $v) {
    if (in_array($k, $allowed, true)) {
      $toWrite[$k] = is_bool($v) ? ($v ? 'true' : 'false') : (string)$v;
    }
  }
  // ensure dir exists
  $dir = dirname($configPath);
  if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
  $ok = (bool)file_put_contents($configPath, json_encode($toWrite, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  echo json_encode(['success' => $ok, 'settings' => $toWrite], JSON_UNESCAPED_UNICODE);
  exit;
}

// GET
echo json_encode(['success' => true, 'settings' => $defaults], JSON_UNESCAPED_UNICODE);
exit;
?>