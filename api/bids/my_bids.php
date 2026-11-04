<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/bids/my_bids.php
 * =============================================================================
 * 
 * Returns all bids submitted by the currently authenticated bidder,
 * including associated opportunity details and review statuses.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Bidder role only
requireRole('bidder');

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

$stmt = $pdo->prepare('
    SELECT 
        b.id,
        b.opportunity_id,
        o.reference_no,
        o.title AS opportunity_title,
        o.abc AS opportunity_abc,
        o.deadline AS opportunity_deadline,
        o.status AS opportunity_status,
        b.bid_amount,
        b.remarks,
        b.status,
        b.submitted_at,
        b.updated_at,
        (SELECT COUNT(*) FROM bid_documents d WHERE d.bid_id = b.id) AS document_count
    FROM bids b
    JOIN procurement_opportunities o ON b.opportunity_id = o.id
    WHERE b.bidder_id = ?
    ORDER BY b.submitted_at DESC
');

$stmt->execute([$currentUserId]);
$bids = $stmt->fetchAll();

foreach ($bids as &$row) {
    $row['id']              = (int)$row['id'];
    $row['opportunity_id']   = (int)$row['opportunity_id'];
    $row['opportunity_abc']  = (float)$row['opportunity_abc'];
    $row['bid_amount']       = (float)$row['bid_amount'];
    $row['document_count']   = (int)$row['document_count'];
}
unset($row);

sendSuccess('My bid submissions retrieved successfully.', [
    'count' => count($bids),
    'bids'  => $bids,
]);
