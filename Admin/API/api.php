<?php
// api.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include your existing db.php file
try {
    require_once 'db.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection file not found: ' . $e->getMessage()]);
    exit;
}

// Check if database connection is available
if (!isset($pdo) && !isset($conn)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection not available']);
    exit;
}

// Use whichever database connection variable you have
if (isset($pdo)) {
    $db = $pdo;
} elseif (isset($conn)) {
    $db = $conn;
} else {
    http_response_code(500);
    echo json_encode(['error' => 'No database connection found']);
    exit;
}

// Test the database connection
try {
    $db->query("SELECT 1");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

 $method = $_SERVER['REQUEST_METHOD'];
 $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
 $segments = explode('/', trim($path, '/'));

// Get the endpoint (last segment)
 $endpoint = end($segments);

// Get input data
 $input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $input = [];
}

try {
    switch($endpoint) {
        case 'login':
            handleLogin($method, $input, $db);
            break;
        case 'logout':
            handleLogout($method, $db);
            break;
        case 'notices':
            handleNotices($method, $input, $db);
            break;
        case 'events':
            handleEvents($method, $input, $db);
            break;
        case 'members':
            handleMembers($method, $input, $db);
            break;
        case 'admins': // Handle admins endpoint
            handleAdmins($method, $input, $db);
            break;
        case 'payments': // Handle payments endpoint
            handlePayments($method, $input, $db);
            break;
        case 'users':
            handleUsers($method, $input, $db);
            break;
        case 'gallery':
            handleGallery($method, $input, $db);
            break;
        case 'committee':
            handleCommittee($method, $input, $db);
            break;
        case 'dashboard':
            handleDashboard($method, $db);
            break;
        case 'membership-applications':
            handleMembershipApplications($method, $input, $db);
            break;
        case 'banners':
            handleBanners($method, $input, $db);
            break;
        case 'activity-logs':
            handleActivityLogs($method, $input, $db);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found: ' . $endpoint]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

function handleLogin($method, $input, $db) {
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }

    if (!isset($input['email']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        return;
    }

    $email = $input['email'];
    $password = $input['password'];

    try {
        $stmt = $db->prepare("
            SELECT u.*, m.full_name, m.member_id 
            FROM users u 
            LEFT JOIN members m ON u.member_id = m.member_id 
            WHERE u.email = ? AND u.status = 'Active'
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $hashedInput = hash('sha256', $password);
            
            if ($user['password'] === $hashedInput) {
                $sessionToken = bin2hex(random_bytes(32));
                $sessionData = [
                    'token' => $sessionToken,
                    'user_id' => $user['user_id'],
                    'email' => $user['email'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'member_id' => $user['member_id'],
                    'full_name' => $user['full_name'],
                    'expires' => time() + (24 * 60 * 60)
                ];

                // Create sessions table if not exists
                createSessionsTable($db);
                $stmt = $db->prepare("
                    INSERT INTO user_sessions (token, user_id, session_data, expires_at) 
                    VALUES (?, ?, ?, FROM_UNIXTIME(?))
                ");
                $stmt->execute([$sessionToken, $user['user_id'], json_encode($sessionData), $sessionData['expires']]);

                // Update last login
                $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
                $stmt->execute([$user['user_id']]);

                // Log activity
                logActivity($user['user_id'], "User logged in", $db);

                unset($user['password']);
                echo json_encode([
                    'success' => true,
                    'message' => 'Login successful',
                    'token' => $sessionToken,
                    'user' => $user
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Invalid email or password']);
            }
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid email or password']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleLogout($method, $db) {
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }

    $token = getBearerToken();
    
    if ($token) {
        try {
            $stmt = $db->prepare("DELETE FROM user_sessions WHERE token = ?");
            $stmt->execute([$token]);
        } catch (PDOException $e) {
            // Continue with logout even if error
        }
    }

    echo json_encode(['success' => true, 'message' => 'Logout successful']);
}

function handleNotices($method, $input, $db) {
    try {
        switch($method) {
            case 'GET':
                // First check if notices table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM notices LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createNoticesTable($db);
                }
                
                $stmt = $db->query("
                    SELECT n.*, u.username as created_by_name 
                    FROM notices n 
                    LEFT JOIN users u ON n.created_by = u.user_id 
                    WHERE n.status = 'Published'
                    ORDER BY n.created_at DESC
                ");
                $notices = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($notices);
                break;
                
            case 'POST':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                // Make sure table exists
                createNoticesTable($db);

                $stmt = $db->prepare("
                    INSERT INTO notices (title, content, created_by, status, created_at) 
                    VALUES (?, ?, ?, 'Published', NOW())
                ");
                $stmt->execute([$input['title'], $input['content'], $session['user_id']]);
                
                $noticeId = $db->lastInsertId();
                
                $stmt = $db->prepare("
                    SELECT n.*, u.username as created_by_name 
                    FROM notices n 
                    LEFT JOIN users u ON n.created_by = u.user_id 
                    WHERE n.notice_id = ?
                ");
                $stmt->execute([$noticeId]);
                $newNotice = $stmt->fetch(PDO::FETCH_ASSOC);
                
                logActivity($session['user_id'], "Created notice: " . $input['title'], $db);
                echo json_encode($newNotice);
                break;
                
            case 'DELETE':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                if (!isset($input['notice_id'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Notice ID is required']);
                    return;
                }

                $stmt = $db->prepare("DELETE FROM notices WHERE notice_id = ?");
                $stmt->execute([$input['notice_id']]);
                
                if ($stmt->rowCount() > 0) {
                    logActivity($session['user_id'], "Deleted notice ID: " . $input['notice_id'], $db);
                    echo json_encode(['success' => true, 'message' => 'Notice deleted successfully']);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Notice not found']);
                }
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in notices: ' . $e->getMessage()]);
    }
}

function handleEvents($method, $input, $db) {
    try {
        switch($method) {
            case 'GET':
                // First check if events table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM events LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createEventsTable($db);
                }
                
                $stmt = $db->query("
                    SELECT e.*, m.full_name as organized_by_name 
                    FROM events e 
                    LEFT JOIN members m ON e.organized_by = m.member_id 
                    ORDER BY e.start_date DESC
                ");
                $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($events);
                break;
                
            case 'POST':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                // Make sure table exists
                createEventsTable($db);

                $stmt = $db->prepare("
                    INSERT INTO events (title, description, location, start_date, end_date, organized_by, status) 
                    VALUES (?, ?, ?, ?, ?, ?, 'Upcoming')
                ");
                $stmt->execute([
                    $input['title'] ?? $input['name'],
                    $input['description'] ?? '',
                    $input['location'],
                    $input['start_date'] ?? ($input['date'] . ' ' . ($input['time'] ?? '00:00:00')),
                    $input['end_date'] ?? ($input['date'] . ' ' . ($input['time'] ?? '23:59:59')),
                    $input['organized_by'] ?? $session['member_id']
                ]);
                
                $eventId = $db->lastInsertId();
                
                $stmt = $db->prepare("
                    SELECT e.*, m.full_name as organized_by_name 
                    FROM events e 
                    LEFT JOIN members m ON e.organized_by = m.member_id 
                    WHERE e.event_id = ?
                ");
                $stmt->execute([$eventId]);
                $newEvent = $stmt->fetch(PDO::FETCH_ASSOC);
                
                logActivity($session['user_id'], "Created event: " . ($input['title'] ?? $input['name']), $db);
                echo json_encode($newEvent);
                break;
                
            case 'DELETE':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                if (!isset($input['event_id'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Event ID is required']);
                    return;
                }

                $stmt = $db->prepare("DELETE FROM events WHERE event_id = ?");
                $stmt->execute([$input['event_id']]);
                
                if ($stmt->rowCount() > 0) {
                    logActivity($session['user_id'], "Deleted event ID: " . $input['event_id'], $db);
                    echo json_encode(['success' => true, 'message' => 'Event deleted successfully']);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Event not found']);
                }
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in events: ' . $e->getMessage()]);
    }
}

// Add missing handlers for admins and payments
function handleAdmins($method, $input, $db) {
    try {
        switch($method) {
            case 'GET':
                // First check if users table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM users LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createUsersTable($db);
                }
                
                // Return users with admin roles
                $stmt = $db->query("
                    SELECT u.user_id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
                           m.full_name, m.member_id
                    FROM users u 
                    LEFT JOIN members m ON u.member_id = m.member_id 
                    WHERE u.role IN ('Admin', 'Super Admin')
                    ORDER BY u.created_at DESC
                ");
                $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($admins);
                break;
                
            case 'POST':
                $session = validateSession($db);
                if (!$session || $session['role'] !== 'Super Admin') {
                    http_response_code(403);
                    echo json_encode(['error' => 'Forbidden - Only Super Admin can create admins']);
                    return;
                }

                // Make sure tables exist
                createUsersTable($db);
                createMembersTable($db);

                // First create or update member record
                if (isset($input['member_id'])) {
                    // Using existing member
                    $memberId = $input['member_id'];
                } else {
                    // Create new member
                    $stmt = $db->prepare("
                        INSERT INTO members (full_name, email, phone, address, designation, joined_date, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $input['full_name'],
                        $input['email'],
                        $input['phone'] ?? '',
                        $input['address'] ?? '',
                        $input['designation'] ?? '',
                        date('Y-m-d'),
                        'Active'
                    ]);
                    $memberId = $db->lastInsertId();
                }

                // Create user account
                $hashedPassword = hash('sha256', $input['password']);
                $stmt = $db->prepare("
                    INSERT INTO users (username, email, password, role, member_id, status) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $input['username'],
                    $input['email'],
                    $hashedPassword,
                    $input['role'] ?? 'Admin',
                    $memberId,
                    'Active'
                ]);
                
                $userId = $db->lastInsertId();
                
                $stmt = $db->prepare("
                    SELECT u.user_id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
                           m.full_name, m.member_id
                    FROM users u 
                    LEFT JOIN members m ON u.member_id = m.member_id 
                    WHERE u.user_id = ?
                ");
                $stmt->execute([$userId]);
                $newAdmin = $stmt->fetch(PDO::FETCH_ASSOC);
                
                logActivity($session['user_id'], "Created admin: " . $input['username'], $db);
                echo json_encode($newAdmin);
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in admins: ' . $e->getMessage()]);
    }
}

function handlePayments($method, $input, $db) {
    try {
        switch($method) {
            case 'GET':
                // Create payments table if it doesn't exist
                createPaymentsTable($db);
                
                // Return empty array for now since table is empty
                echo json_encode([]);
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in payments: ' . $e->getMessage()]);
    }
}

function handleMembers($method, $input, $db) {
    try {
        switch($method) {
            case 'GET':
                // First check if members table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM members LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createMembersTable($db);
                }
                
                $stmt = $db->query("
                    SELECT * FROM members 
                    WHERE status = 'Active'
                    ORDER BY joined_date DESC
                ");
                $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($members);
                break;
                
            case 'POST':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                // Make sure table exists
                createMembersTable($db);

                $stmt = $db->prepare("
                    INSERT INTO members (full_name, email, phone, address, designation, membership_type, joined_date, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $input['full_name'],
                    $input['email'],
                    $input['phone'] ?? '',
                    $input['address'] ?? '',
                    $input['designation'] ?? '',
                    $input['membership_type'] ?? 'General',
                    $input['joined_date'] ?? date('Y-m-d'),
                    $input['status'] ?? 'Active'
                ]);
                
                $memberId = $db->lastInsertId();
                $stmt = $db->prepare("SELECT * FROM members WHERE member_id = ?");
                $stmt->execute([$memberId]);
                $newMember = $stmt->fetch(PDO::FETCH_ASSOC);
                
                logActivity($session['user_id'], "Created member: " . $input['full_name'], $db);
                echo json_encode($newMember);
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in members: ' . $e->getMessage()]);
    }
}

function handleUsers($method, $input, $db) {
    $session = validateSession($db);
    if (!$session || ($session['role'] !== 'Super Admin' && $session['role'] !== 'Admin')) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden - Insufficient permissions']);
        return;
    }
    
    try {
        switch($method) {
            case 'GET':
                // First check if users table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM users LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createUsersTable($db);
                }
                
                $stmt = $db->query("
                    SELECT u.user_id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
                           m.full_name, m.member_id
                    FROM users u 
                    LEFT JOIN members m ON u.member_id = m.member_id 
                    ORDER BY u.created_at DESC
                ");
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($users);
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in users: ' . $e->getMessage()]);
    }
}

function handleGallery($method, $input, $db) {
    require_once 'upload_helper.php';
    
    try {
        switch($method) {
            case 'GET':
                // First check if image_gallery table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM image_gallery LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createGalleryTable($db);
                }
                
                $stmt = $db->query("
                    SELECT g.*, u.username as uploaded_by_name, 
                           e.title as event_title, m.full_name as member_name
                    FROM image_gallery g 
                    LEFT JOIN users u ON g.uploaded_by = u.user_id 
                    LEFT JOIN events e ON g.related_event = e.event_id 
                    LEFT JOIN members m ON g.related_member = m.member_id 
                    ORDER BY g.uploaded_at DESC
                ");
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($images);
                break;
                
            case 'POST':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                // Check if file was uploaded
                if (!isset($_FILES['image'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No image file uploaded']);
                    return;
                }

                // Handle file upload
                $uploadPath = handleFileUpload($_FILES['image'], '../../assets/Images/gallery');
                $imgpath = 'assets/Images/gallery/' . basename($uploadPath);
                if (!$uploadPath) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to upload image']);
                    return;
                }

                // Make sure table exists
                createGalleryTable($db);

                // Get form data
                $title = $_POST['title'] ?? '';
                $description = $_POST['description'] ?? '';
                $eventId = isset($_POST['event_id']) && $_POST['event_id'] !== '' ? $_POST['event_id'] : null;

                $stmt = $db->prepare("
                    INSERT INTO image_gallery (title, description, image_path, uploaded_by, uploaded_at, related_event) 
                    VALUES (?, ?, ?, ?, NOW(), ?)
                ");
                $stmt->execute([
                    $title,
                    $description,
                    $imgpath,
                    $session['user_id'],
                    $eventId
                ]);
                
                $imageId = $db->lastInsertId();
                
                $stmt = $db->prepare("
                    SELECT g.*, u.username as uploaded_by_name, 
                           e.title as event_title, m.full_name as member_name
                    FROM image_gallery g 
                    LEFT JOIN users u ON g.uploaded_by = u.user_id 
                    LEFT JOIN events e ON g.related_event = e.event_id 
                    LEFT JOIN members m ON g.related_member = m.member_id 
                    WHERE g.image_id = ?
                ");
                $stmt->execute([$imageId]);
                $newImage = $stmt->fetch(PDO::FETCH_ASSOC);
                
                logActivity($session['user_id'], "Uploaded gallery image: " . ($title ?: 'Untitled'), $db);
                echo json_encode(['success' => true, 'data' => $newImage]);
                break;
                
            case 'DELETE':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                if (!isset($input['image_id'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Image ID is required']);
                    return;
                }

                $stmt = $db->prepare("DELETE FROM image_gallery WHERE image_id = ?");
                $stmt->execute([$input['image_id']]);
                
                if ($stmt->rowCount() > 0) {
                    logActivity($session['user_id'], "Deleted gallery image ID: " . $input['image_id'], $db);
                    echo json_encode(['success' => true, 'message' => 'Image deleted successfully']);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Image not found']);
                }
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in gallery: ' . $e->getMessage()]);
    }
}

function handleCommittee($method, $input, $db) {
    try {
        switch($method) {
            case 'GET':
                // First check if committee_roles table exists
                try {
                    $stmt = $db->query("SELECT 1 FROM committee_roles LIMIT 1");
                } catch (PDOException $e) {
                    // Table doesn't exist, create it
                    createCommitteeTable($db);
                }
                
                $stmt = $db->query("
                    SELECT c.*, m.full_name, m.email, m.phone, m.designation, m.profile_image
                    FROM committee_roles c 
                    JOIN members m ON c.member_id = m.member_id 
                    WHERE c.status = 'Active'
                    ORDER BY 
                        CASE c.committee_type 
                            WHEN 'Founder' THEN 1
                            WHEN 'Executive' THEN 2
                            WHEN 'Associate' THEN 3
                            ELSE 4
                        END,
                        c.role_title
                ");
                $committee = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($committee);
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in committee: ' . $e->getMessage()]);
    }
}

function handleDashboard($method, $db) {
    $session = validateSession($db);
    if (!$session) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized - Please login']);
        return;
    }

    try {
        $stats = [];
        
        // Check if tables exist before querying
        $tablesExist = true;
        
        try {
            $db->query("SELECT 1 FROM members LIMIT 1");
        } catch (PDOException $e) {
            createMembersTable($db);
            $tablesExist = false;
        }
        
        try {
            $db->query("SELECT 1 FROM events LIMIT 1");
        } catch (PDOException $e) {
            createEventsTable($db);
            $tablesExist = false;
        }
        
        try {
            $db->query("SELECT 1 FROM notices LIMIT 1");
        } catch (PDOException $e) {
            createNoticesTable($db);
            $tablesExist = false;
        }
        
        try {
            $db->query("SELECT 1 FROM activity_logs LIMIT 1");
        } catch (PDOException $e) {
            createActivityLogsTable($db);
            $tablesExist = false;
        }
        
        if ($tablesExist) {
            $stmt = $db->query("SELECT COUNT(*) as total_members FROM members WHERE status = 'Active'");
            $stats['total_members'] = $stmt->fetch(PDO::FETCH_ASSOC)['total_members'];
            
            $stmt = $db->query("SELECT COUNT(*) as total_events FROM events");
            $stats['total_events'] = $stmt->fetch(PDO::FETCH_ASSOC)['total_events'];
            
            $stmt = $db->query("SELECT COUNT(*) as total_notices FROM notices WHERE status = 'Published'");
            $stats['total_notices'] = $stmt->fetch(PDO::FETCH_ASSOC)['total_notices'];
            
            $stmt = $db->query("
                SELECT a.*, u.username 
                FROM activity_logs a 
                LEFT JOIN users u ON a.user_id = u.user_id 
                ORDER BY a.timestamp DESC 
                LIMIT 10
            ");
            $stats['recent_activities'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $stmt = $db->query("
                SELECT * FROM events 
                WHERE start_date > NOW() AND status = 'Upcoming'
                ORDER BY start_date ASC 
                LIMIT 5
            ");
            $stats['upcoming_events'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // Return empty stats if tables don't exist
            $stats = [
                'total_members' => 0,
                'total_events' => 0,
                'total_notices' => 0,
                'recent_activities' => [],
                'upcoming_events' => []
            ];
        }
        
        echo json_encode($stats);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in dashboard: ' . $e->getMessage()]);
    }
}

// Helper functions
function getBearerToken() {
    $headers = getallheaders();
    
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function validateSession($db) {
    $token = getBearerToken();
    
    if (!$token) {
        return false;
    }

    try {
        // Make sure sessions table exists
        createSessionsTable($db);
        
        $stmt = $db->prepare("
            SELECT session_data FROM user_sessions 
            WHERE token = ? AND expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($session) {
            return json_decode($session['session_data'], true);
        }
    } catch (PDOException $e) {
        return false;
    }
    
    return false;
}

function logActivity($user_id, $action, $db) {
    try {
        // Make sure activity_logs table exists
        createActivityLogsTable($db);
        
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        $stmt = $db->prepare("
            INSERT INTO activity_logs (user_id, action, timestamp, ip_address) 
            VALUES (?, ?, NOW(), ?)
        ");
        $stmt->execute([$user_id, $action, $ip_address]);
    } catch (PDOException $e) {
        // Silently fail for activity logging
    }
}

function createSessionsTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_id INT AUTO_INCREMENT PRIMARY KEY,
                token VARCHAR(64) UNIQUE,
                user_id INT,
                session_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createActivityLogsTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS activity_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createMembersTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS members (
                member_id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(50),
                address TEXT,
                designation VARCHAR(100),
                membership_type VARCHAR(50) DEFAULT 'General',
                profile_image VARCHAR(255),
                joined_date DATE,
                status ENUM('Active', 'Inactive') DEFAULT 'Active'
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createUsersTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('Super Admin', 'Admin', 'Member') DEFAULT 'Member',
                member_id INT,
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createNoticesTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS notices (
                notice_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                created_by INT,
                status ENUM('Published', 'Draft') DEFAULT 'Draft',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createEventsTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS events (
                event_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                location VARCHAR(255),
                start_date DATETIME,
                end_date DATETIME,
                organized_by INT,
                status ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Upcoming',
                FOREIGN KEY (organized_by) REFERENCES members(member_id) ON DELETE SET NULL
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createGalleryTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS image_gallery (
                image_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255),
                description TEXT,
                image_path VARCHAR(255) NOT NULL,
                uploaded_by INT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                related_event INT,
                related_member INT,
                FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL,
                FOREIGN KEY (related_event) REFERENCES events(event_id) ON DELETE SET NULL,
                FOREIGN KEY (related_member) REFERENCES members(member_id) ON DELETE SET NULL
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createCommitteeTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS committee_roles (
                role_id INT AUTO_INCREMENT PRIMARY KEY,
                member_id INT NOT NULL,
                role_title VARCHAR(100) NOT NULL,
                committee_type ENUM('Founder', 'Executive', 'Associate') DEFAULT 'Associate',
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createPaymentsTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS payments (
                payment_id INT AUTO_INCREMENT PRIMARY KEY,
                member_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_date DATE,
                payment_method VARCHAR(50),
                payment_type VARCHAR(50),
                description TEXT,
                status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
                FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function handleMembershipApplications($method, $input, $db) {
    try {
        // First check if membership_applications table exists
        try {
            $db->query("SELECT 1 FROM membership_applications LIMIT 1");
        } catch (PDOException $e) {
            // Table doesn't exist, create it
            createMembershipApplicationsTable($db);
        }
        
        switch($method) {
            case 'GET':
                $stmt = $db->query("
                    SELECT * FROM membership_applications 
                    ORDER BY application_date DESC
                ");
                $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($applications);
                break;
                
            case 'POST':
                // No authentication required for public applications
                $stmt = $db->prepare("
                    INSERT INTO membership_applications 
                    (full_name, email, phone, address, designation, membership_type, application_date, status, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW(), 'pending', ?)
                ");
                $stmt->execute([
                    $input['full_name'],
                    $input['email'],
                    $input['phone'] ?? '',
                    $input['address'] ?? '',
                    $input['designation'] ?? '',
                    $input['membership_type'] ?? 'General',
                    $input['notes'] ?? ''
                ]);
                
                $applicationId = $db->lastInsertId();
                $stmt = $db->prepare("SELECT * FROM membership_applications WHERE id = ?");
                $stmt->execute([$applicationId]);
                $newApplication = $stmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode($newApplication);
                break;
                
            case 'PUT':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                if (!isset($input['application_id'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Application ID is required']);
                    return;
                }

                // Update application status
                $stmt = $db->prepare("
                    UPDATE membership_applications 
                    SET status = ?, notes = COALESCE(?, notes) 
                    WHERE application_id = ?
                ");
                $stmt->execute([
                    $input['status'],
                    $input['notes'] ?? null,
                    $input['application_id']
                ]);
                
                if ($stmt->rowCount() > 0) {
                    $stmt = $db->prepare("SELECT * FROM membership_applications WHERE application_id = ?");
                    $stmt->execute([$input['application_id']]);
                    $updatedApplication = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    logActivity($session['user_id'], "Updated application status to: " . $input['status'], $db);
                    echo json_encode($updatedApplication);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Application not found']);
                }
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in membership applications: ' . $e->getMessage()]);
    }
}

function handleBanners($method, $input, $db) {
    try {
        // First check if banners table exists
        try {
            $db->query("SELECT 1 FROM banners LIMIT 1");
        } catch (PDOException $e) {
            // Table doesn't exist, create it
            createBannersTable($db);
        }
        
        switch($method) {
            case 'GET':
                $stmt = $db->query("
                    SELECT b.*, u.username as uploaded_by_name 
                    FROM banners b 
                    LEFT JOIN users u ON b.uploaded_by = u.user_id 
                    ORDER BY b.uploaded_at DESC
                ");
                $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($banners);
                break;
                
            case 'POST':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                // Check if file was uploaded
                if (!isset($_FILES['image'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No banner image uploaded']);
                    return;
                }

                // Handle file upload
                $uploadPath = handleFileUpload($_FILES['image'], '../assests/Images/banners');
                if (!$uploadPath) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to upload banner']);
                    return;
                }

                $stmt = $db->prepare("
                    INSERT INTO banners (title, image_path, status, uploaded_by, uploaded_at) 
                    VALUES (?, ?, ?, ?, NOW())
                ");
                $stmt->execute([
                    $_POST['title'] ?? 'New Banner',
                    $uploadPath,
                    $_POST['status'] ?? 'inactive',
                    $session['user_id']
                ]);
                
                $bannerId = $db->lastInsertId();
                $stmt = $db->prepare("
                    SELECT b.*, u.username as uploaded_by_name 
                    FROM banners b 
                    LEFT JOIN users u ON b.uploaded_by = u.user_id 
                    WHERE b.banner_id = ?
                ");
                $stmt->execute([$bannerId]);
                $newBanner = $stmt->fetch(PDO::FETCH_ASSOC);
                
                logActivity($session['user_id'], "Uploaded banner: " . $input['title'], $db);
                echo json_encode($newBanner);
                break;
                
            case 'PUT':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                if (!isset($input['banner_id'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Banner ID is required']);
                    return;
                }

                // If setting banner as active, deactivate all other banners first
                if (isset($input['status']) && $input['status'] === 'active') {
                    $stmt = $db->prepare("UPDATE banners SET status = 'inactive' WHERE status = 'active'");
                    $stmt->execute();
                }

                $stmt = $db->prepare("
                    UPDATE banners 
                    SET title = COALESCE(?, title), 
                        image_path = COALESCE(?, image_path), 
                        status = COALESCE(?, status) 
                    WHERE banner_id = ?
                ");
                $stmt->execute([
                    $input['title'] ?? null,
                    $input['image_path'] ?? null,
                    $input['status'] ?? null,
                    $input['banner_id']
                ]);
                
                if ($stmt->rowCount() > 0) {
                    $stmt = $db->prepare("
                        SELECT b.*, u.username as uploaded_by_name 
                        FROM banners b 
                        LEFT JOIN users u ON b.uploaded_by = u.user_id 
                        WHERE b.banner_id = ?
                    ");
                    $stmt->execute([$input['banner_id']]);
                    $updatedBanner = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    logActivity($session['user_id'], "Updated banner: " . ($input['title'] ?? 'ID: ' . $input['banner_id']), $db);
                    echo json_encode($updatedBanner);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Banner not found']);
                }
                break;
                
            case 'DELETE':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                if (!isset($input['banner_id'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Banner ID is required']);
                    return;
                }

                $stmt = $db->prepare("DELETE FROM banners WHERE banner_id = ?");
                $stmt->execute([$input['banner_id']]);
                
                if ($stmt->rowCount() > 0) {
                    logActivity($session['user_id'], "Deleted banner ID: " . $input['banner_id'], $db);
                    echo json_encode(['success' => true, 'message' => 'Banner deleted successfully']);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Banner not found']);
                }
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in banners: ' . $e->getMessage()]);
    }
}

function handleActivityLogs($method, $input, $db) {
    try {
        // First check if activity_logs table exists
        try {
            $db->query("SELECT 1 FROM activity_logs LIMIT 1");
        } catch (PDOException $e) {
            // Table doesn't exist, create it
            createActivityLogsTable($db);
        }
        
        switch($method) {
            case 'GET':
                $session = validateSession($db);
                if (!$session) {
                    http_response_code(401);
                    echo json_encode(['error' => 'Unauthorized']);
                    return;
                }

                // Optional filters
                $user_id = $input['user_id'] ?? null;
                $limit = $input['limit'] ?? 100;
                $offset = $input['offset'] ?? 0;
                
                $query = "
                    SELECT a.*, u.username 
                    FROM activity_logs a 
                    LEFT JOIN users u ON a.user_id = u.user_id 
                ";
                $params = [];
                
                if ($user_id) {
                    $query .= " WHERE a.user_id = ?";
                    $params[] = $user_id;
                }
                
                $query .= " ORDER BY a.timestamp DESC LIMIT ? OFFSET ?";
                $params[] = (int)$limit;
                $params[] = (int)$offset;
                
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode($logs);
                break;
                
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error in activity logs: ' . $e->getMessage()]);
    }
}

// Add these table creation functions after the existing table creation functions

function createMembershipApplicationsTable($db) {
    try {
        $db->exec("
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
            ) 
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

function createBannersTable($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS banners (
                banner_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'inactive',
                uploaded_by INT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}
?>