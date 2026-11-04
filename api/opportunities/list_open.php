<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/opportunities/list_open.php
 * =============================================================================
 * 
 * Lists currently active procurement opportunities for logged-in users (bidders/CHR).
 * Returns only opportunities with status='open' whose deadline has not expired.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Ensure user is logged in
requireLogin();

$pdo = getDBConnection();

// Fetch open opportunities with deadline in the future
$stmt = $pdo->prepare('
    SELECT 
        o.id,
        o.reference_no,
        o.title,
        o.description,
        o.procurement_type,
        o.abc,
        o.deadline,
        o.status,
        o.created_at,
        COUNT(i.id) AS total_items
    FROM procurement_opportunities o
    LEFT JOIN opportunity_items i ON o.id = i.opportunity_id
    WHERE o.status = "open" AND o.deadline >= NOW()
    GROUP BY o.id
    ORDER BY o.deadline ASC
');

$stmt->execute();
$opportunities = $stmt->fetchAll();

// Format numbers for JSON
foreach ($opportunities as &$row) {
    $row['id']          = (int)$row['id'];
    $row['abc']         = (float)$row['abc'];
    $row['total_items'] = (int)$row['total_items'];
}
unset($row);

sendSuccess('Active open opportunities retrieved successfully.', [
    'count'         => count($opportunities),
    'opportunities' => $opportunities,
]);
