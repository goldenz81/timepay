<?php
class Database {
    private static $pdo = null;
    private static $config = null;

    private static function getConfig() {
        if (self::$config === null) {
            $configPath = __DIR__ . '/../config/database_config.php';
            if (!file_exists($configPath)) {
                throw new Exception('Database configuration file not found: ' . $configPath);
            }
            self::$config = require $configPath;
        }
        return self::$config;
    }

    public static function connect() {
        if (self::$pdo === null) {
            try {
                $config = self::getConfig();
                
                $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
                
                self::$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
                
                return self::$pdo;
                
            } catch (PDOException $e) {
                // محاولة إنشاء قاعدة البيانات إذا لم تكن موجودة
                try {
                    $config = self::getConfig();
                    $dsn = "mysql:host={$config['host']};charset={$config['charset']}";
                    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
                    
                    // إنشاء قاعدة البيانات
                    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['dbname']}` CHARACTER SET {$config['charset']} COLLATE {$config['charset']}_unicode_ci");
                    
                    // الاتصال بقاعدة البيانات المحددة
                    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
                    self::$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
                    
                    return self::$pdo;
                    
                } catch (PDOException $e2) {
                    throw new Exception("Database connection failed: " . $e2->getMessage());
                }
            }
        }
        return self::$pdo;
    }

    public static function getConnection() {
        return self::connect();
    }

    public static function close() {
        self::$pdo = null;
    }
}
?>
