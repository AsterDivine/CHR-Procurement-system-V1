<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/update_financials.php
 * =============================================================================
 * 
 * Allows CHR Personnel to record budget funding source, expense category,
 * final awarded amount, and payment status, automatically recalculating savings.
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

$transactionId   = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
$budgetSourceId  = isset($input['budget_source_id']) && $input['budget_source_id'] !== ''
    ? filter_var($input['budget_source_id'], FILTER_VALIDATE_INT)
    : null;
$expenseCategory = trim($input['expense_category'] ?? '');
$paymentStatus   = trim($input['payment_status'] ?? '');
$awardedAmount   = isset($input['awarded_amount']) && $input['awarded_amount'] !== '' && is_numeric($input['awarded_amount'])
    ? (float)$input['awarded_amount']
    : null;

if (!$transactionId) {
    sendError('A valid transaction id is required.', null, 422);
}

$allowedPaymentStatuses = ['not_for_billing', 'for_billing', 'processing', 'paid'];
if (!empty($paymentStatus) && !in_array($paymentStatus, $allowedPaymentStatuses, true)) {
    sendError(
        sprintf('Invalid payment_status "%s". Allowed: not_for_billing, for_billing, processing, paid.', $paymentStatus),
        null,
        422
    );
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Fetch Existing Transaction
$stmt = $pdo->prepare('SELECT * FROM procurement_transactions WHERE id = ? LIMIT 1');
$stmt->execute([$transactionId]);
$tx = $stmt->fetch();

if (!$tx) {
    sendError('Procurement transaction not found.', null, 404);
}

$abc = (float)$tx['abc'];

// 2. Validate Awarded Amount & Recalculate Savings
$savings = $tx['savings'];
if ($awardedAmount !== null) {
    if ($awardedAmount <= 0) {
        sendError('Awarded amount must be greater than zero.', null, 422);
    }

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

// 3. Fallback to existing values if fields omitted
$finalBudgetSourceId  = ($budgetSourceId !== null) ? $budgetSourceId : $tx['budget_source_id'];
$finalExpenseCategory = (!empty($expenseCategory)) ? $expenseCategory : $tx['expense_category'];
$finalPaymentStatus   = (!empty($paymentStatus)) ? $paymentStatus : $tx['payment_status'];
$finalAwardedAmount   = ($awardedAmount !== null) ? $awardedAmount : $tx['awarded_amount'];

// 4. Begin Transaction
$pdo->beginTransaction();

try {
    $updateStmt = $pdo->prepare('
        UPDATE procurement_transactions
        SET 
            budget_source_id = ?,
            expense_category = ?,
            awarded_amount = ?,
            savings = ?,
            payment_status = ?,
            updated_at = NOW()
        WHERE id = ?
    ');

    $updateStmt->execute([
        $finalBudgetSourceId,
        $finalExpenseCategory,
        $finalAwardedAmount,
        $savings,
        $finalPaymentStatus,
        $transactionId,
    ]);

    // Record History Entry
    $histStmt = $pdo->prepare('
        INSERT INTO transaction_history (
            transaction_id,
            action_type,
            old_value,
            new_value,
            remarks,
            performed_by,
            created_at
        ) VALUES (?, "UPDATE_FINANCIALS", ?, ?, ?, ?, NOW())
    ');
    $histStmt->execute([
        $transactionId,
        sprintf('Awarded: ₱%s, Savings: ₱%s', number_format((float)$tx['awarded_amount'], 2), number_format((float)$tx['savings'], 2)),
        sprintf('Awarded: ₱%s, Savings: ₱%s', number_format((float)$finalAwardedAmount, 2), number_format((float)$savings, 2)),
        sprintf('Updated payment status to "%s", expense category to "%s"', $finalPaymentStatus, $finalExpenseCategory),
        $currentUserId,
    ]);

    // Record Audit Log
    recordAuditLog(
        $pdo,
        $currentUserId,
        'UPDATE_FINANCIALS',
        'transaction',
        $transactionId,
        [
            'control_no'     => $tx['control_no'],
            'abc'            => $abc,
            'awarded_amount' => $finalAwardedAmount,
            'savings'        => $savings,
            'payment_status' => $finalPaymentStatus,
        ]
    );

    $pdo->commit();

    sendSuccess('Transaction financial details updated successfully.', [
        'transaction_id'   => $transactionId,
        'abc'              => $abc,
        'awarded_amount'   => $finalAwardedAmount,
        'savings'          => $savings,
        'budget_source_id' => $finalBudgetSourceId,
        'expense_category' => $finalExpenseCategory,
        'payment_status'   => $finalPaymentStatus,
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    sendError('Failed to update financials: ' . $e->getMessage(), null, 500);
}
