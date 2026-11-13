<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_procurements.php
 * =============================================================================
 * 
 * Pure PHP endpoint that performs a SELECT query on the MySQL `procurements` table.
 * Sorts newest procurement records first (created_at DESC, id DESC) and returns JSON.
 * Uses MySQLi prepared statements and centralized connection from database.php.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Fetches procurement records from the MySQL `procurements` table (newest first).
 * Supports an optional status query parameter (?status=Open, etc.).
 * Used by: React page ProcurementTable.jsx, CHRDashboard.jsx, and BidderOpportunities.jsx.
 * Connects to: Endpoint GET /api/procurements/get_procurements.php
 * Database tables affected: Reads from `procurements` and aggregates count from `bids`.
 *
 * @param mysqli $conn   Active MySQLi database connection from getDbConnection().
 * @param string $status Optional procurement status filter string.
 * @return array List of procurement rows from MySQL sorted newest first.
 */
function fetchProcurementList($conn, $status = '') {
    $sql = '
        SELECT 
            p.id,
            p.reference_no,
            p.reference_no AS reference_number,
            p.title,
            p.description,
            p.procurement_type,
            p.procurement_type AS procurement_mode,
            p.abc,
            p.budget_source,
            p.deadline,
            p.status,
            p.awarded_amount,
            p.savings,
            p.created_at,
            p.updated_at,
            COUNT(DISTINCT b.id) AS total_bids,
            (SELECT b2.company_name FROM bids b2 WHERE b2.procurement_id = p.id AND b2.status = "Selected" LIMIT 1) AS awarded_bidder_name
        FROM procurements p
        LEFT JOIN bids b ON p.id = b.procurement_id
    ';

    if ($status !== '') {
        $sql .= ' WHERE p.status = ? ';
    }

    // Sort newest records first
    $sql .= ' GROUP BY p.id ORDER BY p.created_at DESC, p.id DESC ';

    // Prepare and execute SQL SELECT statement
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log('get_procurements prepare failed: ' . $conn->error);
        sendError('Unable to retrieve procurement records from the database.', null, 500);
    }

    if ($status !== '') {
        $stmt->bind_param('s', $status);
    }

    if (!$stmt->execute()) {
        error_log('get_procurements execute failed: ' . $stmt->error);
        $stmt->close();
        sendError('Unable to retrieve procurement records from the database.', null, 500);
    }

    $result = $stmt->get_result();
    $records = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Normalize numeric types cleanly for JSON output
    foreach ($records as &$row) {
        $row['id']             = (int)$row['id'];
        $row['abc']            = (float)$row['abc'];
        $row['awarded_amount'] = $row['awarded_amount'] !== null ? (float)$row['awarded_amount'] : null;
        $row['savings']        = $row['savings'] !== null ? (float)$row['savings'] : null;
        $row['total_bids']     = (int)$row['total_bids'];
    }
    unset($row);

    return $records;
}

// 1. Establish MySQLi database connection
$conn = getDbConnection();

// 2. Read optional query parameter (?status=...)
$statusFilter = trim((string)($_GET['status'] ?? ''));

// 3. Query MySQL `procurements` table and return JSON
$procurements = fetchProcurementList($conn, $statusFilter);

sendSuccess('Procurement records retrieved successfully.', [
    'count'        => count($procurements),
    'procurements' => $procurements,
]);
