<?php
// api.php - Complete API for NCB Website matching your database schema

// Security headers first
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

// Start output buffering for compression
ob_start("ob_gzhandler");

// Import database connection
require_once 'db.php';

// ---- API CONFIG ----
class APIConfig {
    private static $config = null;
    
    public static function get($key = null) {
        if (self::$config === null) {
            self::$config = [
                'jwt_secret' => $_ENV['JWT_SECRET'] ?? 'change_this_in_production_' . bin2hex(random_bytes(32)),
                'jwt_issuer' => 'ncb_api',
                'jwt_expiration' => 3600,
                'rate_limit' => ['requests' => 100, 'per_seconds' => 60],
                'max_payload_size' => 1024 * 1024, // 1MB
                'upload_dir' => '../uploads/',
                'max_file_size' => 5 * 1024 * 1024, // 5MB
                'allowed_file_types' => ['jpg', 'jpeg', 'png', 'gif', 'pdf']
            ];
        }
        
        return $key ? (self::$config[$key] ?? null) : self::$config;
    }
}

// ---- UTILITIES ----
class APIResponse {
    public static function send($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    
    public static function error($message, $code = 400, $details = null) {
        $response = ['status' => 'error', 'message' => $message];
        if ($details && ($_ENV['APP_DEBUG'] ?? false)) {
            $response['details'] = $details;
        }
        self::send($response, $code);
    }
    
    public static function success($data = [], $message = 'success') {
        $response = ['status' => 'success', 'message' => $message];
        if (!empty($data)) {
            $response['data'] = $data;
        }
        self::send($response);
    }
}

class InputValidator {
    public static function getJsonInput($maxSize = null) {
        $maxSize = $maxSize ?? APIConfig::get('max_payload_size');
        $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
        
        if ($contentLength > $maxSize) {
            APIResponse::error("Payload too large", 413);
        }
        
        $input = file_get_contents("php://input");
        if (empty($input)) return [];
        
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            APIResponse::error("Invalid JSON: " . json_last_error_msg(), 400);
        }
        
        return $data ?: [];
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function sanitizeString($string, $maxLength = 255) {
        $string = trim($string);
        $string = htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
        return mb_substr($string, 0, $maxLength);
    }
}

// ---- SERVICE CLASSES ----

// Gallery Service - Updated to match your database
class GalleryService {
    public static function getAll() {
        try {
            $pdo = DatabaseConnection::getPDO();
            $stmt = $pdo->prepare("
                SELECT image_id as id, title, description, image_path as url, uploaded_at as created_at 
                FROM image_gallery 
                ORDER BY uploaded_at DESC
            ");
            $stmt->execute();
            $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Add full URL to images
            foreach ($images as &$image) {
                $image['url'] = getBaseUrl() . APIConfig::get('upload_dir') . $image['url'];
            }
            
            return $images;
        } catch (PDOException $e) {
            error_log("Database error in GalleryService::getAll: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch gallery images");
        }
    }
    
    public static function create($data) {
        $pdo = DatabaseConnection::getPDO();
        
        if (empty($data['title']) || empty($data['image_path'])) {
            throw new InvalidArgumentException("Title and image are required");
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO image_gallery (title, description, image_path, uploaded_by) 
            VALUES (:title, :description, :image_path, :uploaded_by)
        ");
        
        $stmt->execute([
            ':title' => InputValidator::sanitizeString($data['title']),
            ':description' => InputValidator::sanitizeString($data['description'] ?? ''),
            ':image_path' => InputValidator::sanitizeString($data['image_path']),
            ':uploaded_by' => $data['uploaded_by'] ?? 1
        ]);
        
        return $pdo->lastInsertId();
    }
}

// News Service - Using notices table as news
class NewsService {
    public static function getAll() {
        try {
            $pdo = DatabaseConnection::getPDO();
            $stmt = $pdo->prepare("
                SELECT notice_id as id, title, content, event_date, created_at, updated_at 
                FROM notices 
                WHERE status = 'Published'
                ORDER BY created_at DESC
            ");
            $stmt->execute();
            $news = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format dates
            foreach ($news as &$item) {
                $item['created_at'] = date('M d, Y', strtotime($item['created_at']));
                $item['updated_at'] = $item['updated_at'] ? date('M d, Y', strtotime($item['updated_at'])) : null;
            }
            
            return $news;
        } catch (PDOException $e) {
            error_log("Database error in NewsService::getAll: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch news");
        }
    }
    
    public static function getById($id) {
        try {
            $pdo = DatabaseConnection::getPDO();
            $stmt = $pdo->prepare("
                SELECT notice_id as id, title, content, event_date, created_at, updated_at 
                FROM notices 
                WHERE notice_id = :id AND status = 'Published'
            ");
            $stmt->execute([':id' => $id]);
            $news = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$news) {
                throw new InvalidArgumentException("News item not found");
            }
            
            // Format dates
            $news['created_at'] = date('M d, Y', strtotime($news['created_at']));
            $news['updated_at'] = $news['updated_at'] ? date('M d, Y', strtotime($news['updated_at'])) : null;
            
            return $news;
        } catch (PDOException $e) {
            error_log("Database error in NewsService::getById: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch news item");
        }
    }
}

// Events Service - Updated to match your database
class EventsService {
    public static function getAll() {
        try {
            $pdo = DatabaseConnection::getPDO();
            // Quick guard: if the events table doesn't exist, return empty list instead of throwing
            try {
                $pdo->query("SELECT 1 FROM events LIMIT 1");
            } catch (PDOException $checkEx) {
                error_log("EventsService::getAll - events table missing or inaccessible: " . $checkEx->getMessage());
                return [];
            }
                $stmt = $pdo->prepare("
                    SELECT e.event_id as id, e.title, e.description, e.start_date as event_date, 
                           e.location, e.status, COALESCE(e.rsvp_count, 0) as current_participants, m.full_name as organizer_name
                    FROM events e
                    LEFT JOIN members m ON e.organized_by = m.member_id
                    WHERE e.status IN ('Upcoming', 'Ongoing')
                    ORDER BY e.start_date ASC
                ");
            $stmt->execute();
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // If filtered query returned no rows, try a broader query (maybe statuses differ)
            if (empty($events)) {
                error_log("EventsService::getAll - no events with statuses Upcoming/Ongoing; running fallback query");
                $stmt2 = $pdo->prepare("
                    SELECT e.event_id as id, e.title, e.description, e.start_date as event_date,
                           e.location, e.status, COALESCE(e.rsvp_count, 0) as current_participants, m.full_name as organizer_name
                    FROM events e
                    LEFT JOIN members m ON e.organized_by = m.member_id
                    ORDER BY e.start_date ASC
                ");
                $stmt2->execute();
                $events = $stmt2->fetchAll(PDO::FETCH_ASSOC);
                error_log("EventsService::getAll - fallback returned " . count($events) . " rows");
            }

            // Format dates and add additional fields
            foreach ($events as &$event) {
                $event['event_date'] = $event['event_date'] ? date('M d, Y', strtotime($event['event_date'])) : null;
                // $event['created_at'] = $event['created_at'] ? date('M d, Y', strtotime($event['created_at'])) : null;
                // Add sensible defaults
                $event['max_participants'] = isset($event['max_participants']) ? (int)$event['max_participants'] : 100;
                $event['current_participants'] = isset($event['current_participants']) ? (int)$event['current_participants'] : 0;
                $event['spots_available'] = max(0, $event['max_participants'] - $event['current_participants']);
                $event['committee_role'] = $event['organizer_name'] ?? 'General';
            }
            
            return $events;
        } catch (PDOException $e) {
            error_log("Database error in EventsService::getAll: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch events");
        }
    }
    
    public static function rsvp($data) {
        $pdo = DatabaseConnection::getPDO();
        
        if (empty($data['eventId']) || empty($data['eventTitle'])) {
            throw new InvalidArgumentException("Event ID and title are required");
        }
        
        // Check if event exists
            $stmt = $pdo->prepare("
                SELECT event_id FROM events 
                WHERE event_id = :id
            ");
        $stmt->execute([':id' => $data['eventId']]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$event) {
            throw new InvalidArgumentException("Event not found or not available");
        }
        
        // Log RSVP (create a simple log table if needed)
            // Start a transaction so the activity log and rsvp_count update are atomic
            $pdo->beginTransaction();
                // Insert activity log. Omit user_id for anonymous RSVPs to avoid FK issues
                // (some DBs/tables enforce FK strictly; writing only the action avoids constraint checks)
                $stmt = $pdo->prepare("INSERT INTO activity_logs (action) VALUES (:action)");
                $stmt->execute([
                    ':action' => 'RSVP for event: ' . ($data['eventTitle'] ?? '[unknown]')
                ]);
                $logId = $pdo->lastInsertId();
                error_log("EventsService::rsvp - activity log created with id: " . $logId . " for eventId=" . $data['eventId']);

            try {
                // Ensure rsvp_count column exists; add if missing
                $colStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'rsvp_count'");
                $colStmt->execute();
                $colInfo = $colStmt->fetch(PDO::FETCH_ASSOC);
                if (empty($colInfo) || (int)$colInfo['cnt'] === 0) {
                    // Add rsvp_count column with a sensible default
                    $pdo->exec("ALTER TABLE events ADD COLUMN rsvp_count INT NOT NULL DEFAULT 0");
                }

                // Increment rsvp_count atomically
                $upd = $pdo->prepare("UPDATE events SET rsvp_count = rsvp_count + 1 WHERE event_id = :id");
                $upd->execute([':id' => $data['eventId']]);

                // Fetch the new count to return
                $get = $pdo->prepare("SELECT COALESCE(rsvp_count,0) as rsvp_count FROM events WHERE event_id = :id");
                $get->execute([':id' => $data['eventId']]);
                $countRow = $get->fetch(PDO::FETCH_ASSOC);

                $pdo->commit();

                return ['success' => true, 'rsvp_count' => (int)($countRow['rsvp_count'] ?? 0)];
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                error_log("EventsService::rsvp error: " . $e->getMessage());
                throw $e;
            }
    }
}

// Search Service - Updated to search your tables
class SearchService {
    public static function search($query) {
        if (empty($query)) {
            throw new InvalidArgumentException("Search query is required");
        }
        
        $searchTerm = '%' . $query . '%';
        $results = [];
        
        try {
            $pdo = DatabaseConnection::getPDO();
            
            // Search in notices (news)
            $stmt = $pdo->prepare("
                SELECT notice_id as id, title, content, 'news' as type, created_at as date 
                FROM notices 
                WHERE (title LIKE ? OR content LIKE ?) AND status = 'Published'
                ORDER BY created_at DESC 
                LIMIT 5
            ");
            $stmt->execute([$searchTerm, $searchTerm]);
            $newsResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results = array_merge($results, $newsResults);
            
            // Search in events
            $stmt = $pdo->prepare("
                SELECT event_id as id, title, description as content, 'event' as type, start_date as date 
                FROM events 
                WHERE (title LIKE ? OR description LIKE ?) AND status IN ('Upcoming', 'Ongoing')
                ORDER BY start_date DESC 
                LIMIT 5
            ");
            $stmt->execute([$searchTerm, $searchTerm]);
            $eventResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results = array_merge($results, $eventResults);
            
            // Search in image gallery
            $stmt = $pdo->prepare("
                SELECT image_id as id, title, description as content, 'gallery' as type, uploaded_at as date 
                FROM image_gallery 
                WHERE title LIKE ? OR description LIKE ?
                ORDER BY uploaded_at DESC 
                LIMIT 5
            ");
            $stmt->execute([$searchTerm, $searchTerm]);
            $galleryResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results = array_merge($results, $galleryResults);
            
            // Search in members
            $stmt = $pdo->prepare("
                SELECT member_id as id, full_name, designation as position, email, phone, 'member' as type, joined_date as date 
                FROM members 
                WHERE (full_name LIKE ? OR designation LIKE ?) AND status = 'Active'
                ORDER BY joined_date DESC 
                LIMIT 5
            ");
            $stmt->execute([$searchTerm, $searchTerm]);
            $memberResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results = array_merge($results, $memberResults);
            
            // Search in committee_roles
            $stmt = $pdo->prepare("
                SELECT cr.committee_id as id, m.full_name, m.designation, m.email, m.phone, cr.committee_type, 'committee' as type, cr.start_date as date 
                FROM committee_roles cr
                JOIN members m ON cr.member_id = m.member_id
                WHERE (m.full_name LIKE ? OR m.designation LIKE ?) AND cr.status = 'Active'
                ORDER BY cr.start_date DESC 
                LIMIT 5
            ");
            $stmt->execute([$searchTerm, $searchTerm]);
            $committeeResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results = array_merge($results, $committeeResults);
            
            return $results;
        } catch (PDOException $e) {
            error_log("Database error in SearchService::search: " . $e->getMessage());
            throw new RuntimeException("Search failed");
        }
    }
}

// Membership Application Service - Create a new table for this
class MembershipService {
    public static function createApplication($data, $file = null) {
        $pdo = DatabaseConnection::getPDO();
        
        // Create membership_applications table if it doesn't exist
        self::createMembershipTableIfNotExists($pdo);
        
        // Validate required fields
        $requiredFields = ['full_name', 'email', 'phone', 'visa_type', 'transaction_id'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new InvalidArgumentException("Missing required field: $field");
            }
        }
        
        if (!InputValidator::validateEmail($data['email'])) {
            throw new InvalidArgumentException("Invalid email format");
        }
        
        // Handle file upload
        $screenshotPath = '';
        if ($file && $file['error'] === UPLOAD_ERR_OK) {
            $screenshotPath = self::handleFileUpload($file, 'payments');
            if (!$screenshotPath) {
                throw new RuntimeException("Failed to upload payment screenshot");
            }
        }
        
        // Collect form data
        $applicationData = [
            'full_name' => InputValidator::sanitizeString($data['full_name']),
            'email' => InputValidator::sanitizeString($data['email']),
            'phone' => InputValidator::sanitizeString($data['phone']),
            'university' => InputValidator::sanitizeString($data['university'] ?? ''),
            'visa_type' => InputValidator::sanitizeString($data['visa_type']),
            'other_visa' => InputValidator::sanitizeString($data['other_visa'] ?? ''),
            'arrival_date' => $data['arrival_date'] ?? null,
            'transaction_id' => InputValidator::sanitizeString($data['transaction_id']),
            'payment_screenshot' => $screenshotPath,
            'interests' => isset($data['interests']) ? implode(', ', $data['interests']) : '',
            'application_date' => $data['application_date'] ?? date('Y-m-d H:i:s'),
            'status' => $data['status'] ?? 'pending',
            'member_id' => $data['member_id'] ?? self::generateMemberId(),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? ''
        ];
        
        // Insert into database
        $stmt = $pdo->prepare("
            INSERT INTO membership_applications 
            (full_name, email, phone, university, visa_type, other_visa, arrival_date, 
             transaction_id, payment_screenshot, interests, application_date, status, 
             member_id, ip_address) 
            VALUES (:full_name, :email, :phone, :university, :visa_type, :other_visa, :arrival_date, 
             :transaction_id, :payment_screenshot, :interests, :application_date, :status, 
             :member_id, :ip_address)
        ");
        
        try {
            $stmt->execute($applicationData);
            
            // Send notification email to admin
            self::sendAdminNotification($applicationData);
            
            return [
                'success' => true,
                'application_id' => $pdo->lastInsertId(),
                'member_id' => $applicationData['member_id']
            ];
            
        } catch (PDOException $e) {
            // Clean up uploaded file if database insert fails
            if ($screenshotPath && file_exists(APIConfig::get('upload_dir') . $screenshotPath)) {
                unlink(APIConfig::get('upload_dir') . $screenshotPath);
            }
            throw $e;
        }
    }
    
    private static function createMembershipTableIfNotExists($pdo) {
        $stmt = $pdo->prepare("
            CREATE TABLE IF NOT EXISTS membership_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                university VARCHAR(255),
                visa_type VARCHAR(50) NOT NULL,
                other_visa VARCHAR(50),
                arrival_date DATE,
                transaction_id VARCHAR(100) NOT NULL,
                payment_screenshot VARCHAR(255),
                interests TEXT,
                application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                member_id VARCHAR(20) NOT NULL UNIQUE,
                ip_address VARCHAR(45),
                rejection_reason TEXT,
                verified_date TIMESTAMP NULL,
                rejected_date TIMESTAMP NULL,
                INDEX idx_status (status),
                INDEX idx_member_id (member_id),
                INDEX idx_transaction_id (transaction_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $stmt->execute();
    }
    
    private static function handleFileUpload($file, $subdir = '') {
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error_log("File upload error: " . $file['error']);
            return false;
        }
        
        $maxSize = APIConfig::get('max_file_size');
        if ($file['size'] > $maxSize) {
            error_log("File size exceeds maximum allowed size");
            return false;
        }
        
        $fileInfo = pathinfo($file['name']);
        $extension = strtolower($fileInfo['extension']);
        
        $allowedTypes = APIConfig::get('allowed_file_types');
        if (!in_array($extension, $allowedTypes)) {
            error_log("Invalid file type. Allowed types: " . implode(', ', $allowedTypes));
            return false;
        }
        
        // Create upload directory if it doesn't exist
        $uploadPath = APIConfig::get('upload_dir') . ($subdir ? $subdir . '/' : '');
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        
        // Generate unique filename
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $filepath = $uploadPath . $filename;
        
        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            return ($subdir ? $subdir . '/' : '') . $filename;
        } else {
            error_log("Failed to move uploaded file");
            return false;
        }
    }
    
    private static function generateMemberId() {
        $prefix = 'NCB';
        $year = date('y');
        $random = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        return $prefix . $year . $random;
    }
    
    private static function sendAdminNotification($applicationData) {
        $to = 'admin@ncb-busan.org';
        $subject = 'New Membership Application: ' . $applicationData['full_name'];
        
        $message = "A new membership application has been submitted:\n\n";
        $message .= "Name: " . $applicationData['full_name'] . "\n";
        $message .= "Email: " . $applicationData['email'] . "\n";
        $message .= "Phone: " . $applicationData['phone'] . "\n";
        $message .= "Visa Type: " . $applicationData['visa_type'] . "\n";
        $message .= "Transaction ID: " . $applicationData['transaction_id'] . "\n";
        $message .= "Application ID: " . $applicationData['member_id'] . "\n";
        $message .= "Date: " . $applicationData['application_date'] . "\n";
        
        // For now, just log it
        error_log("Admin notification: " . $message);
    }
}

// Members Service - Updated to work with your database
class MemberService {
    public static function getAll() {
        try {
            $pdo = DatabaseConnection::getPDO();
            $stmt = $pdo->prepare("
                SELECT m.*, cr.committee_type, cr.role_title, cr.start_date, cr.end_date, cr.status, 
                       CASE 
                           WHEN cr.status = 'Active' THEN 'Active'
                           WHEN cr.status = 'Former' THEN 'Former'
                           ELSE 'Unknown'
                       END as committee_status
                FROM members m
                LEFT JOIN committee_roles cr ON m.member_id = cr.member_id
                ORDER BY cr.display_order, m.full_name
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database error in MemberService::getAll: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch members");
        }
    }
}

// Committee Members Service - Updated to work with your database
class CommitteeService {
    public static function getAll() {
        try {
            $pdo = DatabaseConnection::getPDO();
            $stmt = $pdo->prepare("
                SELECT m.*, cr.committee_type, cr.role_title, cr.start_date, cr.end_date, cr.status,
                       CASE 
                           WHEN cr.status = 'Active' THEN 'Active'
                           WHEN cr.status = 'Former' THEN 'Former'
                           ELSE 'Unknown'
                       END as committee_status
                FROM members m
                LEFT JOIN committee_roles cr ON m.member_id = cr.member_id
                ORDER BY cr.display_order, m.full_name
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database error in CommitteeService::getAll: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch committee members");
        }
    }
    
    public static function getById($id) {
        try {
            $pdo = DatabaseConnection::getPDO();
            $stmt = $pdo->prepare("
                SELECT m.*, cr.committee_type, cr.role_title, cr.start_date, cr.end_date, cr.status
                FROM members m
                LEFT JOIN committee_roles cr ON m.member_id = cr.member_id
                WHERE m.member_id = :id AND cr.status = 'Active'
            ");
            $stmt->execute([':id' => $id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database error in CommitteeService::getById: " . $e->getMessage());
            throw new RuntimeException("Failed to fetch committee member");
        }
    }
    
    public static function create($data) {
        $pdo = DatabaseConnection::getPDO();
        
        // Validate required fields
        if (empty($data['name']) || empty($data['position']) || empty($data['committee_type'])) {
            throw new InvalidArgumentException("Name, position, and committee type are required");
        }
        
        // Insert into members table first
        $stmt = $pdo->prepare("
            INSERT INTO members 
            (full_name, email, phone, address, designation, membership_type, joined_date, status, profile_image) 
            VALUES (:name, :email, :phone, :address, :position, :membership_type, :joined_date, :status, :profile_image)
        ");
        
        $stmt->execute([
            ':name' => InputValidator::sanitizeString($data['name']),
            ':email' => InputValidator::sanitizeString($data['email']),
            ':phone' => InputValidator::sanitizeString($data['phone'] ?? ''),
            ':address' => InputValidator::sanitizeString($data['address'] ?? ''),
            ':position' => InputValidator::sanitizeString($data['position']),
            ':membership_type' => InputValidator::sanitizeString($data['membership_type'] ?? 'General'),
            ':joined_date' => $data['joined_date'] ?? date('Y-m-d'),
            ':status' => InputValidator::sanitizeString($data['status'] ?? 'Active'),
            ':profile_image' => InputValidator::sanitizeString($data['profile_image'] ?? '')
        ]);
        
        $memberId = $pdo->lastInsertId();
        
        // Then create committee role
        $roleTitle = $data['position'];
        $committeeType = $data['committee_type'];
        $startDate = $data['start_date'] ?? date('Y-m-d');
        $endDate = $data['end_date'] ?? null;
        
        $stmt = $pdo->prepare("
            INSERT INTO committee_roles (member_id, role_title, committee_type, start_date, end_date, status) 
            VALUES (:member_id, :role_title, :committee_type, :start_date, :end_date, :status)
        ");
        
        $stmt->execute([
            ':member_id' => $memberId,
            ':role_title' => $roleTitle,
            ':committee_type' => $committeeType,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':status' => 'Active'
        ]);
        
        return $memberId;
    }
    
    public static function update($id, $data) {
        $pdo = DatabaseConnection::getPDO();
        
        // Update member information
        $updateFields = [];
        $params = [':id' => $id];
        
        $allowedFields = ['full_name', 'email', 'phone', 'address', 'designation', 'membership_type', 'status'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateFields[] = "$field = :$field";
                $params[":$field"] = InputValidator::sanitizeString($data[$field]);
            }
        }
        
        if (empty($updateFields)) {
            throw new InvalidArgumentException("No valid fields to update");
        }
        
        $sql = "UPDATE members SET " . implode(', ', $updateFields) . " WHERE member_id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Update committee role if provided
        if (isset($data['position'])) {
            $stmt = $pdo->prepare("
                UPDATE committee_roles 
                SET role_title = :position 
                WHERE member_id = :id
            ");
            $stmt->execute([
                ':position' => InputValidator::sanitizeString($data['position']),
                ':id' => $id
            ]);
        }
        
        return $stmt->rowCount();
    }
    
    public static function delete($id) {
        $pdo = DatabaseConnection::getPDO();
        
        // Mark as inactive in members table
        $stmt = $pdo->prepare("UPDATE members SET status = 'Inactive' WHERE member_id = :id");
        $stmt->execute([':id' => $id]);
        
        // Mark as inactive in committee_roles table
        $stmt = $pdo->prepare("UPDATE committee_roles SET status = 'Former' WHERE member_id = :id");
        $stmt->execute([':id' => $id]);
        
        return $stmt->rowCount();
    }
}

// ---- ROUTING ----
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? ($_POST['action'] ?? '');
    // Debug: log incoming request method and action for diagnosis
    $rawInput = file_get_contents('php://input');
    error_log("API Request Debug - Method: " . $method . ", Action: " . ($action ?: '[none]') . ", Query: " . json_encode($_GET) . ", RawBody: " . substr($rawInput, 0, 1000));
    
    // Handle preflight requests
    if ($method === 'OPTIONS') {
        APIResponse::success([], "OK");
    }
    
    switch ($action) {
        case 'gallery':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }
            
            $images = GalleryService::getAll();
            APIResponse::success($images);
            break;
            
        case 'news':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }
            
            $news = NewsService::getAll();
            APIResponse::success($news);
            break;
            
        case 'news_detail':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                APIResponse::error("News ID is required");
            }
            
            $news = NewsService::getById($id);
            APIResponse::success($news);
            break;
            
        case 'committee_members':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }
            
            $members = CommitteeService::getAll();
            APIResponse::success($members);
            break;
            
        case 'committee_member':
            if ($method === 'GET') {
                $id = $_GET['id'] ?? null;
                if (!$id) {
                    APIResponse::error("Member ID is required");
                }
                
                $member = CommitteeService::getById($id);
                APIResponse::success($member);
            } elseif ($method === 'POST') {
                $input = InputValidator::getJsonInput();
                $memberId = CommitteeService::create($input);
                APIResponse::success(['id' => $memberId], "Committee member created successfully");
            } elseif ($method === 'PUT') {
                $id = $_GET['id'] ?? null;
                $input = InputValidator::getJsonInput();
                
                if (!$id) {
                    APIResponse::error("Member ID is required");
                }
                
                $affected = CommitteeService::update($id, $input);
                APIResponse::success(['affected' => $affected], "Committee member updated successfully");
            } elseif ($method === 'DELETE') {
                $id = $_GET['id'] ?? null;
                
                if (!$id) {
                    APIResponse::error("Member ID is required");
                }
                
                $affected = CommitteeService::delete($id);
                APIResponse::success(['affected' => $affected], "Committee member deleted successfully");
            } else {
                APIResponse::error("Method not allowed", 405);
            }
            break;
            
        case 'members':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }
            
            $members = MemberService::getAll();
            APIResponse::success($members);
            break;
            
        case 'events':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }

            // Call EventsService::getAll() but guard against DB/table errors to avoid 500 responses.
            try {
                $events = EventsService::getAll();
                // Ensure we always return an array (even if service returns null)
                if (!is_array($events)) $events = [];
                APIResponse::success($events);
            } catch (Exception $e) {
                // Log the full exception for local debugging
                error_log("Events endpoint error: " . $e->getMessage());
                if (isset($_ENV['APP_DEBUG']) && $_ENV['APP_DEBUG']) {
                    APIResponse::error("Failed to fetch events: " . $e->getMessage(), 500, ['trace' => $e->getTraceAsString()]);
                } else {
                    // Return empty list to the frontend so it can render a friendly message
                    APIResponse::success([], "no events");
                }
            }
            break;
            
        case 'rsvp':
            // Accept POST (production) and GET (temporary debug) so we can diagnose client issues.
            // For GET requests we read parameters from query string.
            if (!in_array($method, ['POST', 'GET'])) {
                APIResponse::error("Method not allowed", 405);
            }

            // Log incoming method and basic request info for debugging
            error_log("RSVP endpoint called. Method: " . $method . ", Query: " . json_encode($_GET));

            if ($method === 'POST') {
                $input = InputValidator::getJsonInput();
            } else {
                // Build input from query parameters for easier debug from browser address bar
                $input = [];
                if (isset($_GET['eventId'])) $input['eventId'] = $_GET['eventId'];
                if (isset($_GET['eventTitle'])) $input['eventTitle'] = $_GET['eventTitle'];
            }

            try {
                $result = EventsService::rsvp($input);
                if (!is_array($result)) $result = ['result' => $result];
                APIResponse::success($result, "RSVP submitted successfully");
            } catch (Exception $e) {
                error_log("RSVP endpoint error: " . $e->getMessage());
                if (isset($_ENV['APP_DEBUG']) && $_ENV['APP_DEBUG']) {
                    APIResponse::error("Failed to submit RSVP: " . $e->getMessage(), 500, ['trace' => $e->getTraceAsString(), 'method' => $method, 'input' => $input]);
                } else {
                    APIResponse::error("Failed to submit RSVP", 500);
                }
            }
            break;
            
        case 'applications':
            if ($method !== 'POST') {
                APIResponse::error("Method not allowed", 405);
            }
            
            // Handle form data and file upload
            $data = $_POST;
            $file = isset($_FILES['payment_screenshot']) ? $_FILES['payment_screenshot'] : null;
            
            $result = MembershipService::createApplication($data, $file);
            APIResponse::success($result, "Application submitted successfully");
            break;
            
        case 'search':
            if ($method !== 'GET') {
                APIResponse::error("Method not allowed", 405);
            }
            
            $query = $_GET['q'] ?? '';
            $results = SearchService::search($query);
            APIResponse::success($results, "Found " . count($results) . " results");
            break;
            
        default:
            APIResponse::error("Unknown action or invalid request", 404);
    }
    
} catch (InvalidArgumentException $e) {
    APIResponse::error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    APIResponse::error($e->getMessage(), 500);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    APIResponse::error("Internal server error", 500);
}

// Utility function
function getBaseUrl() {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    return $protocol . '://' . $host . $path . '/';
}

// Clean up
ob_end_flush();
?>