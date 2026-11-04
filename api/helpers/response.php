<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/helpers/response.php
 * =============================================================================
 * 
 * Provides standardized JSON response helpers.
 * Format: {"success": true|false, "message": "...", "data": ...}
 */

/**
 * Sends a standardized JSON response and terminates script execution.
 *
 * @param bool   $success    Whether the operation succeeded
 * @param string $message    Human-readable explanation
 * @param mixed  $data       Payload data or null
 * @param int    $statusCode HTTP response code
 * @return void
 */
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'success' => (bool)$success,
        'message' => (string)$message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

/**
 * Sends a successful JSON response (default 200 OK).
 */
function sendSuccess($message, $data = null, $statusCode = 200) {
    sendJsonResponse(true, $message, $data, $statusCode);
}

/**
 * Sends an error JSON response (default 400 Bad Request).
 */
function sendError($message, $data = null, $statusCode = 400) {
    sendJsonResponse(false, $message, $data, $statusCode);
}

/**
 * Parses JSON request body or falls back to $_POST.
 *
 * @return array
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST ?: [];
}
