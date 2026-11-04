<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/reports/audit_logs.php
 * =============================================================================
 * 
 * Lists system security and audit trail logs for CHR Personnel.
 * Supports filtering by user, action, entity type, and date, limited to 100 entries.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// CHR Personnel only (CHR Personnel is the administrative role in this MVP)
requireRole('chr');

$pdo = getDBConnection();

$actionFilter = trim($_GET['action'] ?? '');
$entityFilter = trim($_GET['entity_type'] ?? '');
$userIdFilter = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
$dateFilter   = trim($_GET['date'] ?? '');
$dateFrom     = trim($_GET['date_from'] ?? '');
$dateTo       = trim($_GET['date_to'] ?? '');

$sql = '
    SELECT 
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.created_at,
        u.full_name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        u.organization_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
';

$conditions = [];
$params = [];

if (!empty($actionFilter)) {
    $conditions[] = 'al.action = ?';
    $params[] = $actionFilter;
}

if (!empty($entityFilter)) {
    $conditions[] = 'al.entity_type = ?';
    $params[] = $entityFilter;
}

if ($userIdFilter) {
    $conditions[] = 'al.user_id = ?';
    $params[] = $userIdFilter;
}

if (!empty($dateFilter)) {
    $conditions[] = 'DATE(al.created_at) = ?';
    $params[] = $dateFilter;
} else {
    if (!empty($dateFrom)) {
        $conditions[] = 'DATE(al.created_at) >= ?';
        $params[] = $dateFrom;
    }
    if (!empty($dateTo)) {
        $conditions[] = 'DATE(al.created_at) <= ?';
        $params[] = $dateTo;
    }
}

if (!empty($conditions)) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}

$sql .= ' ORDER BY al.created_at DESC LIMIT 100';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$logs = $stmt->fetchAll();

foreach ($logs as &$log) {
    $log['id'] = (int)$log['id'];
    $log['user_id'] = $log['user_id'] !== null ? (int)$log['user_id'] : null;
    $log['entity_id'] = $log['entity_id'] !== null ? (int)$log['entity_id'] : null;
}
unset($log);

// Also fetch distinct actions and entity types for quick UI filter dropdowns
$actionsStmt = $pdo->query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
$availableActions = $actionsStmt ? $actionsStmt->fetchAll(PDO::FETCH_COLUMN) : [];

$entitiesStmt = $pdo->query('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type ASC');
$availableEntities = $entitiesStmt ? $entitiesStmt->fetchAll(PDO::FETCH_COLUMN) : [];

sendSuccess('Audit trail logs retrieved successfully.', [
    'filters' => [
        'action'      => $actionFilter ?: null,
        'entity_type' => $entityFilter ?: null,
        'user_id'     => $userIdFilter ?: null,
        'date'        => $dateFilter ?: null,
        'date_from'   => $dateFrom ?: null,
        'date_to'     => $dateTo ?: null,
    ],
    'options' => [
        'actions'      => $availableActions,
        'entity_types' => $availableEntities,
    ],
    'total_returned' => count($logs),
    'logs'           => $logs,
]);
