<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/bids/list_for_opportunity.php
 * =============================================================================
 * 
 * Allows CHR Personnel to inspect all supplier bids and supporting documents
 * submitted for a specific procurement opportunity.
 * 
 * Note: Ranked by quoted amount ascending for Abstract/Canvass evaluation.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$opportunityId = filter_input(INPUT_GET, 'opportunity_id', FILTER_VALIDATE_INT);
if (!$opportunityId) {
    sendError('A valid opportunity_id parameter is required.', null, 422);
}

$pdo = getDBConnection();

// 1. Fetch Opportunity Master Info
$oppStmt = $pdo->prepare('
    SELECT id, reference_no, title, abc, deadline, status
    FROM procurement_opportunities
    WHERE id = ?
    LIMIT 1
');
$oppStmt->execute([$opportunityId]);
$opportunity = $oppStmt->fetch();

if (!$opportunity) {
    sendError('Procurement opportunity not found.', null, 404);
}

// 2. Fetch All Submitted Bids
$bidStmt = $pdo->prepare('
    SELECT 
        b.id,
        b.bidder_id,
        u.full_name AS bidder_name,
        u.organization_name,
        u.email AS bidder_email,
        u.contact_number AS bidder_phone,
        b.bid_amount,
        b.remarks,
        b.status,
        b.submitted_at,
        b.updated_at
    FROM bids b
    JOIN users u ON b.bidder_id = u.id
    WHERE b.opportunity_id = ?
    ORDER BY b.bid_amount ASC, b.submitted_at ASC
');
$bidStmt->execute([$opportunityId]);
$bids = $bidStmt->fetchAll();

// 3. Attach Document Metadata for Each Bid
$docStmt = $pdo->prepare('
    SELECT id, document_type, original_name, uploaded_at
    FROM bid_documents
    WHERE bid_id = ?
    ORDER BY id ASC
');

foreach ($bids as &$b) {
    $b['id']         = (int)$b['id'];
    $b['bidder_id']  = (int)$b['bidder_id'];
    $b['bid_amount'] = (float)$b['bid_amount'];

    $docStmt->execute([$b['id']]);
    $docs = $docStmt->fetchAll();
    foreach ($docs as &$d) {
        $d['id'] = (int)$d['id'];
    }
    unset($d);
    $b['documents'] = $docs;
}
unset($b);

$opportunity['id']  = (int)$opportunity['id'];
$opportunity['abc'] = (float)$opportunity['abc'];

sendSuccess('Opportunity submissions retrieved for CHR review.', [
    'opportunity' => $opportunity,
    'total_bids'  => count($bids),
    'bids'        => $bids,
]);
