<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/config/cors.php
 * =============================================================================
 * 
 * Handles Cross-Origin Resource Sharing (CORS) and preflight OPTIONS requests.
 * Allows React (running on Vite, typically http://localhost:5173) to securely
 * communicate with the PHP backend on Apache using session cookies.
 */

// List of allowed frontend development origins
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Check if request origin matches our allowed list
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} elseif (empty($origin)) {
    // If request comes from same origin or curl/Postman without origin header
    header('Access-Control-Allow-Origin: http://localhost:5173');
} else {
    // Fallback for custom local ports
    header("Access-Control-Allow-Origin: $origin");
}

// CRITICAL: Allow session cookies (PHPSESSID) to be sent and received across origins
header('Access-Control-Allow-Credentials: true');

// Allowed HTTP methods
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

// Allowed request headers (including Content-Type for JSON payloads)
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Respond to preflight OPTIONS requests immediately and exit
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
