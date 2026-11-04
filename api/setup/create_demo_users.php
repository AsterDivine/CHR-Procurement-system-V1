<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * SETUP SCRIPT: CREATE DEMO USERS
 * =============================================================================
 * 
 * ⚠️ WARNING: FOR LOCAL DEMO AND TESTING ONLY!
 * ⚠️ DO NOT DEPLOY OR EXPOSE THIS SCRIPT ON A PRODUCTION SERVER.
 * ⚠️ REMOVE OR DISABLE THIS FILE AFTER INITIAL DATABASE SEEDING.
 * =============================================================================
 */

// Basic error reporting for local development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Standard XAMPP Database Connection Configuration
$host = '127.0.0.1';
$dbname = 'chr_procurement';
$username = 'root';
$password = ''; // Default XAMPP MySQL password is empty
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CHR-CAR Procurement - Demo User Setup</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            padding: 30px;
            line-height: 1.6;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            overflow: hidden;
        }
        .header {
            background-color: #14532d;
            color: #ffffff;
            padding: 20px 24px;
        }
        .header h1 {
            font-size: 18px;
            margin: 0 0 6px 0;
        }
        .content {
            padding: 24px;
        }
        .alert-warning {
            background-color: #fffbeb;
            border-left: 4px solid #b45309;
            color: #78350f;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 13.5px;
            border-radius: 4px;
        }
        .alert-success {
            background-color: #dcfce7;
            border-left: 4px solid #15803d;
            color: #14532d;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 13.5px;
            border-radius: 4px;
        }
        .alert-danger {
            background-color: #fee2e2;
            border-left: 4px solid #b91c1c;
            color: #991b1b;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 13.5px;
            border-radius: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 14px;
        }
        th, td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            text-align: left;
        }
        th {
            background-color: #f1f5f9;
        }
        code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>CHR-CAR Procurement System</h1>
        <p style="margin: 0; font-size: 13px; opacity: 0.9;">Database Demo Account Seeder</p>
    </div>

    <div class="content">
        <div class="alert-warning">
            <strong>LOCAL DEMO ONLY:</strong> This script is designed solely for local development and defense presentation. It creates or resets the two demo accounts. Remove or disable this file once completed.
        </div>

<?php
try {
    // 1. Establish PDO Connection
    $pdo = new PDO($dsn, $username, $password, $options);

    // 2. Define Demo Accounts
    $demoUsers = [
        [
            'role'              => 'chr',
            'full_name'         => 'Maria Santos (Demo CHR Officer)',
            'email'             => 'chr.demo@example.test',
            'password_plain'    => 'Demo1234!',
            'organization_name' => 'Commission on Human Rights - Regional Office CAR',
            'contact_number'    => '(074) 442-1234 / 0917-100-2000',
            'address'           => 'CHR-CAR Regional Office, Baguio City, Benguet',
        ],
        [
            'role'              => 'bidder',
            'full_name'         => 'Juan Dela Cruz (Demo Bidder Rep)',
            'email'             => 'bidder.demo@example.test',
            'password_plain'    => 'Demo1234!',
            'organization_name' => 'Highland IT & General Merchandise Corp.',
            'contact_number'    => '0918-555-7890',
            'address'           => 'Km. 4, La Trinidad, Benguet',
        ],
    ];

    $results = [];

    // Prepared statement for checking existing user by email
    $checkStmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');

    // Prepared statement for inserting new user
    $insertStmt = $pdo->prepare('
        INSERT INTO users (role, full_name, email, password_hash, organization_name, contact_number, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    // Prepared statement for updating existing user password
    $updateStmt = $pdo->prepare('
        UPDATE users 
        SET role = ?, full_name = ?, password_hash = ?, organization_name = ?, contact_number = ?, address = ?, updated_at = NOW()
        WHERE email = ?
    ');

    foreach ($demoUsers as $user) {
        // Securely hash password using PHP's password_hash()
        $hash = password_hash($user['password_plain'], PASSWORD_DEFAULT);

        // Check if user already exists
        $checkStmt->execute([$user['email']]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            // Update existing user
            $updateStmt->execute([
                $user['role'],
                $user['full_name'],
                $hash,
                $user['organization_name'],
                $user['contact_number'],
                $user['address'],
                $user['email'],
            ]);
            $status = 'Updated (Password reset with new hash)';
            $userId = $existing['id'];
        } else {
            // Insert new user
            $insertStmt->execute([
                $user['role'],
                $user['full_name'],
                $user['email'],
                $hash,
                $user['organization_name'],
                $user['contact_number'],
                $user['address'],
            ]);
            $status = 'Created Successfully';
            $userId = $pdo->lastInsertId();
        }

        $results[] = [
            'id'       => $userId,
            'role'     => $user['role'],
            'email'    => $user['email'],
            'password' => $user['password_plain'],
            'status'   => $status,
        ];
    }

    echo '<div class="alert-success"><strong>Success:</strong> Demo accounts were processed into table <code>users</code>!</div>';
    echo '<h3>Demo Credentials for Capstone Defense</h3>';
    echo '<table>';
    echo '<thead><tr><th>User ID</th><th>Role</th><th>Email / Username</th><th>Plain Password</th><th>Database Status</th></tr></thead>';
    echo '<tbody>';
    foreach ($results as $res) {
        echo '<tr>';
        echo '<td>#' . htmlspecialchars($res['id']) . '</td>';
        echo '<td><strong>' . strtoupper(htmlspecialchars($res['role'])) . '</strong></td>';
        echo '<td><code>' . htmlspecialchars($res['email']) . '</code></td>';
        echo '<td><code>' . htmlspecialchars($res['password']) . '</code></td>';
        echo '<td>' . htmlspecialchars($res['status']) . '</td>';
        echo '</tr>';
    }
    echo '</tbody></table>';

} catch (PDOException $e) {
    echo '<div class="alert-danger">';
    echo '<strong>Database Connection Error:</strong> ' . htmlspecialchars($e->getMessage()) . '<br>';
    echo '<p style="margin-top: 8px;">Please verify that:</p>';
    echo '<ul>';
    echo '<li>Apache and MySQL are running in your XAMPP Control Panel.</li>';
    echo '<li>The database <code>chr_procurement</code> has been created by importing <code>database/schema.sql</code>.</li>';
    echo '<li>MySQL user is <code>root</code> with empty password (default XAMPP setting).</li>';
    echo '</ul>';
    echo '</div>';
}
?>

        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Ready to test? Return to the application login screen and use either credential above.
        </p>
    </div>
</div>

</body>
</html>
