<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/reports/procurement_report.php
 * =============================================================================
 * 
 * Generates structured, filterable procurement accomplishment reports
 * suitable for on-screen tables, browser printing, and executive review.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$pdo = getDBConnection();

// Read Filter Parameters
$dateFrom       = trim($_GET['date_from'] ?? $_GET['from_date'] ?? '');
$dateTo         = trim($_GET['date_to'] ?? $_GET['to_date'] ?? '');
$statusFilter   = trim($_GET['status'] ?? '');
$stageFilter    = trim($_GET['stage'] ?? '');
$budgetSourceId = filter_input(INPUT_GET, 'budget_source_id', FILTER_VALIDATE_INT);

$sql = '
    SELECT 
        t.id AS transaction_id,
        t.control_no,
        o.reference_no,
        o.title,
        o.status AS opportunity_status,
        t.abc,
        t.awarded_amount,
        t.savings,
        t.current_stage,
        t.payment_status,
        bs.name AS budget_source,
        u_bidder.full_name AS winning_supplier_rep,
        u_bidder.organization_name AS selected_company,
        t.created_at
    FROM procurement_transactions t
    JOIN procurement_opportunities o ON t.opportunity_id = o.id
    LEFT JOIN budget_sources bs ON t.budget_source_id = bs.id
    LEFT JOIN bids b ON t.selected_bid_id = b.id
    LEFT JOIN users u_bidder ON b.bidder_id = u_bidder.id
';

$conditions = [];
$params = [];

if (!empty($dateFrom)) {
    $conditions[] = 'DATE(t.created_at) >= ?';
    $params[] = $dateFrom;
}

if (!empty($dateTo)) {
    $conditions[] = 'DATE(t.created_at) <= ?';
    $params[] = $dateTo;
}

if (!empty($statusFilter)) {
    $conditions[] = 'o.status = ?';
    $params[] = $statusFilter;
}

if (!empty($stageFilter)) {
    $conditions[] = 't.current_stage = ?';
    $params[] = $stageFilter;
}

if ($budgetSourceId) {
    $conditions[] = 't.budget_source_id = ?';
    $params[] = $budgetSourceId;
}

if (!empty($conditions)) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}

$sql .= ' ORDER BY t.created_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$totalAbc     = 0.0;
$totalAwarded = 0.0;
$totalSavings = 0.0;

foreach ($rows as &$r) {
    $r['transaction_id'] = (int)$r['transaction_id'];
    $r['abc']            = (float)$r['abc'];
    $r['awarded_amount'] = $r['awarded_amount'] !== null ? (float)$r['awarded_amount'] : null;
    $r['savings']        = $r['savings'] !== null ? (float)$r['savings'] : null;

    $totalAbc += $r['abc'];
    if ($r['awarded_amount'] !== null) {
        $totalAwarded += $r['awarded_amount'];
    }
    if ($r['savings'] !== null) {
        $totalSavings += $r['savings'];
    }

    $r['selected_bidder'] = !empty($r['selected_company'])
        ? $r['selected_company'] . ' (' . $r['winning_supplier_rep'] . ')'
        : 'Pending Selection / Award';
}
unset($r);

sendSuccess('Procurement accomplishment report retrieved.', [
    'filters' => [
        'date_from'        => $dateFrom ?: null,
        'date_to'          => $dateTo ?: null,
        'status'           => $statusFilter ?: null,
        'stage'            => $stageFilter ?: null,
        'budget_source_id' => $budgetSourceId ?: null,
    ],
    'totals' => [
        'total_abc'     => $totalAbc,
        'total_awarded' => $totalAwarded,
        'total_savings' => $totalSavings,
    ],
    'records_count' => count($rows),
    'records'       => $rows,
]);
