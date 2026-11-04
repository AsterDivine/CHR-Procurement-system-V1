<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/auth/register_bidder.php
 * =============================================================================
 * 
 * Registers prospective suppliers into the system.
 * Security Rules:
 * - Strictly enforces role = 'bidder' (no public CHR account creation).
 * - Hashes password using password_hash().
 * - Rejects duplicate emails.
 * - Never returns password_hash.
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

$fullName         = trim($input['full_name'] ?? '');
$organizationName = trim($input['organization_name'] ?? '');
$email            = trim($input['email'] ?? '');
$password         = (string)($input['password'] ?? '');
$contactNumber    = trim($input['contact_number'] ?? '');
$address          = trim($input['address'] ?? '');

// 1. Mandatory Input Validation
if (empty($fullName)) {
    sendError('Full name is required.', null, 422);
}

if (empty($organizationName)) {
    sendError('Organization / Company name is required for bidder registration.', null, 422);
}

if (empty($email)) {
    sendError('Email address is required.', null, 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendError('Please provide a valid email address.', null, 422);
}

if (strlen($password) < 8) {
    sendError('Password must be at least 8 characters long.', null, 422);
}

// Connect to database
$pdo = getDBConnection();

// 2. Reject Duplicate Email Addresses
$checkStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$checkStmt->execute([$email]);

if ($checkStmt->fetch()) {
    sendError('An account with this email address already exists.', null, 409);
}

// 3. Hash Password Securely with bcrypt
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// 4. Insert User — STRICTLY enforcing role='bidder'
$insertStmt = $pdo->prepare('
    INSERT INTO users (
        role,
        full_name,
        email,
        password_hash,
        organization_name,
        contact_number,
        address
    ) VALUES (
        "bidder",
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
    )
');

$insertStmt->execute([
    $fullName,
    $email,
    $passwordHash,
    $organizationName,
    $contactNumber ?: null,
    $address ?: null,
]);

$newUserId = (int)$pdo->lastInsertId();

// Automatically start session for the registered bidder
startSessionIfNeeded();
session_regenerate_id(true);

$_SESSION['user_id']   = $newUserId;
$_SESSION['user_role'] = 'bidder';

// 5. Return Clean User Data (Never expose password_hash)
$safeUser = [
    'id'                => $newUserId,
    'role'              => 'bidder',
    'full_name'         => $fullName,
    'email'             => $email,
    'organization_name' => $organizationName,
    'contact_number'    => $contactNumber,
    'address'           => $address,
];

sendSuccess('Bidder registration successful.', [
    'user' => $safeUser,
], 201);
