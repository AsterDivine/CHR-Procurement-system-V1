<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/bids/update_status.php
 * =============================================================================
 * 
 * Allows CHR Personnel to manually update a bid's evaluation status.
 * 
 * CORE CAPSTONE GOVERNANCE RULE:
 * - NO automatic award or lowest-bid selection algorithms.
 * - CHR Personnel manually assign each status ('submitted', 'under_review',
 *   'selected', 'not_selected').
 * - When a bid is marked 'selected', other bids are NOT silently modified by the system.
 *   The procurement officer explicitly and transparently reviews and updates each bid.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/audit.php';

// CHR Personnel role only
requireRole('chr');

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

$input = getJsonInput();

$bidId     = filter_var($input['bid_id'] ?? null, FILTER_VALIDATE_INT);
$newStatus = strtolower(trim($input['status'] ?? ''));
$remarks   = trim($input['remarks'] ?? '');

if (!$bidId) {
    sendError('A valid bid_id is required.', null, 422);
}

$allowedStatuses = ['submitted', 'under_review', 'selected', 'not_selected'];
if (!in_array($newStatus, $allowedStatuses, true)) {
    sendError(
        sprintf('Invalid status "%s". Allowed values: submitted, under_review, selected, not_selected.', $newStatus),
        null,
        422
    );
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Fetch Existing Bid
$stmt = $pdo->prepare('
    SELECT b.id, b.opportunity_id, b.bidder_id, b.bid_amount, b.status, b.remarks, o.reference_no
    FROM bids b
    JOIN procurement_opportunities o ON b.opportunity_id = o.id
    WHERE b.id = ?
    LIMIT 1
');
$stmt->execute([$bidId]);
$bid = $stmt->fetch();

if (!$bid) {
    sendError('Bid record not found.', null, 404);
}

$previousStatus = $bid['status'];
$finalRemarks   = !empty($remarks) ? $remarks : $bid['remarks'];

// 2. Update Bid Status and Remarks
$updateStmt = $pdo->prepare('
    UPDATE bids
    SET status = ?, remarks = ?, updated_at = NOW()
    WHERE id = ?
');
$updateStmt->execute([$newStatus, $finalRemarks, $bidId]);

// 3. Record Audit Trail
recordAuditLog(
    $pdo,
    $currentUserId,
    'UPDATE_BID_STATUS',
    'bid',
    $bidId,
    [
        'opportunity_id'  => (int)$bid['opportunity_id'],
        'reference_no'    => $bid['reference_no'],
        'bid_amount'      => (float)$bid['bid_amount'],
        'previous_status' => $previousStatus,
        'new_status'      => $newStatus,
        'evaluation_notes'=> $finalRemarks,
    ]
);

sendSuccess(
    sprintf('Bid status successfully updated from "%s" to "%s".', $previousStatus, $newStatus),
    [
        'bid_id'          => $bidId,
        'opportunity_id'  => (int)$bid['opportunity_id'],
        'previous_status' => $previousStatus,
        'current_status'  => $newStatus,
        'remarks'         => $finalRemarks,
    ]
);
