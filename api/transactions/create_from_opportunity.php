<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/create_from_opportunity.php
 * =============================================================================
 * 
 * Allows CHR Personnel to instantiate an internal procurement transaction tracker
 * from an existing procurement opportunity notice.
 * 
 * GOVERNANCE RULES:
 * - CHR only.
 * - Only ONE transaction per opportunity (1-to-1 relationship).
 * - Copies ABC from the opportunity.
 * - If awarded_amount is provided, savings = ABC - awarded_amount.
 * - Disallows awarded_amount > ABC (negative savings are strictly rejected).
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

$opportunityId   = filter_var($input['opportunity_id'] ?? null, FILTER_VALIDATE_INT);
$controlNo       = trim($input['control_no'] ?? '');
$selectedBidId   = filter_var($input['selected_bid_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
$budgetSourceId  = filter_var($input['budget_source_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
$expenseCategory = trim($input['expense_category'] ?? '');
$awardedAmount   = isset($input['awarded_amount']) && is_numeric($input['awarded_amount'])
    ? (float)$input['awarded_amount']
    : null;

if (!$opportunityId) {
    sendError('A valid opportunity_id is required.', null, 422);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Verify Opportunity Exists
$oppStmt = $pdo->prepare('
    SELECT id, reference_no, title, abc, status
    FROM procurement_opportunities
    WHERE id = ?
    LIMIT 1
');
$oppStmt->execute([$opportunityId]);
$opportunity = $oppStmt->fetch();

if (!$opportunity) {
    sendError('Procurement opportunity not found.', null, 404);
}

$abc = (float)$opportunity['abc'];

// 2. Check 1-to-1 Rule: Only One Transaction Per Opportunity
$checkTxStmt = $pdo->prepare('SELECT id, control_no FROM procurement_transactions WHERE opportunity_id = ? LIMIT 1');
$checkTxStmt->execute([$opportunityId]);
$existingTx = $checkTxStmt->fetch();

if ($existingTx) {
    sendError(
        sprintf(
            'A transaction tracker (%s) already exists for this opportunity. Duplicate trackers are not allowed.',
            $existingTx['control_no']
        ),
        null,
        409
    );
}

// 3. Verify Selected Bid (if provided)
if ($selectedBidId !== null) {
    $bidStmt = $pdo->prepare('
        SELECT id, bid_amount, status 
        FROM bids 
        WHERE id = ? AND opportunity_id = ? 
        LIMIT 1
    ');
    $bidStmt->execute([$selectedBidId, $opportunityId]);
    $bid = $bidStmt->fetch();

    if (!$bid) {
        sendError('The specified selected_bid_id does not belong to this opportunity.', null, 422);
    }

    // Default awarded_amount to bid amount if CHR didn't specify a manual override
    if ($awardedAmount === null) {
        $awardedAmount = (float)$bid['bid_amount'];
    }
}

// 4. Validate Financials & Savings Calculation
$savings = null;
if ($awardedAmount !== null) {
    if ($awardedAmount <= 0) {
        sendError('Awarded amount must be greater than zero.', null, 422);
    }

    // Disallow negative savings (Awarded cannot exceed ABC)
    if ($awardedAmount > $abc) {
        sendError(
            sprintf(
                'Awarded amount (₱%s) exceeds the Approved Budget for the Contract ABC (₱%s). Negative savings are not permitted.',
                number_format($awardedAmount, 2),
                number_format($abc, 2)
            ),
            null,
            422
        );
    }

    $savings = $abc - $awardedAmount;
}

// 5. Generate or Validate Control Number
if (empty($controlNo)) {
    // Standard format: TXN-YYYY-XXXX
    $controlNo = sprintf('TXN-%s-%04d', date('Y'), $opportunityId);
}

// Check uniqueness of control_no
$checkCtrlStmt = $pdo->prepare('SELECT id FROM procurement_transactions WHERE control_no = ? LIMIT 1');
$checkCtrlStmt->execute([$controlNo]);
if ($checkCtrlStmt->fetch()) {
    // If collides, append random hex suffix
    $controlNo .= '-' . strtoupper(bin2hex(random_bytes(2)));
}

// 6. Begin Transaction
$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare('
        INSERT INTO procurement_transactions (
            opportunity_id,
            selected_bid_id,
            control_no,
            budget_source_id,
            expense_category,
            abc,
            awarded_amount,
            savings,
            current_stage,
            payment_status,
            created_by,
            created_at,
            updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, "Purchase Request", "not_for_billing", ?, NOW(), NOW()
        )
    ');

    $stmt->execute([
        $opportunityId,
        $selectedBidId,
        $controlNo,
        $budgetSourceId,
        $expenseCategory ?: null,
        $abc,
        $awardedAmount,
        $savings,
        $currentUserId,
    ]);

    $transactionId = (int)$pdo->lastInsertId();

    // 7. Initial History Entry
    $histStmt = $pdo->prepare('
        INSERT INTO transaction_history (
            transaction_id,
            action_type,
            old_value,
            new_value,
            remarks,
            performed_by,
            created_at
        ) VALUES (?, "CREATE_TRANSACTION", NULL, "Purchase Request", ?, ?, NOW())
    ');
    $histStmt->execute([
        $transactionId,
        sprintf('Tracker initialized from Opportunity %s with ABC ₱%s', $opportunity['reference_no'], number_format($abc, 2)),
        $currentUserId,
    ]);

    // 8. Record Audit Log
    recordAuditLog(
        $pdo,
        $currentUserId,
        'CREATE_TRANSACTION',
        'transaction',
        $transactionId,
        [
            'control_no'     => $controlNo,
            'opportunity_id' => $opportunityId,
            'abc'            => $abc,
            'awarded_amount' => $awardedAmount,
            'savings'        => $savings,
        ]
    );

    $pdo->commit();

    sendSuccess('Procurement transaction tracker created successfully.', [
        'transaction_id' => $transactionId,
        'control_no'     => $controlNo,
        'current_stage'  => 'Purchase Request',
        'abc'            => $abc,
        'awarded_amount' => $awardedAmount,
        'savings'        => $savings,
    ], 201);

} catch (Exception $e) {
    $pdo->rollBack();
    sendError('Failed to create transaction: ' . $e->getMessage(), null, 500);
}
