<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/helpers/audit.php
 * =============================================================================
 * 
 * Helper to record administrative and security audit trail logs
 * in the MySQL `audit_logs` table for compliance and defense reporting.
 */

/**
 * Inserts an audit log entry.
 *
 * @param PDO         $pdo        Active PDO database connection
 * @param int|null    $userId     User performing the action (or null if system/unauthenticated)
 * @param string      $action     Action identifier (e.g., 'CREATE_OPPORTUNITY', 'STATUS_CHANGE')
 * @param string      $entityType Entity affected (e.g., 'opportunity', 'bid', 'transaction')
 * @param int|null    $entityId   Primary key ID of the affected entity
 * @param mixed|null  $details    Descriptive details or array (auto-encoded to JSON)
 * @return void
 */
function recordAuditLog($pdo, $userId, $action, $entityType, $entityId = null, $details = null) {
    try {
        $detailsText = is_array($details)
            ? json_encode($details, JSON_UNESCAPED_UNICODE)
            : ($details ? (string)$details : null);

        $stmt = $pdo->prepare('
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ');
        $stmt->execute([
            $userId,
            $action,
            $entityType,
            $entityId,
            $detailsText,
        ]);
    } catch (Exception $e) {
        // Audit logging should not crash the main transaction, but log errors if needed
        error_log('Audit log failure: ' . $e->getMessage());
    }
}
