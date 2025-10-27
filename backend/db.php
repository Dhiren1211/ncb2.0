<?php
// db.php - Centralized database & cache connection for organization_db

class DatabaseConnection {
    private static $pdo = null;
    private static $redis = null;
    private static $cachePath = null;
    
    private static $config = [
        'db' => [
            'host' => 'localhost',
            'name' => 'ncb_db',
            'user' => 'root',
            'pass' => '', // Consider using environment variables
            'charset' => 'utf8mb4',
            'timeout' => 5
        ],
        'redis' => [
            'host' => 'localhost',
            'port' => 6379,
            'password' => null,
            'timeout' => 1.5,
            'enabled' => false
        ]
    ];

    public static function getPDO() {
        if (self::$pdo === null) {
            try {
                $dsn = sprintf(
                    "mysql:host=%s;dbname=%s;charset=%s",
                    self::$config['db']['host'],
                    self::$config['db']['name'],
                    self::$config['db']['charset']
                );
                
                self::$pdo = new PDO($dsn, 
                    self::$config['db']['user'], 
                    self::$config['db']['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_PERSISTENT => false, // ⚠️ Changed from true
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => self::$config['db']['timeout'],
                    PDO::ATTR_EMULATE_PREPARES => false // Security improvement
                ]);
                
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw new RuntimeException('Database connection failed');
            }
        }
        return self::$pdo;
    }

    public static function getRedis() {
        if (self::$redis === null && self::$config['redis']['enabled']) {
            try {
                self::$redis = new Redis();
                self::$redis->connect(
                    self::$config['redis']['host'], 
                    self::$config['redis']['port'], 
                    self::$config['redis']['timeout']
                );
                
                if (self::$config['redis']['password']) {
                    self::$redis->auth(self::$config['redis']['password']);
                }
                
                // Test connection
                self::$redis->ping();
                
            } catch (Exception $e) {
                error_log("Redis connection failed: " . $e->getMessage());
                self::$redis = false; // Mark as failed
            }
        }
        return self::$redis ?: null;
    }

    private static function getCachePath() {
        if (self::$cachePath === null) {
            self::$cachePath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'org_api_cache';
            if (!is_dir(self::$cachePath)) {
                @mkdir(self::$cachePath, 0755, true);
            }
        }
        return self::$cachePath;
    }
}

// Cache functions with improvements
function cache_get($key, $default = null) {
    // Add prefix to avoid conflicts
    $key = 'org_db_' . $key;
    
    // Redis
    $redis = DatabaseConnection::getRedis();
    if ($redis) {
        try {
            $data = $redis->get($key);
            return $data ? json_decode($data, true) : $default;
        } catch (Exception $e) {
            error_log("Redis get error: " . $e->getMessage());
        }
    }
    
    // Filesystem fallback
    $path = DatabaseConnection::getCachePath() . DIRECTORY_SEPARATOR . sha1($key) . '.json';
    if (file_exists($path) && (time() - filemtime($path)) < 3600) { // 1 hour max for file cache
        $data = file_get_contents($path);
        return $data ? json_decode($data, true) : $default;
    }
    
    return $default;
}

function cache_set($key, $value, $ttl = 60) {
    $key = 'org_db_' . $key;
    
    // Redis
    $redis = DatabaseConnection::getRedis();
    if ($redis) {
        try {
            return $redis->setex($key, $ttl, json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE));
        } catch (Exception $e) {
            error_log("Redis set error: " . $e->getMessage());
        }
    }
    
    // Filesystem fallback (limited TTL)
    if ($ttl <= 3600) { // Only use filesystem for short TTL
        $path = DatabaseConnection::getCachePath() . DIRECTORY_SEPARATOR . sha1($key) . '.json';
        file_put_contents($path, json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE));
        return true;
    }
    
    return false;
}

function cache_delete($key) {
    $key = 'org_db_' . $key;
    
    // Redis
    $redis = DatabaseConnection::getRedis();
    if ($redis) {
        try {
            return $redis->del($key);
        } catch (Exception $e) {
            error_log("Redis delete error: " . $e->getMessage());
        }
    }
    
    // Filesystem fallback
    $path = DatabaseConnection::getCachePath() . DIRECTORY_SEPARATOR . sha1($key) . '.json';
    return @unlink($path);
}

// Initialize connection (optional, can be lazy-loaded)
try {
    $pdo = DatabaseConnection::getPDO();
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode(['status' => 'error', 'message' => 'Service unavailable']));
}
?>