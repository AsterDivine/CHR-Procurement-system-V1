<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_procurements.php
 * =============================================================================
 * 
 * Retrieves the centralized list of all procurement records from MySQL.
 * Supports optional filtering by status (e.g. 'Draft', 'Published / Open', 'Awarded').
 * Also computes the number of submitted bids and attached line items per procurement.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Fetches all procurement records matching the optional status filter from MySQL.
 * Used by: React component ProcurementTable.jsx, CHRDashboard.jsx, and BidderOpportunities.jsx.
 * Connects to: Endpoint /api/procurements/get_procurements.php
 * Database tables affected: Reads from 'procurements', 'bids', and 'procurement_items'.
 *
 * @param PDO    $pdo    Active database connection.
 * @param string $status Optional status filter string.
 * @return array List of procurement records with formatted financial values.
 */
function fetchProcurementList($pdo, $status = '') {
    $sql = '
        SELECT 
            p.id,
            p.reference_number,
            p.title,
            p.description,
            p.procurement_mode,
            p.abc,
            p.deadline,
            p.status,
            p.current_stage,
            p.awarded_bid_id,
            p.awarded_amount,
            p.savings,
            p.created_at,
            p.updated_at,
            COUNT(DISTINCT b.id) AS total_bids,
            COUNT(DISTINCT i.id) AS total_items,
            wb.bidder_name AS awarded_bidder_name
        FROM procurements p
        LEFT JOIN bids b ON p.id = b.procurement_id
        LEFT JOIN procurement_items i ON p.id = i.procurement_id
        LEFT JOIN bids wb ON p.awarded_bid_id = wb.id
    ';

    $params = [];
    if (!empty($status)) {
        $sql .= ' WHERE p.status = ? ';
        $params[] = $status;
    }

    $sql .= ' GROUP BY p.id ORDER BY p.created_at DESC ';

    // Executes the prepared SQL query on the procurements table
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $records = $stmt->fetchAll();

    // Format numeric data types cleanly for JSON output
    foreach ($records as &$row) {
        $row['id']             = (int)$row['id'];
        $row['abc']            = (float)$row['abc'];
        $row['awarded_bid_id'] = $row['awarded_bid_id'] !== null ? (int)$row['awarded_bid_id'] : null;
        $row['awarded_amount'] = $row['awarded_amount'] !== null ? (float)$row['awarded_amount'] : null;
        $row['savings']        = $row['savings'] !== null ? (float)$row['savings'] : null;
        $row['total_bids']     = (int)$row['total_bids'];
        $row['total_items']    = (int)$row['total_items'];
    }
    unset($row);

    return $records;
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Read optional query parameters
$statusFilter = trim($_GET['status'] ?? '');

// 3. Fetch data and send JSON response
$procurements = fetchProcurementList($pdo, $statusFilter);

sendSuccess('Procurement records retrieved successfully.', [
    'count'        => count($procurements),
    'procurements' => $procurements,
]);
