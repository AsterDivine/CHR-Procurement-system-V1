<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/search/global_search.php
 * =============================================================================
 * 
 * Provides unified cross-module search for CHR Personnel across:
 * - Opportunity Reference Number & Project Title
 * - Transaction Control Number
 * - Registered Bidder Organization & Representative Names
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$query = trim($_GET['q'] ?? '');

if (strlen($query) < 2) {
    sendError('Please enter at least 2 characters for search.', null, 422);
}

$pdo = getDBConnection();
$searchTerm = '%' . $query . '%';

// 1. Search Procurement Opportunities (by reference_no or title)
$oppStmt = $pdo->prepare('
    SELECT id, reference_no, title, abc, deadline, status, created_at
    FROM procurement_opportunities
    WHERE reference_no LIKE ? OR title LIKE ?
    ORDER BY created_at DESC
    LIMIT 15
');
$oppStmt->execute([$searchTerm, $searchTerm]);
$opportunities = $oppStmt->fetchAll();

foreach ($opportunities as &$o) {
    $o['id']  = (int)$o['id'];
    $o['abc'] = (float)$o['abc'];
}
unset($o);

// 2. Search Procurement Transactions (by control_no or opportunity title)
$txStmt = $pdo->prepare('
    SELECT 
        t.id,
        t.control_no,
        t.opportunity_id,
        o.reference_no,
        o.title,
        t.current_stage,
        t.payment_status,
        t.abc,
        t.awarded_amount,
        t.savings
    FROM procurement_transactions t
    JOIN procurement_opportunities o ON t.opportunity_id = o.id
    WHERE t.control_no LIKE ? OR o.title LIKE ?
    ORDER BY t.created_at DESC
    LIMIT 15
');
$txStmt->execute([$searchTerm, $searchTerm]);
$transactions = $txStmt->fetchAll();

foreach ($transactions as &$t) {
    $t['id']             = (int)$t['id'];
    $t['opportunity_id'] = (int)$t['opportunity_id'];
    $t['abc']            = (float)$t['abc'];
    $t['awarded_amount'] = $t['awarded_amount'] !== null ? (float)$t['awarded_amount'] : null;
    $t['savings']        = $t['savings'] !== null ? (float)$t['savings'] : null;
}
unset($t);

// 3. Search Registered Bidders (by organization_name or full_name)
$bidderStmt = $pdo->prepare('
    SELECT 
        id,
        full_name,
        organization_name,
        email,
        contact_number,
        address,
        created_at,
        (SELECT COUNT(*) FROM bids WHERE bidder_id = users.id) AS total_bids_submitted
    FROM users
    WHERE role = "bidder" AND (organization_name LIKE ? OR full_name LIKE ?)
    ORDER BY organization_name ASC
    LIMIT 15
');
$bidderStmt->execute([$searchTerm, $searchTerm]);
$bidders = $bidderStmt->fetchAll();

foreach ($bidders as &$b) {
    $b['id']                   = (int)$b['id'];
    $b['total_bids_submitted'] = (int)$b['total_bids_submitted'];
}
unset($b);

$totalFound = count($opportunities) + count($transactions) + count($bidders);

sendSuccess('Global search results retrieved.', [
    'search_query' => $query,
    'total_found'  => $totalFound,
    'results'      => [
        'opportunities' => $opportunities,
        'transactions'  => $transactions,
        'bidders'       => $bidders,
    ],
]);
