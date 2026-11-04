<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/list.php
 * =============================================================================
 * 
 * Lists all internal procurement transactions along with their current stage,
 * linked opportunity details, budget source, and financial figures.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$pdo = getDBConnection();

// Optional filter by stage or payment status
$stageFilter   = trim($_GET['stage'] ?? '');
$paymentFilter = trim($_GET['payment_status'] ?? '');

$sql = '
    SELECT 
        t.id,
        t.control_no,
        t.opportunity_id,
        o.reference_no AS opportunity_ref,
        o.title AS opportunity_title,
        t.current_stage,
        t.payment_status,
        t.abc,
        t.awarded_amount,
        t.savings,
        t.expense_category,
        t.budget_source_id,
        b_src.name AS budget_source_name,
        t.selected_bid_id,
        u_bidder.full_name AS winning_bidder_name,
        u_bidder.organization_name AS winning_company,
        t.created_at,
        t.updated_at
    FROM procurement_transactions t
    JOIN procurement_opportunities o ON t.opportunity_id = o.id
    LEFT JOIN budget_sources b_src ON t.budget_source_id = b_src.id
    LEFT JOIN bids b ON t.selected_bid_id = b.id
    LEFT JOIN users u_bidder ON b.bidder_id = u_bidder.id
';

$conditions = [];
$params = [];

if (!empty($stageFilter)) {
    $conditions[] = 't.current_stage = ?';
    $params[] = $stageFilter;
}

if (!empty($paymentFilter)) {
    $conditions[] = 't.payment_status = ?';
    $params[] = $paymentFilter;
}

if (!empty($conditions)) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}

$sql .= ' ORDER BY t.created_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$transactions = $stmt->fetchAll();

foreach ($transactions as &$tx) {
    $tx['id']             = (int)$tx['id'];
    $tx['opportunity_id'] = (int)$tx['opportunity_id'];
    $tx['abc']            = (float)$tx['abc'];
    $tx['awarded_amount'] = $tx['awarded_amount'] !== null ? (float)$tx['awarded_amount'] : null;
    $tx['savings']        = $tx['savings'] !== null ? (float)$tx['savings'] : null;
}
unset($tx);

sendSuccess('Procurement transactions list retrieved.', [
    'count'        => count($transactions),
    'transactions' => $transactions,
]);
