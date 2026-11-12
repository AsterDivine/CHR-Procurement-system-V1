<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_history.php
 * =============================================================================
 * 
 * Retrieves chronological audit trail entries from the transaction_history table.
 * Supports filtering by a single procurement (via query param ?procurement_id=X)
 * or retrieving the global transaction log across all procurement projects.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Loads transaction history logs joined with procurement reference information from MySQL.
 * Used by: React component TransactionHistory.jsx and CHRDashboard.jsx.
 * Connects to: Endpoint /api/procurements/get_history.php?procurement_id=X
 * Database tables affected: Reads from 'transaction_history' and 'procurements'.
 *
 * @param PDO      $pdo           Active database connection.
 * @param int|null $procurementId Optional procurement filter.
 * @return array Array of transaction audit entries.
 */
function fetchTransactionHistoryLogs($pdo, $procurementId = null) {
    $sql = '
        SELECT 
            h.id,
            h.procurement_id,
            h.action,
            h.previous_status,
            h.new_status,
            h.remarks,
            h.performed_by,
            h.created_at,
            p.reference_number AS procurement_reference,
            p.title AS procurement_title
        FROM transaction_history h
        JOIN procurements p ON h.procurement_id = p.id
    ';

    $params = [];
    if ($procurementId) {
        $sql .= ' WHERE h.procurement_id = ? ';
        $params[] = $procurementId;
    }

    $sql .= ' ORDER BY h.created_at DESC, h.id DESC LIMIT 100 ';

    // Queries the transaction_history table
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    foreach ($logs as &$log) {
        $log['id']             = (int)$log['id'];
        $log['procurement_id'] = (int)$log['procurement_id'];
    }
    unset($log);

    return $logs;
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Read optional procurement filter
$procurementId = filter_input(INPUT_GET, 'procurement_id', FILTER_VALIDATE_INT);

// 3. Fetch logs and send JSON response
$logs = fetchTransactionHistoryLogs($pdo, $procurementId);

sendSuccess('Transaction history retrieved successfully.', [
    'count' => count($logs),
    'logs'  => $logs,
]);
