<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/auth/login.php
 * =============================================================================
 * 
 * Authenticates users (both Bidder and CHR Personnel) via PDO prepared statements,
 * verifies password hash, initializes session, and regenerates session ID.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

// Read JSON input or form body
$input = getJsonInput();

$email    = trim($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

// Validation
if (empty($email) || empty($password)) {
    sendError('Email and password are required.', null, 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendError('Please enter a valid email address.', null, 422);
}

// Connect to database
$pdo = getDBConnection();

// Fetch user record by email
$stmt = $pdo->prepare('
    SELECT id, role, full_name, email, password_hash, organization_name, contact_number, address
    FROM users
    WHERE email = ?
    LIMIT 1
');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Check if user exists and verify password using PHP's password_verify()
if (!$user || !password_verify($password, $user['password_hash'])) {
    sendError('Invalid email or password.', null, 401);
}

// Successful authentication: Start session and regenerate session ID to prevent session fixation attacks
startSessionIfNeeded();
session_regenerate_id(true);

// Store authenticated identity in session
$_SESSION['user_id']   = (int)$user['id'];
$_SESSION['user_role'] = $user['role'];

// Remove sensitive hash before sending response
$safeUser = cleanUserOutput($user);

sendSuccess('Login successful.', [
    'user' => $safeUser,
]);
