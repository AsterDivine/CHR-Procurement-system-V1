<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_dashboard_summary.php
 * =============================================================================
 * 
 * Computes executive KPI summary cards and recent activity for the CHR Dashboard.
 * Returns counts of active procurements, pending bids, total ABC, and budget savings.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Computes statistical counts and loads recent procurement activities from MySQL.
 * Used by: React component CHRDashboard.jsx.
 * Connects to: Endpoint /api/procurements/get_dashboard_summary.php
 * Database tables affected: Reads from 'procurements', 'bids', and 'transaction_history'.
 *
 * @param PDO $pdo Active database connection.
 * @return array Dashboard KPIs, recent procurements, and recent history logs.
 */
function fetchDashboardKPIs($pdo) {
    // 1. Compute aggregate statistics from procurements table
    $stmt = $pdo->prepare('
        SELECT 
            COUNT(*) AS total_procurements,
            COALESCE(SUM(CASE WHEN status = "Draft" THEN 1 ELSE 0 END), 0) AS total_draft,
            COALESCE(SUM(CASE WHEN status = "Published / Open" THEN 1 ELSE 0 END), 0) AS total_open,
            COALESCE(SUM(CASE WHEN status = "Under Evaluation" THEN 1 ELSE 0 END), 0) AS total_evaluation,
            COALESCE(SUM(CASE WHEN status = "Awarded" THEN 1 ELSE 0 END), 0) AS total_awarded,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END), 0) AS total_completed,
            COALESCE(SUM(abc), 0) AS total_abc,
            COALESCE(SUM(awarded_amount), 0) AS total_awarded_amount,
            COALESCE(SUM(savings), 0) AS total_savings
        FROM procurements
    ');
    $stmt->execute();
    $kpi = $stmt->fetch();

    // 2. Count total submitted bids
    $bidStmt = $pdo->prepare('SELECT COUNT(*) AS total_bids FROM bids');
    $bidStmt->execute();
    $bidCount = (int)$bidStmt->fetchColumn();

    // 3. Fetch 5 most recent procurements
    $recentStmt = $pdo->prepare('
        SELECT 
            p.id,
            p.reference_number,
            p.title,
            p.procurement_mode,
            p.abc,
            p.deadline,
            p.status,
            p.current_stage,
            p.awarded_amount,
            p.savings,
            wb.bidder_name AS awarded_bidder_name,
            COUNT(DISTINCT b.id) AS total_bids
        FROM procurements p
        LEFT JOIN bids b ON p.id = b.procurement_id
        LEFT JOIN bids wb ON p.awarded_bid_id = wb.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 5
    ');
    $recentStmt->execute();
    $recentProcurements = $recentStmt->fetchAll();

    foreach ($recentProcurements as &$r) {
        $r['id']             = (int)$r['id'];
        $r['abc']            = (float)$r['abc'];
        $r['awarded_amount'] = $r['awarded_amount'] !== null ? (float)$r['awarded_amount'] : null;
        $r['savings']        = $r['savings'] !== null ? (float)$r['savings'] : null;
        $r['total_bids']     = (int)$r['total_bids'];
    }
    unset($r);

    // 4. Fetch 5 most recent transaction history logs
    $histStmt = $pdo->prepare('
        SELECT 
            h.id,
            h.procurement_id,
            h.action,
            h.previous_status,
            h.new_status,
            h.remarks,
            h.performed_by,
            h.created_at,
            p.reference_number AS procurement_reference
        FROM transaction_history h
        JOIN procurements p ON h.procurement_id = p.id
        ORDER BY h.created_at DESC, h.id DESC
        LIMIT 5
    ');
    $histStmt->execute();
    $recentHistory = $histStmt->fetchAll();

    foreach ($recentHistory as &$h) {
        $h['id']             = (int)$h['id'];
        $h['procurement_id'] = (int)$h['procurement_id'];
    }
    unset($h);

    return [
        'kpi' => [
            'total_procurements'   => (int)$kpi['total_procurements'],
            'total_draft'          => (int)$kpi['total_draft'],
            'total_open'           => (int)$kpi['total_open'],
            'total_evaluation'     => (int)$kpi['total_evaluation'],
            'total_awarded'        => (int)$kpi['total_awarded'],
            'total_completed'      => (int)$kpi['total_completed'],
            'total_bids'           => $bidCount,
            'total_abc'            => (float)$kpi['total_abc'],
            'total_awarded_amount' => (float)$kpi['total_awarded_amount'],
            'total_savings'        => (float)$kpi['total_savings'],
        ],
        'recent_procurements' => $recentProcurements,
        'recent_history'      => $recentHistory,
    ];
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Fetch dashboard data and send JSON response
$dashboard = fetchDashboardKPIs($pdo);

sendSuccess('Dashboard summary metrics retrieved successfully.', $dashboard);
