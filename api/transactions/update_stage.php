<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/update_stage.php
 * =============================================================================
 * 
 * Advances a transaction through the official 11-stage government procurement workflow.
 * 
 * MVP RULE:
 * Stages must advance sequentially (to the same stage or exactly the next stage).
 * Jumping stages is disallowed to preserve statutory procedural order.
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

$transactionId = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
$targetStage   = trim($input['stage'] ?? '');
$remarks       = trim($input['remarks'] ?? '');

if (!$transactionId) {
    sendError('A valid transaction id is required.', null, 422);
}

if (empty($targetStage)) {
    sendError('Target procurement stage is required.', null, 422);
}

// The official 11 government stages in sequence
$stages = [
    'Purchase Request',
    'Request for Quotation',
    'Abstract / Canvass',
    'BAC Resolution',
    'Notice of Award',
    'Purchase Order',
    'Notice to Proceed',
    'Delivery / Implementation',
    'Inspection / Evaluation',
    'Billing / Payment',
    'Completed',
];

if (!in_array($targetStage, $stages, true)) {
    sendError(sprintf('Invalid stage "%s". Please select from the 11 valid stages.', $targetStage), null, 422);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Fetch Current Transaction Stage
$stmt = $pdo->prepare('SELECT id, control_no, current_stage FROM procurement_transactions WHERE id = ? LIMIT 1');
$stmt->execute([$transactionId]);
$tx = $stmt->fetch();

if (!$tx) {
    sendError('Procurement transaction not found.', null, 404);
}

$currentStage = $tx['current_stage'];
$currentIdx   = array_search($currentStage, $stages, true);
$targetIdx    = array_search($targetStage, $stages, true);

// 2. Enforce Sequential Workflow Rule: Same stage or next stage only
if ($targetIdx < $currentIdx) {
    sendError(
        sprintf('Workflow cannot move backward from "%s" to "%s".', $currentStage, $targetStage),
        null,
        422
    );
}

if ($targetIdx > $currentIdx + 1) {
    $expectedNext = $stages[$currentIdx + 1];
    sendError(
        sprintf(
            'Sequential workflow rule: In the MVP tracker, stages must be completed in order. Expected next stage: "%s".',
            $expectedNext
        ),
        null,
        422
    );
}

// 3. Begin Transaction
$pdo->beginTransaction();

try {
    // Update stage in procurement_transactions
    $updateStmt = $pdo->prepare('
        UPDATE procurement_transactions
        SET current_stage = ?, updated_at = NOW()
        WHERE id = ?
    ');
    $updateStmt->execute([$targetStage, $transactionId]);

    // Record entry in transaction_history
    $historyStmt = $pdo->prepare('
        INSERT INTO transaction_history (
            transaction_id,
            action_type,
            old_value,
            new_value,
            remarks,
            performed_by,
            created_at
        ) VALUES (?, "STAGE_CHANGE", ?, ?, ?, ?, NOW())
    ');
    $historyStmt->execute([
        $transactionId,
        $currentStage,
        $targetStage,
        $remarks ?: sprintf('Advanced to %s', $targetStage),
        $currentUserId,
    ]);

    // Record entry in audit_logs
    recordAuditLog(
        $pdo,
        $currentUserId,
        'UPDATE_TRANSACTION_STAGE',
        'transaction',
        $transactionId,
        [
            'control_no' => $tx['control_no'],
            'from_stage' => $currentStage,
            'to_stage'   => $targetStage,
            'remarks'    => $remarks,
        ]
    );

    $pdo->commit();

    sendSuccess(
        sprintf('Transaction stage successfully updated from "%s" to "%s".', $currentStage, $targetStage),
        [
            'transaction_id' => $transactionId,
            'control_no'     => $tx['control_no'],
            'previous_stage' => $currentStage,
            'current_stage'  => $targetStage,
        ]
    );

} catch (Exception $e) {
    $pdo->rollBack();
    sendError('Failed to update stage: ' . $e->getMessage(), null, 500);
}
