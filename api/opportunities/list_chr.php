<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/opportunities/list_chr.php
 * =============================================================================
 * 
 * Lists all opportunities across all stages (draft/open/closed/awarded/completed)
 * for CHR Personnel management, including bids received counts.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$pdo = getDBConnection();

// Optional filter by status
$statusFilter = trim($_GET['status'] ?? '');
$allowedStatuses = ['draft', 'open', 'closed', 'awarded', 'completed'];

$sql = '
    SELECT 
        o.id,
        o.reference_no,
        o.title,
        o.description,
        o.procurement_type,
        o.abc,
        o.deadline,
        o.status,
        o.created_by,
        u.full_name AS created_by_name,
        o.created_at,
        o.updated_at,
        (SELECT COUNT(*) FROM bids b WHERE b.opportunity_id = o.id) AS bids_count,
        (SELECT COUNT(*) FROM opportunity_items i WHERE i.opportunity_id = o.id) AS total_items
    FROM procurement_opportunities o
    LEFT JOIN users u ON o.created_by = u.id
';

$params = [];
if (!empty($statusFilter) && in_array($statusFilter, $allowedStatuses, true)) {
    $sql .= ' WHERE o.status = ? ';
    $params[] = $statusFilter;
}

$sql .= ' ORDER BY o.created_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$opportunities = $stmt->fetchAll();

foreach ($opportunities as &$row) {
    $row['id']          = (int)$row['id'];
    $row['abc']         = (float)$row['abc'];
    $row['bids_count']  = (int)$row['bids_count'];
    $row['total_items'] = (int)$row['total_items'];
}
unset($row);

sendSuccess('CHR procurement opportunities list retrieved.', [
    'count'         => count($opportunities),
    'opportunities' => $opportunities,
]);
