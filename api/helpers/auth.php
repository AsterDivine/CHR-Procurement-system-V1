<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/helpers/auth.php
 * =============================================================================
 * 
 * Provides session-based authentication helpers, role verification,
 * and user session guards.
 */

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/../config/database.php';

/**
 * Initializes the PHP session with secure cookie parameters if not already active.
 */
function startSessionIfNeeded() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set secure cookie options for localhost testing
        session_set_cookie_params([
            'lifetime' => 0,          // Session cookie expires when browser is closed
            'path'     => '/',
            'domain'   => '',
            'secure'   => false,      // Set to false for standard local HTTP XAMPP
            'httponly' => true,       // Prevents JavaScript access (mitigates XSS)
            'samesite' => 'Lax',      // Allows cross-port cookie transmission in local development
        ]);
        session_start();
    }
}

/**
 * Checks if a client is currently authenticated via PHP session.
 *
 * @return bool
 */
function isLoggedIn() {
    startSessionIfNeeded();
    return !empty($_SESSION['user_id']);
}

/**
 * Returns the currently logged in user ID, or null.
 *
 * @return int|null
 */
function getCurrentUserId() {
    startSessionIfNeeded();
    return $_SESSION['user_id'] ?? null;
}

/**
 * Returns the currently logged in user role ('bidder' or 'chr'), or null.
 *
 * @return string|null
 */
function getCurrentUserRole() {
    startSessionIfNeeded();
    return $_SESSION['user_role'] ?? null;
}

/**
 * Retrieves the full user record for the current session from MySQL.
 * Guaranteed to NEVER expose password_hash.
 *
 * @param PDO|null $pdo
 * @return array|null
 */
function getCurrentUser($pdo = null) {
    if (!isLoggedIn()) {
        return null;
    }

    if ($pdo === null) {
        $pdo = getDBConnection();
    }

    $stmt = $pdo->prepare('
        SELECT id, role, full_name, email, organization_name, contact_number, address, created_at, updated_at
        FROM users
        WHERE id = ?
    ');
    $stmt->execute([getCurrentUserId()]);
    $user = $stmt->fetch();

    return $user ?: null;
}

/**
 * Guard: Requires the user to be logged in.
 * If not authenticated, sends 401 Unauthorized JSON response and stops execution.
 *
 * @return void
 */
function requireLogin() {
    if (!isLoggedIn()) {
        sendError('Authentication required. Please log in to access this resource.', null, 401);
    }
}

/**
 * Guard: Requires the user to be logged in AND have a specific role ('bidder' or 'chr').
 * If role does not match, sends 403 Forbidden JSON response and stops execution.
 *
 * @param string $role 'bidder' or 'chr'
 * @return void
 */
function requireRole($role) {
    requireLogin();

    $currentRole = getCurrentUserRole();
    if ($currentRole !== $role) {
        sendError(
            sprintf('Access forbidden: This action requires "%s" permissions.', $role),
            null,
            403
        );
    }
}

/**
 * Strips password_hash and any other sensitive internal data from a user array.
 *
 * @param array $user
 * @return array
 */
function cleanUserOutput(array $user) {
    unset($user['password_hash']);
    return $user;
}
