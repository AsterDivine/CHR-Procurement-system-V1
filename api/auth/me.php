<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/auth/me.php
 * =============================================================================
 * 
 * Returns the currently authenticated user's session profile.
 * Used by React on application load to check active login status.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Ensure user is logged in (returns 401 if not)
requireLogin();

// Fetch fresh user profile from MySQL
$pdo = getDBConnection();
$user = getCurrentUser($pdo);

if (!$user) {
    // Session was set but user was removed from database
    startSessionIfNeeded();
    $_SESSION = [];
    session_destroy();
    sendError('User account not found or has been disabled.', null, 401);
}

// Clean sensitive fields
$safeUser = cleanUserOutput($user);

sendSuccess('Authenticated user profile retrieved.', [
    'user' => $safeUser,
]);
