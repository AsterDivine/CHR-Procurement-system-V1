<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_procurement.php
 * =============================================================================
 * 
 * Retrieves full details for a single procurement record by ID.
 * Uses pure PHP MySQLi prepared statements.
 * Queries the 3 core tables: `procurements`, `bids`, and `transaction_history`.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Loads a single procurement record by its primary key ID.
 * Used by: React component ProcurementDetails.jsx and ProcurementForm.jsx (Edit Mode).
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database table affected: Reads from 'procurements'.
 *
 * @param mysqli $conn Active MySQLi database connection.
 * @param int    $id   Procurement primary key ID.
 * @return array|null Procurement record or null if not found.
 */
function fetchProcurementById($conn, $id) {
    $stmt = $conn->prepare('
        SELECT 
            p.*,
            p.reference_no AS reference_number,
            p.procurement_type AS procurement_mode,
            (SELECT b.company_name FROM bids b WHERE b.procurement_id = p.id AND b.status = "Selected" LIMIT 1) AS awarded_bidder_name,
            (SELECT b.bidder_name FROM bids b WHERE b.procurement_id = p.id AND b.status = "Selected" LIMIT 1) AS awarded_representative_name
        FROM procurements p
        WHERE p.id = ?
        LIMIT 1
    ');
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $procurement = $result->fetch_assoc();
    $stmt->close();

    if ($procurement) {
        $procurement['id']             = (int)$procurement['id'];
        $procurement['abc']            = (float)$procurement['abc'];
        $procurement['awarded_amount'] = $procurement['awarded_amount'] !== null ? (float)$procurement['awarded_amount'] : null;
        $procurement['savings']        = $procurement['savings'] !== null ? (float)$procurement['savings'] : null;
    }

    return $procurement ?: null;
}

/**
 * Loads all supplier bids submitted for a procurement.
 * Used by: React component CHRBidTable.jsx inside ProcurementDetails.jsx.
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database table affected: Reads from 'bids'.
 *
 * @param mysqli $conn          Active MySQLi database connection.
 * @param int    $procurementId Procurement primary key ID.
 * @return array Array of bids submitted by suppliers.
 */
function fetchProcurementBids($conn, $procurementId) {
    $stmt = $conn->prepare('
        SELECT 
            id,
            procurement_id,
            bidder_name,
            company_name,
            company_name AS representative_name,
            bid_amount,
            remarks,
            status,
            submitted_at,
            submitted_at AS created_at
        FROM bids
        WHERE procurement_id = ?
        ORDER BY bid_amount ASC, submitted_at ASC
    ');
    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('i', $procurementId);
    $stmt->execute();
    $result = $stmt->get_result();
    $bids = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($bids as &$b) {
        $b['id']             = (int)$b['id'];
        $b['procurement_id'] = (int)$b['procurement_id'];
        $b['bid_amount']     = (float)$b['bid_amount'];
    }
    unset($b);

    return $bids;
}

/**
 * Loads the chronological transaction and status history for a procurement.
 * Used by: React component inside ProcurementDetails.jsx.
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database table affected: Reads from 'transaction_history'.
 *
 * @param mysqli $conn          Active MySQLi database connection.
 * @param int    $procurementId Procurement primary key ID.
 * @return array Array of audit history entries.
 */
function fetchProcurementHistory($conn, $procurementId) {
    $stmt = $conn->prepare('
        SELECT 
            id,
            procurement_id,
            action,
            old_value,
            new_value,
            old_value AS previous_status,
            new_value AS new_status,
            remarks,
            created_at
        FROM transaction_history
        WHERE procurement_id = ?
        ORDER BY created_at DESC, id DESC
    ');
    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('i', $procurementId);
    $stmt->execute();
    $result = $stmt->get_result();
    $history = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($history as &$h) {
        $h['id']             = (int)$h['id'];
        $h['procurement_id'] = (int)$h['procurement_id'];
    }
    unset($h);

    return $history;
}

// 1. Establish database connection
$conn = getDbConnection();

// 2. Validate requested procurement ID
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    sendError('A valid procurement ID is required.', null, 422);
}

// 3. Load all connected relational records
$procurement = fetchProcurementById($conn, $id);
if (!$procurement) {
    sendError('Procurement record not found.', null, 404);
}

$procurement['items']   = []; // Items table omitted in 3-table minimum schema
$procurement['bids']    = fetchProcurementBids($conn, $id);
$procurement['history'] = fetchProcurementHistory($conn, $id);

sendSuccess('Procurement details retrieved successfully.', [
    'procurement' => $procurement,
]);
