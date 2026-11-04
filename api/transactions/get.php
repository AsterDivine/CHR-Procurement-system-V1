<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/get.php
 * =============================================================================
 * 
 * Fetches comprehensive details for a single procurement transaction tracker.
 * Returns:
 * - Transaction master data
 * - Linked Opportunity summary
 * - Selected Bid summary (if awarded)
 * - Budget funding source
 * - Compliance checklist documents
 * - Full stage transition history
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$transactionId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$transactionId) {
    sendError('A valid transaction ID is required.', null, 422);
}

$pdo = getDBConnection();

// 1. Fetch Transaction Master Record
$txStmt = $pdo->prepare('
    SELECT 
        t.id,
        t.control_no,
        t.opportunity_id,
        t.selected_bid_id,
        t.budget_source_id,
        t.expense_category,
        t.abc,
        t.awarded_amount,
        t.savings,
        t.current_stage,
        t.payment_status,
        t.created_by,
        u_creator.full_name AS created_by_name,
        t.created_at,
        t.updated_at
    FROM procurement_transactions t
    LEFT JOIN users u_creator ON t.created_by = u_creator.id
    WHERE t.id = ?
    LIMIT 1
');
$txStmt->execute([$transactionId]);
$transaction = $txStmt->fetch();

if (!$transaction) {
    sendError('Procurement transaction not found.', null, 404);
}

// 2. Fetch Opportunity Summary
$oppStmt = $pdo->prepare('
    SELECT id, reference_no, title, description, procurement_type, abc, deadline, status
    FROM procurement_opportunities
    WHERE id = ?
    LIMIT 1
');
$oppStmt->execute([$transaction['opportunity_id']]);
$opportunity = $oppStmt->fetch();

// 3. Fetch Selected Bid Summary (if linked)
$selectedBid = null;
if ($transaction['selected_bid_id']) {
    $bidStmt = $pdo->prepare('
        SELECT 
            b.id,
            b.bid_amount,
            b.remarks,
            b.status,
            b.submitted_at,
            u.full_name AS bidder_name,
            u.organization_name,
            u.email AS bidder_email,
            u.contact_number AS bidder_phone
        FROM bids b
        JOIN users u ON b.bidder_id = u.id
        WHERE b.id = ?
        LIMIT 1
    ');
    $bidStmt->execute([$transaction['selected_bid_id']]);
    $selectedBid = $bidStmt->fetch();
    if ($selectedBid) {
        $selectedBid['id']         = (int)$selectedBid['id'];
        $selectedBid['bid_amount'] = (float)$selectedBid['bid_amount'];
    }
}

// 4. Fetch Budget Source (if linked)
$budgetSource = null;
if ($transaction['budget_source_id']) {
    $bsStmt = $pdo->prepare('
        SELECT id, name, fiscal_year, allocated_amount, description
        FROM budget_sources
        WHERE id = ?
        LIMIT 1
    ');
    $bsStmt->execute([$transaction['budget_source_id']]);
    $budgetSource = $bsStmt->fetch();
    if ($budgetSource) {
        $budgetSource['id']               = (int)$budgetSource['id'];
        $budgetSource['allocated_amount'] = (float)$budgetSource['allocated_amount'];
    }
}

// 5. Fetch Compliance Documents
$docStmt = $pdo->prepare('
    SELECT 
        d.id,
        d.document_type,
        d.original_name,
        d.stored_name,
        d.file_path,
        d.status,
        d.uploaded_by,
        u.full_name AS uploaded_by_name,
        d.uploaded_at
    FROM transaction_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.transaction_id = ?
    ORDER BY d.uploaded_at DESC
');
$docStmt->execute([$transactionId]);
$documents = $docStmt->fetchAll();

foreach ($documents as &$d) {
    $d['id'] = (int)$d['id'];
}
unset($d);

// 6. Fetch Full Transaction History Log
$histStmt = $pdo->prepare('
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
$histStmt->execute([$transactionId]);
$history = $histStmt->fetchAll();

// Numeric cleanups
$transaction['id']             = (int)$transaction['id'];
$transaction['opportunity_id'] = (int)$transaction['opportunity_id'];
$transaction['abc']            = (float)$transaction['abc'];
$transaction['awarded_amount'] = $transaction['awarded_amount'] !== null ? (float)$transaction['awarded_amount'] : null;
$transaction['savings']        = $transaction['savings'] !== null ? (float)$transaction['savings'] : null;

sendSuccess('Transaction details retrieved.', [
    'transaction'   => $transaction,
    'opportunity'   => $opportunity,
    'selected_bid'  => $selectedBid,
    'budget_source' => $budgetSource,
    'documents'     => $documents,
    'history'       => $history,
]);
