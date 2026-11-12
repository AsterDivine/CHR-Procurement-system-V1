<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/config/database.php
 * =============================================================================
 *
 * Pure PHP Database Connection configuration for the 50% working-system prototype.
 * Uses MySQLi (Object-Oriented) with prepared statements.
 * No Laravel, no ORM, no external Composer dependencies.
 *
 * Designed for college capstone defense:
 * - Pure PHP only.
 * - Easy for a student to edit credentials for local XAMPP/WAMP or built-in PHP server.
 * - Simple JSON error responses that do not leak internal system paths.
 */

// Database connection parameters — easy for a student to edit:
$host     = 'localhost';
$username = 'root';
$password = '';
$database = 'chr_procurement';

/**
 * Creates the MySQL database connection used by all PHP API files.
 *
 * Used by:
 * - get_procurements.php
 * - create_procurement.php
 * - update_procurement.php
 * - get_bids.php
 * - create_bid.php
 * - update_status.php
 * - get_procurement.php
 * - select_bid.php
 * - get_financial_summary.php
 * - get_dashboard_summary.php
 * - get_history.php
 *
 * Connects PHP to the centralized chr_procurement MySQL database.
 *
 * @return mysqli Active MySQLi connection object.
 */
function getDbConnection() {
    global $host, $username, $password, $database;

    static $conn = null;

    if ($conn === null) {
        // Suppress default PHP warning with @ to control the JSON error response cleanly
        $conn = @new mysqli($host, $username, $password, $database);

        // Check if connection failed
        if ($conn->connect_error) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please ensure MySQL is running.',
                'data'    => null
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Set utf8mb4 charset to match database collation
        $conn->set_charset('utf8mb4');
    }

    return $conn;
}

/**
 * Backward compatibility alias for any existing code calling connectDatabase().
 *
 * @return mysqli Active MySQLi connection object.
 */
function connectDatabase() {
    return getDbConnection();
}
