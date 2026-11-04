<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/budgets/summary.php
 * =============================================================================
 * 
 * Generates regional financial monitoring summaries per funding source.
 * 
 * DISCLAIMER & SCOPE:
 * These are simplified prototype financial calculations designed for monitoring
 * procurement allocations against awarded contracts and disbursements:
 * - allocated_amount: Total appropriation defined for the fiscal year.
 * - committed_amount: Sum of awarded_amounts for all transactions using this source.
 * - paid_amount: Sum of awarded_amounts where payment_status = 'paid'.
 * - available_amount: allocated_amount minus committed_amount.
 * - procurement_savings: Sum of savings realized from competitive bidding.
 * 
 * Note: This does NOT replace government accounting (eCOA / GAM). Final financial
 * reporting should be validated with the CHR-CAR regional budget officer.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$pdo = getDBConnection();

// Query budget sources with aggregated transaction commitments
$stmt = $pdo->prepare('
    SELECT 
        bs.id,
        bs.name,
        bs.fiscal_year,
        bs.allocated_amount,
        bs.description,
        bs.active,
        COALESCE(SUM(t.awarded_amount), 0) AS committed_amount,
        COALESCE(SUM(CASE WHEN t.payment_status = "paid" THEN t.awarded_amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(t.savings), 0) AS procurement_savings,
        COUNT(t.id) AS total_transactions
    FROM budget_sources bs
    LEFT JOIN procurement_transactions t ON bs.id = t.budget_source_id
    GROUP BY bs.id
    ORDER BY bs.fiscal_year DESC, bs.id ASC
');

$stmt->execute();
$sources = $stmt->fetchAll();

$grandAllocated = 0.0;
$grandCommitted = 0.0;
$grandPaid      = 0.0;
$grandSavings   = 0.0;

foreach ($sources as &$row) {
    $row['id']                  = (int)$row['id'];
    $row['fiscal_year']         = (int)$row['fiscal_year'];
    $row['allocated_amount']    = (float)$row['allocated_amount'];
    $row['committed_amount']    = (float)$row['committed_amount'];
    $row['paid_amount']         = (float)$row['paid_amount'];
    $row['procurement_savings'] = (float)$row['procurement_savings'];
    $row['total_transactions']  = (int)$row['total_transactions'];

    // Formula: available_amount = allocated_amount - committed_amount
    $row['available_amount']    = $row['allocated_amount'] - $row['committed_amount'];

    // Accumulate grand totals
    $grandAllocated += $row['allocated_amount'];
    $grandCommitted += $row['committed_amount'];
    $grandPaid      += $row['paid_amount'];
    $grandSavings   += $row['procurement_savings'];
}
unset($row);

$grandAvailable = $grandAllocated - $grandCommitted;

sendSuccess('Budget monitoring summary retrieved successfully.', [
    'grand_totals' => [
        'total_allocated' => $grandAllocated,
        'total_committed' => $grandCommitted,
        'total_paid'      => $grandPaid,
        'total_available' => $grandAvailable,
        'total_savings'   => $grandSavings,
    ],
    'budget_sources' => $sources,
]);
