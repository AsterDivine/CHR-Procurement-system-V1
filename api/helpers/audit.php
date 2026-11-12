<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/helpers/audit.php
 * =============================================================================
 * 
 * Helper to record administrative and security audit trail logs
 * in the MySQL `transaction_history` table for compliance and defense reporting.
 * Uses pure PHP MySQLi prepared statements.
 */

/**
 * Inserts a transaction history entry into MySQL.
 *
 * @param mysqli      $conn          Active MySQLi database connection
 * @param int         $procurementId Affected procurement project ID
 * @param string      $action        Action identifier (e.g., 'STATUS_CHANGE', 'BID_SUBMITTED')
 * @param string|null $oldValue      Previous value or status
 * @param string|null $newValue      New value or status
 * @param string|null $remarks       Descriptive narrative
 * @return void
 */
function recordTransactionHistory($conn, $procurementId, $action, $oldValue = null, $newValue = null, $remarks = null) {
    try {
        $stmt = $conn->prepare('
            INSERT INTO transaction_history (procurement_id, action, old_value, new_value, remarks, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ');
        if ($stmt) {
            $stmt->bind_param('issss', $procurementId, $action, $oldValue, $newValue, $remarks);
            $stmt->execute();
            $stmt->close();
        }
    } catch (Exception $e) {
        error_log('Transaction history log failure: ' . $e->getMessage());
    }
}
