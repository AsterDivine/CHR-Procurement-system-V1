<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_procurements.php
 * =============================================================================
 * 
 * Retrieves the centralized list of all procurement records from MySQL.
 * Uses pure PHP MySQLi prepared statements.
 * Matches the schema: table `procurements` (reference_no, procurement_type, budget_source).
 * Supports optional filtering by status (e.g. 'Open', 'For Evaluation', 'Awarded').
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Fetches all procurement records matching the optional status filter from MySQL.
 * Used by: React component ProcurementTable.jsx, CHRDashboard.jsx, and BidderOpportunities.jsx.
 * Connects to: Endpoint /api/procurements/get_procurements.php
 * Database tables affected: Reads from 'procurements' and 'bids'.
 *
 * @param mysqli $conn   Active MySQLi database connection.
 * @param string $status Optional status filter string.
 * @return array List of procurement records with formatted financial values.
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

    if (!empty($status)) {
        $sql .= ' WHERE p.status = ? ';
    }

    $sql .= ' GROUP BY p.id ORDER BY p.created_at DESC ';

    // Prepare and execute query with mysqli prepared statements
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        sendError('SQL prepare failed: ' . $conn->error, null, 500);
    }

    if (!empty($status)) {
        $stmt->bind_param('s', $status);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $records = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Format numeric data types cleanly for JSON output
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

// 1. Establish database connection
$conn = getDbConnection();

// 2. Read optional query parameters
$statusFilter = trim($_GET['status'] ?? '');

// 3. Fetch data and send JSON response
$procurements = fetchProcurementList($conn, $statusFilter);

sendSuccess('Procurement records retrieved successfully.', [
    'count'        => count($procurements),
    'procurements' => $procurements,
]);
