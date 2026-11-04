<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/auth/logout.php
 * =============================================================================
 * 
 * Ends the user session, clears server-side session data,
 * and deletes the PHPSESSID browser cookie.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Accept POST or GET
startSessionIfNeeded();

// 1. Unset all session variables
$_SESSION = [];

// 2. Clear the session cookie in the client browser
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// 3. Destroy session storage on the server
session_destroy();

sendSuccess('Logged out successfully.', null);
