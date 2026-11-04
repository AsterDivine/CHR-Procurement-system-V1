<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/opportunities/change_status.php
 * =============================================================================
 * 
 * Allows CHR Personnel to advance an opportunity's status through the prototype
 * workflow transitions:
 *   draft -> open -> closed -> awarded -> completed
 * 
 * Key Rule: Does NOT automatically select winning suppliers. Decisions are manual.
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

$opportunityId = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
$targetStatus  = strtolower(trim($input['target_status'] ?? ''));

if (!$opportunityId) {
    sendError('A valid opportunity ID is required.', null, 422);
}

if (empty($targetStatus)) {
    sendError('Target status is required.', null, 422);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Fetch Current Opportunity Status
$stmt = $pdo->prepare('SELECT id, reference_no, title, status FROM procurement_opportunities WHERE id = ? LIMIT 1');
$stmt->execute([$opportunityId]);
$opportunity = $stmt->fetch();

if (!$opportunity) {
    sendError('Procurement opportunity not found.', null, 404);
}

$currentStatus = $opportunity['status'];

// 2. Define Allowed Prototype Transitions
$allowedTransitions = [
    'draft'   => ['open'],
    'open'    => ['closed'],
    'closed'  => ['awarded'],
    'awarded' => ['completed'],
];

if (!isset($allowedTransitions[$currentStatus]) || !in_array($targetStatus, $allowedTransitions[$currentStatus], true)) {
    $expected = isset($allowedTransitions[$currentStatus])
        ? implode(', ', $allowedTransitions[$currentStatus])
        : 'None (Final stage reached)';

    sendError(
        sprintf(
            'Invalid status transition from "%s" to "%s". Allowed next transition: "%s".',
            $currentStatus,
            $targetStatus,
            $expected
        ),
        null,
        422
    );
}

// 3. Update Status
$updateStmt = $pdo->prepare('
    UPDATE procurement_opportunities
    SET status = ?, updated_at = NOW()
    WHERE id = ?
');
$updateStmt->execute([$targetStatus, $opportunityId]);

// 4. Record Audit Log
recordAuditLog(
    $pdo,
    $currentUserId,
    'CHANGE_OPPORTUNITY_STATUS',
    'opportunity',
    $opportunityId,
    [
        'reference_no'   => $opportunity['reference_no'],
        'previous_status'=> $currentStatus,
        'new_status'     => $targetStatus,
    ]
);

sendSuccess(
    sprintf('Opportunity status transitioned from "%s" to "%s".', $currentStatus, $targetStatus),
    [
        'opportunity_id'  => $opportunityId,
        'reference_no'    => $opportunity['reference_no'],
        'previous_status' => $currentStatus,
        'current_status'  => $targetStatus,
    ]
);
