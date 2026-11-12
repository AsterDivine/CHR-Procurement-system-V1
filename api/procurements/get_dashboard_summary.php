<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_dashboard_summary.php
 * =============================================================================
 * 
 * Computes executive KPI summary cards and recent activity for the CHR Dashboard.
 * Returns counts of active procurements, pending bids, total ABC, and budget savings.
 * Uses pure PHP MySQLi prepared statements.
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
 * @param mysqli $conn Active MySQLi database connection.
 * @return array Dashboard KPIs, recent procurements, and recent history logs.
 */
function fetchDashboardKPIs($conn) {
    // 1. Compute aggregate statistics from procurements table
    $stmt = $conn->prepare('
        SELECT 
            COUNT(*) AS total_procurements,
            COALESCE(SUM(CASE WHEN status IN ("Open", "Published / Open") THEN 1 ELSE 0 END), 0) AS total_open,
            COALESCE(SUM(CASE WHEN status = "For Evaluation" THEN 1 ELSE 0 END), 0) AS total_evaluation,
            COALESCE(SUM(CASE WHEN status = "Awarded" THEN 1 ELSE 0 END), 0) AS total_awarded,
            COALESCE(SUM(CASE WHEN status = "In Progress" THEN 1 ELSE 0 END), 0) AS total_in_progress,
            COALESCE(SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END), 0) AS total_completed,
            COALESCE(SUM(abc), 0) AS total_abc,
            COALESCE(SUM(awarded_amount), 0) AS total_awarded_amount,
            COALESCE(SUM(savings), 0) AS total_savings
        FROM procurements
    ');
    if (!$stmt) {
        sendError('SQL prepare failed: ' . $conn->error, null, 500);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $kpi = $result->fetch_assoc();
    $stmt->close();

    // 2. Count total submitted bids
    $bidStmt = $conn->prepare('SELECT COUNT(*) AS total_bids FROM bids');
    $bidStmt->execute();
    $bidResult = $bidStmt->get_result();
    $bidRow = $bidResult->fetch_assoc();
    $bidCount = (int)($bidRow['total_bids'] ?? 0);
    $bidStmt->close();

    // 3. Fetch 5 most recent procurements
    $recentStmt = $conn->prepare('
        SELECT 
            p.id,
            p.reference_no,
            p.reference_no AS reference_number,
            p.title,
            p.procurement_type,
            p.procurement_type AS procurement_mode,
            p.abc,
            p.budget_source,
            p.deadline,
            p.status,
            p.awarded_amount,
            p.savings,
            COUNT(DISTINCT b.id) AS total_bids,
            (SELECT b2.company_name FROM bids b2 WHERE b2.procurement_id = p.id AND b2.status = "Selected" LIMIT 1) AS awarded_bidder_name
        FROM procurements p
        LEFT JOIN bids b ON p.id = b.procurement_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 5
    ');
    $recentStmt->execute();
    $recentResult = $recentStmt->get_result();
    $recentProcurements = $recentResult->fetch_all(MYSQLI_ASSOC);
    $recentStmt->close();

    foreach ($recentProcurements as &$r) {
        $r['id']             = (int)$r['id'];
        $r['abc']            = (float)$r['abc'];
        $r['awarded_amount'] = $r['awarded_amount'] !== null ? (float)$r['awarded_amount'] : null;
        $r['savings']        = $r['savings'] !== null ? (float)$r['savings'] : null;
        $r['total_bids']     = (int)$r['total_bids'];
    }
    unset($r);

    // 4. Fetch 5 most recent transaction logs
    $histStmt = $conn->prepare('
        SELECT 
            h.id,
            h.procurement_id,
            h.action,
            h.old_value,
            h.new_value,
            h.remarks,
            h.created_at,
            p.reference_no AS procurement_reference,
            p.reference_no
        FROM transaction_history h
        JOIN procurements p ON h.procurement_id = p.id
        ORDER BY h.created_at DESC, h.id DESC
        LIMIT 5
    ');
    $histStmt->execute();
    $histResult = $histStmt->get_result();
    $recentHistory = $histResult->fetch_all(MYSQLI_ASSOC);
    $histStmt->close();

    return [
        'kpi' => [
            'total_procurements'   => (int)($kpi['total_procurements'] ?? 0),
            'total_open'           => (int)($kpi['total_open'] ?? 0),
            'total_evaluation'     => (int)($kpi['total_evaluation'] ?? 0),
            'total_awarded'        => (int)($kpi['total_awarded'] ?? 0),
            'total_in_progress'    => (int)($kpi['total_in_progress'] ?? 0),
            'total_completed'      => (int)($kpi['total_completed'] ?? 0),
            'total_bids'           => $bidCount,
            'total_abc'            => (float)($kpi['total_abc'] ?? 0),
            'total_awarded_amount' => (float)($kpi['total_awarded_amount'] ?? 0),
            'total_savings'        => (float)($kpi['total_savings'] ?? 0),
        ],
        'recent_procurements' => $recentProcurements,
        'recent_history'      => $recentHistory,
    ];
}

// 1. Establish database connection
$conn = getDbConnection();

// 2. Fetch metrics and send JSON response
$data = fetchDashboardKPIs($conn);

sendSuccess('Dashboard summary metrics retrieved successfully.', $data);
