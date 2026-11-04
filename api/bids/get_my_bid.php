<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/bids/get_my_bid.php
 * =============================================================================
 * 
 * Fetches full details and attached document references for a single bid.
 * Security Rule: A bidder can ONLY access their own bid submission.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Bidder role only
requireRole('bidder');

$bidId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$bidId) {
    sendError('A valid bid ID is required.', null, 422);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Fetch Bid and Verify Ownership
$stmt = $pdo->prepare('
    SELECT 
        b.id,
        b.opportunity_id,
        b.bidder_id,
        b.bid_amount,
        b.remarks,
        b.status,
        b.submitted_at,
        b.updated_at,
        o.reference_no,
        o.title AS opportunity_title,
        o.abc AS opportunity_abc,
        o.deadline AS opportunity_deadline,
        o.status AS opportunity_status
    FROM bids b
    JOIN procurement_opportunities o ON b.opportunity_id = o.id
    WHERE b.id = ? AND b.bidder_id = ?
    LIMIT 1
');
$stmt->execute([$bidId, $currentUserId]);
$bid = $stmt->fetch();

if (!$bid) {
    sendError('Bid submission not found or you are not authorized to view it.', null, 404);
}

// 2. Fetch Attached Documents for this Bid
$docStmt = $pdo->prepare('
    SELECT 
        id,
        document_type,
        original_name,
        uploaded_at
    FROM bid_documents
    WHERE bid_id = ?
    ORDER BY id ASC
');
$docStmt->execute([$bidId]);
$documents = $docStmt->fetchAll();

foreach ($documents as &$doc) {
    $doc['id'] = (int)$doc['id'];
}
unset($doc);

$bid['id']              = (int)$bid['id'];
$bid['opportunity_id']  = (int)$bid['opportunity_id'];
$bid['opportunity_abc'] = (float)$bid['opportunity_abc'];
$bid['bid_amount']      = (float)$bid['bid_amount'];
$bid['documents']       = $documents;

sendSuccess('Bid submission details retrieved.', [
    'bid' => $bid,
]);
