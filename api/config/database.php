<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/config/database.php
 * =============================================================================
 * 
 * Database connection configuration for the 50% working-system prototype.
 * Uses PHP Data Objects (PDO) with prepared statements for safe SQL execution.
 * Suitable for local development with PHP's built-in server (php -S localhost:8000)
 * or standard XAMPP/MariaDB setups.
 */

// Database credentials
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'chr_procurement');
define('DB_USER', 'root');
define('DB_PASS', ''); // Default XAMPP/local MySQL root password is empty
define('DB_CHARSET', 'utf8mb4');

/**
 * Opens the connection to the CHR procurement MySQL database.
 * Used by: get_procurements.php, get_procurement.php, create_procurement.php,
 * update_procurement.php, update_status.php, create_bid.php, get_bids.php,
 * select_bid.php, get_financial_summary.php, get_history.php, and get_dashboard_summary.php.
 * Connects to: MySQL Database 'chr_procurement'
 * Database tables affected: procurements, procurement_items, bids, transaction_history.
 *
 * @return PDO Active PDO database connection handle.
 */
function connectDatabase() {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            // Throw PDOExceptions on SQL errors for clean error handling
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            // Return records as associative arrays indexed by column name
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Use real prepared statements rather than client emulation
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            // Establish the PDO connection to MySQL
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'data'    => null,
            ]);
            exit;
        }
    }

    return $pdo;
}
