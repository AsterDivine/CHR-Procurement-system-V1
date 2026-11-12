<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/config/cors.php
 * =============================================================================
 * 
 * Handles Cross-Origin Resource Sharing (CORS) and HTTP preflight OPTIONS requests.
 * Allows the React frontend (running on Vite, typically http://localhost:3000 or
 * http://localhost:5173) to communicate with pure PHP endpoints running either on
 * PHP's built-in server (php -S localhost:8000) or Apache.
 * Note: Authentication and session cookies are temporarily out of scope for this 50% prototype.
 */

// Allow standard local frontend origins
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Respond to preflight OPTIONS request immediately and exit
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
