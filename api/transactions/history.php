<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/history.php
 * =============================================================================
 * 
 * Returns the immutable audit history and stage transition trail for a transaction.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$transactionId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$transactionId) {
    sendError('A valid transaction id is required.', null, 422);
}

$pdo = getDBConnection();

// Verify Transaction Exists
$txStmt = $pdo->prepare('SELECT id, control_no FROM procurement_transactions WHERE id = ? LIMIT 1');
$txStmt->execute([$transactionId]);
$tx = $txStmt->fetch();

if (!$tx) {
    sendError('Procurement transaction not found.', null, 404);
}

// Fetch History Entries
$stmt = $pdo->prepare('
    SELECT 
        h.id,
        h.action_type,
        h.old_value,
        h.new_value,
        h.remarks,
        h.performed_by,
        u.full_name AS performed_by_name,
        h.created_at
    FROM transaction_history h
    LEFT JOIN users u ON h.performed_by = u.id
    WHERE h.transaction_id = ?
    ORDER BY h.created_at DESC, h.id DESC
');
$stmt->execute([$transactionId]);
$history = $stmt->fetchAll();

foreach ($history as &$row) {
    $row['id']           = (int)$row['id'];
    $row['performed_by'] = (int)$row['performed_by'];
}
unset($row);

sendSuccess('Transaction audit history retrieved.', [
    'transaction_id' => $transactionId,
    'control_no'     => $tx['control_no'],
    'count'          => count($history),
    'history'        => $history,
]);
