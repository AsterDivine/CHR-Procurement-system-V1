<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/helpers/response.php
 * =============================================================================
 * 
 * Provides standardized JSON response formatting functions for all PHP endpoints.
 * Response Format: {"success": true|false, "message": "...", "data": ...}
 */

/**
 * Sends a formatted JSON HTTP response and terminates script execution.
 * Used by: sendSuccess() and sendError() in this helper file.
 * Outputs to: Client browser / React fetch() call.
 * Database table affected: None (HTTP output helper).
 *
 * @param bool   $success    Whether the requested operation succeeded.
 * @param string $message    Human-readable explanation of the result.
 * @param mixed  $data       Payload data array or object, or null.
 * @param int    $statusCode HTTP status code (e.g. 200, 400, 404, 500).
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
 * Sends a successful JSON response with HTTP status code 200 (or specified).
 * Used by: All GET, POST, and PUT endpoints across the api/procurements/ directory.
 * Outputs to: Client browser / React fetch() call.
 * Database table affected: None.
 *
 * @param string $message Success message for the frontend.
 * @param mixed  $data    Response payload data.
 * @param int    $statusCode HTTP response code (default 200).
 * @return void
 */
function sendSuccess($message, $data = null, $statusCode = 200) {
    sendJsonResponse(true, $message, $data, $statusCode);
}

/**
 * Sends an error JSON response with HTTP status code 400 (or specified).
 * Used by: All endpoints to report missing fields, invalid IDs, or SQL exceptions.
 * Outputs to: Client browser / React fetch() call.
 * Database table affected: None.
 *
 * @param string $message Error message explaining what went wrong.
 * @param mixed  $data    Optional error details or validation errors.
 * @param int    $statusCode HTTP response code (default 400).
 * @return void
 */
function sendError($message, $data = null, $statusCode = 400) {
    sendJsonResponse(false, $message, $data, $statusCode);
}

/**
 * Extracts and decodes JSON input from the raw HTTP request body (php://input).
 * Falls back to $_POST if request was submitted via form encoding.
 * Used by: create_procurement.php, update_procurement.php, update_status.php,
 * create_bid.php, and select_bid.php.
 * Outputs to: Calling PHP endpoint.
 * Database table affected: None.
 *
 * @return array Associative array of request parameters.
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
