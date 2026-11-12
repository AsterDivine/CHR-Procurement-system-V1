<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/get_bids.php
 * =============================================================================
 * 
 * Retrieves all submitted bidder quotations from MySQL.
 * Can filter by a specific procurement_id (via query param ?procurement_id=X)
 * or return all recent bids across all projects for CHR review and tracking.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Fetches submitted quotations with connected procurement details from MySQL.
 * Used by: React component CHRBidTable.jsx and BidderSubmittedQuotations.jsx.
 * Connects to: Endpoint /api/procurements/get_bids.php?procurement_id=X
 * Database tables affected: Reads from 'bids' and 'procurements'.
 *
 * @param PDO      $pdo           Active database connection.
 * @param int|null $procurementId Optional procurement filter.
 * @return array Array of bids with connected project titles and ABC values.
 */
function fetchBidList($pdo, $procurementId = null) {
    $sql = '
        SELECT 
            b.id,
            b.procurement_id,
            b.bidder_name,
            b.representative_name,
            b.contact_number,
            b.email,
            b.bid_amount,
            b.remarks,
            b.status,
            b.created_at,
            b.updated_at,
            p.reference_number AS procurement_reference,
            p.title AS procurement_title,
            p.abc AS procurement_abc,
            p.status AS procurement_status,
            (p.abc - b.bid_amount) AS potential_savings
        FROM bids b
        JOIN procurements p ON b.procurement_id = p.id
    ';

    $params = [];
    if ($procurementId) {
        $sql .= ' WHERE b.procurement_id = ? ';
        $params[] = $procurementId;
    }

    $sql .= ' ORDER BY b.created_at DESC, b.bid_amount ASC ';

    // Queries the bids table joined with procurements
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bids = $stmt->fetchAll();

    foreach ($bids as &$b) {
        $b['id']                = (int)$b['id'];
        $b['procurement_id']    = (int)$b['procurement_id'];
        $b['bid_amount']        = (float)$b['bid_amount'];
        $b['procurement_abc']   = (float)$b['procurement_abc'];
        $b['potential_savings'] = (float)$b['potential_savings'];
    }
    unset($b);

    return $bids;
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Read optional procurement filter
$procurementId = filter_input(INPUT_GET, 'procurement_id', FILTER_VALIDATE_INT);

// 3. Fetch data and send JSON response
$bids = fetchBidList($pdo, $procurementId);

sendSuccess('Submitted bidder quotations retrieved successfully.', [
    'count' => count($bids),
    'bids'  => $bids,
]);
