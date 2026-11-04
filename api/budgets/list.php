<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/budgets/list.php
 * =============================================================================
 * 
 * Lists all registered budget funding sources (e.g. GAA MOOE, Capital Outlay,
 * Human Rights Protection Special Funds).
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel role only
requireRole('chr');

$pdo = getDBConnection();

$stmt = $pdo->prepare('
    SELECT id, name, fiscal_year, allocated_amount, description, active
    FROM budget_sources
    ORDER BY fiscal_year DESC, name ASC
');
$stmt->execute();
$sources = $stmt->fetchAll();

foreach ($sources as &$row) {
    $row['id']               = (int)$row['id'];
    $row['fiscal_year']      = (int)$row['fiscal_year'];
    $row['allocated_amount'] = (float)$row['allocated_amount'];
    $row['active']           = (bool)$row['active'];
}
unset($row);

sendSuccess('Budget sources list retrieved.', [
    'count'   => count($sources),
    'budgets' => $sources,
]);
