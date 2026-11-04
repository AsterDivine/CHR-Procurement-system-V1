<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/reports/export_csv.php
 * =============================================================================
 * 
 * Streams a clean, formatted CSV spreadsheet export of procurement accomplishment
 * and financial monitoring data using identical report filters.
 * 
 * Technical Implementation:
 * Uses PHP's native fputcsv() and php://output. No heavy third-party libraries needed.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
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
        t.control_no,
        o.reference_no,
        o.title,
        t.abc,
        t.awarded_amount,
        t.savings,
        t.current_stage,
        t.payment_status,
        bs.name AS budget_source,
        u_bidder.organization_name AS selected_company,
        u_bidder.full_name AS winning_rep,
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

// Clean any buffer
if (ob_get_level()) {
    ob_end_clean();
}

$filename = sprintf('CHR-CAR_Procurement_Report_%s.csv', date('Y-m-d'));

// Set CSV download headers
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');

// UTF-8 BOM so Microsoft Excel correctly displays special characters
fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

// CSV Header Row
fputcsv($output, [
    'Control No',
    'Opportunity Ref',
    'Project Description',
    'Approved Budget (ABC)',
    'Awarded Amount',
    'Procurement Savings',
    'Current Stage',
    'Payment Status',
    'Budget Funding Source',
    'Winning Supplier',
    'Supplier Representative',
    'Transaction Date',
]);

// Write Rows
foreach ($rows as $row) {
    fputcsv($output, [
        $row['control_no'],
        $row['reference_no'],
        $row['title'],
        number_format((float)$row['abc'], 2, '.', ''),
        $row['awarded_amount'] !== null ? number_format((float)$row['awarded_amount'], 2, '.', '') : 'N/A',
        $row['savings'] !== null ? number_format((float)$row['savings'], 2, '.', '') : '0.00',
        $row['current_stage'],
        $row['payment_status'],
        $row['budget_source'] ?: 'Unassigned',
        $row['selected_company'] ?: 'Pending Selection',
        $row['winning_rep'] ?: '',
        $row['created_at'],
    ]);
}

fclose($output);
exit;
