<?php
// add_user.php
header('Content-Type: text/html; charset=UTF-8');

// Database configuration
$host = 'localhost';
$dbname = 'ncb_db';
$username = 'root';
$password = '';

try {
    // Create PDO connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check if form is submitted
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get form data
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        $email = $_POST['email'] ?? '';
        $role = $_POST['role'] ?? 'User';
        $member_id = $_POST['member_id'] ?? null;
        $status = $_POST['status'] ?? 'Active';
        
        // Validate required fields
        if (empty($username) || empty($password) || empty($email)) {
            $error = "Username, password, and email are required!";
        } else {
            // Hash the password using SHA256 (as per your database)
            $hashed_password = hash('sha256', $password);
            
            // Prepare SQL insert statement
            $sql = "INSERT INTO users (username, password, email, role, member_id, created_at, status) 
                    VALUES (:username, :password, :email, :role, :member_id, NOW(), :status)";
            
            $stmt = $pdo->prepare($sql);
            
            // Bind parameters
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':password', $hashed_password);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':role', $role);
            $stmt->bindParam(':member_id', $member_id, PDO::PARAM_INT);
            $stmt->bindParam(':status', $status);
            
            // Execute the query
            if ($stmt->execute()) {
                $success = "User added successfully!";
                // Clear form data
                $_POST = array();
            } else {
                $error = "Failed to add user!";
            }
        }
    }
} catch (PDOException $e) {
    $error = "Database error: " . $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add User to Database</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <h1>Add User to Database</h1>
    
    <?php if (isset($success)): ?>
        <div class="success"><?php echo htmlspecialchars($success); ?></div>
    <?php endif; ?>
    
    <?php if (isset($error)): ?>
        <div class="error"><?php echo htmlspecialchars($error); ?></div>
    <?php endif; ?>
    
    <form method="POST">
        <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>" required>
        </div>
        
        <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" value="<?php echo htmlspecialchars($_POST['password'] ?? ''); ?>" required>
        </div>
        
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>" required>
        </div>
        
        <div class="form-group">
            <label for="role">Role:</label>
            <select id="role" name="role">
                <option value="User" <?php echo ($_POST['role'] ?? '') === 'User' ? 'selected' : ''; ?>>User</option>
                <option value="Admin" <?php echo ($_POST['role'] ?? '') === 'Admin' ? 'selected' : ''; ?>>Admin</option>
                <option value="Super Admin" <?php echo ($_POST['role'] ?? '') === 'Super Admin' ? 'selected' : ''; ?>>Super Admin</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="member_id">Member ID (optional):</label>
            <input type="number" id="member_id" name="member_id" value="<?php echo htmlspecialchars($_POST['member_id'] ?? ''); ?>">
        </div>
        
        <div class="form-group">
            <label for="status">Status:</label>
            <select id="status" name="status">
                <option value="Active" <?php echo ($_POST['status'] ?? 'Active') === 'Active' ? 'selected' : ''; ?>>Active</option>
                <option value="Suspended" <?php echo ($_POST['status'] ?? '') === 'Suspended' ? 'selected' : ''; ?>>Suspended</option>
                <option value="Deactivated" <?php echo ($_POST['status'] ?? '') === 'Deactivated' ? 'selected' : ''; ?>>Deactivated</option>
            </select>
        </div>
        
        <button type="submit">Add User</button>
    </form>
    
    <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
        <h3>Sample Users (for testing):</h3>
        <ul>
            <li><strong>Super Admin:</strong> superadmin / super123</li>
            <li><strong>Admin:</strong> admin1 / admin123</li>
            <li><strong>User:</strong> user1 / user123</li>
        </ul>
    </div>
</body>
</html>