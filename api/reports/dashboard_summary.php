<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/reports/dashboard_summary.php
 * =============================================================================
 * 
 * Provides high-level operational statistics and procurement performance KPIs
 * for the CHR Personnel Dashboard.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$pdo = getDBConnection();

// 1. Open Opportunities Count
$oppCountStmt = $pdo->query('
    SELECT COUNT(*) AS total 
    FROM procurement_opportunities 
    WHERE status = "open" AND deadline >= NOW()
');
$openOpportunities = (int)$oppCountStmt->fetchColumn();

// 2. Pending Bids Count (submitted or under_review)
$bidsCountStmt = $pdo->query('
    SELECT COUNT(*) AS total 
    FROM bids 
    WHERE status IN ("submitted", "under_review")
');
$pendingBids = (int)$bidsCountStmt->fetchColumn();

// 3. Transactions Metrics
$txSummaryStmt = $pdo->query('
    SELECT 
        COUNT(CASE WHEN current_stage != "Completed" THEN 1 END) AS active_transactions_count,
        COUNT(CASE WHEN current_stage = "Completed" THEN 1 END) AS completed_transactions_count,
        COALESCE(SUM(CASE WHEN current_stage != "Completed" THEN abc ELSE 0 END), 0) AS total_abc_active,
        COALESCE(SUM(awarded_amount), 0) AS total_awarded,
        COALESCE(SUM(savings), 0) AS total_savings
    FROM procurement_transactions
');
$txMetrics = $txSummaryStmt->fetch();

// 4. Breakdown by 11 Workflow Stages
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

$stageQuery = $pdo->query('
    SELECT current_stage, COUNT(*) AS count
    FROM procurement_transactions
    GROUP BY current_stage
');
$dbStageCounts = $stageQuery->fetchAll(PDO::FETCH_KEY_PAIR);

$stageBreakdown = [];
foreach ($stages as $stageName) {
    $stageBreakdown[] = [
        'stage' => $stageName,
        'count' => (int)($dbStageCounts[$stageName] ?? 0),
    ];
}

sendSuccess('CHR dashboard summary metrics retrieved.', [
    'open_opportunities'     => $openOpportunities,
    'pending_bid_evaluations'=> $pendingBids,
    'active_transactions'    => (int)$txMetrics['active_transactions_count'],
    'completed_transactions' => (int)$txMetrics['completed_transactions_count'],
    'total_abc_active'       => (float)$txMetrics['total_abc_active'],
    'total_awarded_amount'   => (float)$txMetrics['total_awarded'],
    'total_savings_realized' => (float)$txMetrics['total_savings'],
    'stage_breakdown'        => $stageBreakdown,
]);
