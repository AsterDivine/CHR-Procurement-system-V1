<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_financial_summary.php
 * =============================================================================
 * 
 * Computes simple regional procurement financial metrics:
 * 1. Total Approved Budget for Contract (ABC)
 * 2. Total Awarded Contract Amount
 * 3. Total Realized Savings (ABC - Awarded Amount)
 * 4. Overall Savings Percentage
 * 5. Project-by-project financial ledger breakdown
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Aggregates financial totals and loads individual project financial rows from MySQL.
 * Used by: React component SimpleFinancialMonitoring.jsx and CHRDashboard.jsx.
 * Connects to: Endpoint /api/procurements/get_financial_summary.php
 * Database tables affected: Reads from 'procurements' and 'bids'.
 *
 * @param PDO $pdo Active database connection.
 * @return array Financial summary totals and project rows.
 */
function fetchFinancialMonitoringSummary($pdo) {
    // Queries all procurements from the database
    $stmt = $pdo->prepare('
        SELECT 
            p.id,
            p.reference_number,
            p.title,
            p.procurement_mode,
            p.abc,
            p.awarded_amount,
            p.savings,
            p.status,
            p.current_stage,
            p.created_at,
            b.bidder_name AS winning_supplier
        FROM procurements p
        LEFT JOIN bids b ON p.awarded_bid_id = b.id
        ORDER BY p.created_at DESC
    ');
    $stmt->execute();
    $projects = $stmt->fetchAll();

    $totalAbc     = 0.0;
    $totalAwarded = 0.0;
    $totalSavings = 0.0;
    $awardedCount = 0;

    foreach ($projects as &$proj) {
        $proj['id']             = (int)$proj['id'];
        $proj['abc']            = (float)$proj['abc'];
        $proj['awarded_amount'] = $proj['awarded_amount'] !== null ? (float)$proj['awarded_amount'] : null;
        $proj['savings']        = $proj['savings'] !== null ? (float)$proj['savings'] : null;

        $totalAbc += $proj['abc'];

        if ($proj['awarded_amount'] !== null) {
            $totalAwarded += $proj['awarded_amount'];
            $awardedCount++;
        }

        if ($proj['savings'] !== null) {
            $totalSavings += $proj['savings'];
        }

        // Project-level savings rate
        $proj['savings_rate'] = ($proj['savings'] !== null && $proj['abc'] > 0)
            ? round(($proj['savings'] / $proj['abc']) * 100, 2)
            : 0;
    }
    unset($proj);

    // Calculate overall regional procurement savings rate
    $overallSavingsRate = $totalAbc > 0 ? round(($totalSavings / $totalAbc) * 100, 2) : 0;

    return [
        'totals' => [
            'total_projects'        => count($projects),
            'awarded_projects'      => $awardedCount,
            'total_abc'             => $totalAbc,
            'total_awarded_amount'  => $totalAwarded,
            'total_savings'         => $totalSavings,
            'overall_savings_rate'  => $overallSavingsRate,
        ],
        'projects' => $projects,
    ];
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Compute financial summary and return JSON
$summary = fetchFinancialMonitoringSummary($pdo);

sendSuccess('Financial monitoring summary retrieved successfully.', $summary);
