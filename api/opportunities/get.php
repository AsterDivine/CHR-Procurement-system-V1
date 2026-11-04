<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/opportunities/get.php
 * =============================================================================
 * 
 * Fetches single opportunity details along with all its technical line items.
 * Security Rule: Bidders must NOT see other bidders' submissions.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Ensure user is logged in
requireLogin();

$opportunityId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$opportunityId) {
    sendError('A valid opportunity ID is required.', null, 422);
}

$pdo = getDBConnection();

// 1. Fetch Opportunity Master Details
$stmt = $pdo->prepare('
    SELECT 
        o.id,
        o.reference_no,
        o.title,
        o.description,
        o.procurement_type,
        o.abc,
        o.deadline,
        o.status,
        o.created_by,
        u.full_name AS created_by_name,
        o.created_at,
        o.updated_at
    FROM procurement_opportunities o
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = ?
    LIMIT 1
');
$stmt->execute([$opportunityId]);
$opportunity = $stmt->fetch();

if (!$opportunity) {
    sendError('Procurement opportunity not found.', null, 404);
}

// Bidders cannot view 'draft' opportunities
$currentRole = getCurrentUserRole();
$currentUserId = getCurrentUserId();

if ($currentRole === 'bidder' && $opportunity['status'] === 'draft') {
    sendError('This procurement opportunity has not been published yet.', null, 403);
}

// 2. Fetch Line Items for this Opportunity
$itemStmt = $pdo->prepare('
    SELECT 
        id,
        opportunity_id,
        item_name,
        specifications,
        quantity,
        unit,
        estimated_unit_cost
    FROM opportunity_items
    WHERE opportunity_id = ?
    ORDER BY id ASC
');
$itemStmt->execute([$opportunityId]);
$items = $itemStmt->fetchAll();

// Clean up numeric types
$opportunity['id']  = (int)$opportunity['id'];
$opportunity['abc'] = (float)$opportunity['abc'];

foreach ($items as &$item) {
    $item['id']                  = (int)$item['id'];
    $item['opportunity_id']      = (int)$item['opportunity_id'];
    $item['quantity']            = (float)$item['quantity'];
    $item['estimated_unit_cost'] = $item['estimated_unit_cost'] !== null ? (float)$item['estimated_unit_cost'] : null;
}
unset($item);

$opportunity['items'] = $items;

// 3. For Bidders: Check ONLY if the currently logged-in bidder has already submitted a bid
// CRITICAL: We NEVER query or expose other bidders' submissions!
$opportunity['my_submission'] = null;
if ($currentRole === 'bidder') {
    $bidStmt = $pdo->prepare('
        SELECT id, bid_amount, remarks, status, submitted_at, updated_at
        FROM bids
        WHERE opportunity_id = ? AND bidder_id = ?
        LIMIT 1
    ');
    $bidStmt->execute([$opportunityId, $currentUserId]);
    $myBid = $bidStmt->fetch();

    if ($myBid) {
        $myBid['id']         = (int)$myBid['id'];
        $myBid['bid_amount'] = (float)$myBid['bid_amount'];
        $opportunity['my_submission'] = $myBid;
    }
}

sendSuccess('Opportunity details retrieved successfully.', [
    'opportunity' => $opportunity,
]);
