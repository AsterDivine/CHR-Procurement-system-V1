<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/config/database.php
 * =============================================================================
 * 
 * Provides a secure, single PDO connection to the MySQL database.
 * Designed for standard local XAMPP / MariaDB environments.
 */

// Database credentials for XAMPP
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'chr_procurement');
define('DB_USER', 'root');
define('DB_PASS', ''); // Default XAMPP MySQL root password is empty
define('DB_CHARSET', 'utf8mb4');

/**
 * Returns a configured PDO database connection instance.
 *
 * @return PDO
 */
function getDBConnection() {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            // Throw exceptions on SQL errors for reliable error handling
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            // Return query results as associative arrays by default
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Disable emulated prepared statements to use real prepared statements
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // In development, display error; in production, log and show generic error
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
