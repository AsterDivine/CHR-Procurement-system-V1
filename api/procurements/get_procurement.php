<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_procurement.php
 * =============================================================================
 * 
 * Retrieves full details for a single procurement record by ID.
 * Returns the procurement master record, line items, submitted bidder quotations,
 * and chronological transaction history for audit transparency.
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
 * @param PDO $pdo Active database connection.
 * @param int $id  Procurement primary key ID.
 * @return array|null Procurement record or null if not found.
 */
function fetchProcurementById($pdo, $id) {
    // Selects the master record from procurements table
    $stmt = $pdo->prepare('
        SELECT 
            p.*,
            wb.bidder_name AS awarded_bidder_name,
            wb.representative_name AS awarded_representative_name,
            wb.email AS awarded_email,
            wb.contact_number AS awarded_contact
        FROM procurements p
        LEFT JOIN bids wb ON p.awarded_bid_id = wb.id
        WHERE p.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $procurement = $stmt->fetch();

    if ($procurement) {
        $procurement['id']             = (int)$procurement['id'];
        $procurement['abc']            = (float)$procurement['abc'];
        $procurement['awarded_bid_id'] = $procurement['awarded_bid_id'] !== null ? (int)$procurement['awarded_bid_id'] : null;
        $procurement['awarded_amount'] = $procurement['awarded_amount'] !== null ? (float)$procurement['awarded_amount'] : null;
        $procurement['savings']        = $procurement['savings'] !== null ? (float)$procurement['savings'] : null;
    }

    return $procurement ?: null;
}

/**
 * Loads all line-item specifications belonging to a procurement.
 * Used by: React component ProcurementDetails.jsx and ProcurementForm.jsx.
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database table affected: Reads from 'procurement_items'.
 *
 * @param PDO $pdo           Active database connection.
 * @param int $procurementId Procurement primary key ID.
 * @return array Array of procurement line items.
 */
function fetchProcurementItems($pdo, $procurementId) {
    // Selects line items associated with this procurement
    $stmt = $pdo->prepare('
        SELECT 
            id,
            procurement_id,
            item_name,
            specifications,
            quantity,
            unit,
            estimated_unit_cost
        FROM procurement_items
        WHERE procurement_id = ?
        ORDER BY id ASC
    ');
    $stmt->execute([$procurementId]);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
        $item['id']                  = (int)$item['id'];
        $item['procurement_id']      = (int)$item['procurement_id'];
        $item['quantity']            = (float)$item['quantity'];
        $item['estimated_unit_cost'] = $item['estimated_unit_cost'] !== null ? (float)$item['estimated_unit_cost'] : null;
    }
    unset($item);

    return $items;
}

/**
 * Loads all supplier bids submitted for a procurement.
 * Used by: React component CHRBidTable.jsx inside ProcurementDetails.jsx.
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database table affected: Reads from 'bids'.
 *
 * @param PDO $pdo           Active database connection.
 * @param int $procurementId Procurement primary key ID.
 * @return array Array of bids submitted by suppliers.
 */
function fetchProcurementBids($pdo, $procurementId) {
    // Selects all quotations submitted for this procurement, ranked by bid_amount ascending
    $stmt = $pdo->prepare('
        SELECT 
            id,
            procurement_id,
            bidder_name,
            representative_name,
            contact_number,
            email,
            bid_amount,
            remarks,
            status,
            created_at,
            updated_at
        FROM bids
        WHERE procurement_id = ?
        ORDER BY bid_amount ASC, created_at ASC
    ');
    $stmt->execute([$procurementId]);
    $bids = $stmt->fetchAll();

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
 * Used by: React component TransactionHistory.jsx inside ProcurementDetails.jsx.
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database table affected: Reads from 'transaction_history'.
 *
 * @param PDO $pdo           Active database connection.
 * @param int $procurementId Procurement primary key ID.
 * @return array Array of audit history entries.
 */
function fetchProcurementHistory($pdo, $procurementId) {
    // Selects all logged actions and status changes for this procurement
    $stmt = $pdo->prepare('
        SELECT 
            id,
            procurement_id,
            action,
            previous_status,
            new_status,
            remarks,
            performed_by,
            created_at
        FROM transaction_history
        WHERE procurement_id = ?
        ORDER BY created_at DESC, id DESC
    ');
    $stmt->execute([$procurementId]);
    $history = $stmt->fetchAll();

    foreach ($history as &$h) {
        $h['id']             = (int)$h['id'];
        $h['procurement_id'] = (int)$h['procurement_id'];
    }
    unset($h);

    return $history;
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Validate requested procurement ID
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    sendError('A valid procurement ID is required.', null, 422);
}

// 3. Load all connected relational records
$procurement = fetchProcurementById($pdo, $id);
if (!$procurement) {
    sendError('Procurement record not found.', null, 404);
}

$procurement['items']   = fetchProcurementItems($pdo, $id);
$procurement['bids']    = fetchProcurementBids($pdo, $id);
$procurement['history'] = fetchProcurementHistory($pdo, $id);

sendSuccess('Procurement details retrieved successfully.', [
    'procurement' => $procurement,
]);
