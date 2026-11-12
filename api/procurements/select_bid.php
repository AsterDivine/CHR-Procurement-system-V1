<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/select_bid.php
 * =============================================================================
 * 
 * Allows CHR Personnel to select the winning bidder quotation for a procurement.
 * Uses pure PHP MySQLi prepared statements.
 * Transparently updates:
 * 1. The selected bid status to 'Selected' and others to 'Not Selected'
 * 2. The procurement record:
 *    - awarded_amount = selected bid quotation amount
 *    - savings = abc - awarded_amount (automatic financial calculation)
 *    - status = 'Awarded'
 * 3. Appends an audit entry into `transaction_history` recording the winner and savings.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Marks a bid as selected, sets awarded financials, and logs the award event.
 * Used by: React component CHRBids.jsx and ProcurementDetails.jsx.
 * Connects to: Endpoint /api/procurements/select_bid.php
 * Database tables affected: Updates 'bids' and 'procurements', writes to 'transaction_history'.
 *
 * @param mysqli $conn Active MySQLi database connection.
 * @param array  $data Input payload containing bid_id and optional remarks.
 * @return array Updated financial metrics (abc, awarded_amount, savings).
 */
function selectWinningBid($conn, $data) {
    $bidId   = filter_var($data['bid_id'] ?? null, FILTER_VALIDATE_INT);
    $remarks = trim($data['remarks'] ?? '');

    if (!$bidId) {
        sendError('A valid bid ID is required.', null, 422);
    }

    $stmt = $conn->prepare('
        SELECT 
            b.id AS bid_id,
            b.procurement_id,
            b.bidder_name,
            b.company_name,
            b.bid_amount,
            b.status AS bid_status,
            p.reference_no,
            p.title AS procurement_title,
            p.abc,
            p.status AS procurement_status
        FROM bids b
        JOIN procurements p ON b.procurement_id = p.id
        WHERE b.id = ?
        LIMIT 1
    ');
    if (!$stmt) {
        sendError('SQL prepare failed: ' . $conn->error, null, 500);
    }

    $stmt->bind_param('i', $bidId);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result->fetch_assoc();
    $stmt->close();

    if (!$record) {
        sendError('Bid record or associated procurement not found.', null, 404);
    }

    $procurementId = (int)$record['procurement_id'];
    $abc           = (float)$record['abc'];
    $awardedAmount = (float)$record['bid_amount'];

    // Transparent calculation of procurement savings: ABC - Awarded Amount
    $savings = $abc - $awardedAmount;

    // Safety validation: Awarded amount must not exceed the ABC
    if ($awardedAmount > $abc) {
        sendError(
            sprintf(
                'Cannot award bid: Quoted amount (PHP %s) exceeds the Approved Budget for the Contract ABC (PHP %s).',
                number_format($awardedAmount, 2),
                number_format($abc, 2)
            ),
            null,
            422
        );
    }

    $conn->begin_transaction();

    try {
        // 1. Mark winning bid as 'Selected'
        $updateBidStmt = $conn->prepare('UPDATE bids SET status = "Selected" WHERE id = ?');
        if (!$updateBidStmt) {
            throw new Exception('SQL prepare error: ' . $conn->error);
        }
        $updateBidStmt->bind_param('i', $bidId);
        $updateBidStmt->execute();
        $updateBidStmt->close();

        // Mark other bids for this procurement as 'Not Selected'
        $otherBidsStmt = $conn->prepare('UPDATE bids SET status = "Not Selected" WHERE procurement_id = ? AND id != ?');
        if (!$otherBidsStmt) {
            throw new Exception('SQL prepare error: ' . $conn->error);
        }
        $otherBidsStmt->bind_param('ii', $procurementId, $bidId);
        $otherBidsStmt->execute();
        $otherBidsStmt->close();

        // 2. Updates the procurement record with awarded amount, savings, and status 'Awarded'
        $updateProcStmt = $conn->prepare('
            UPDATE procurements
            SET 
                awarded_amount = ?,
                savings = ?,
                status = "Awarded",
                updated_at = NOW()
            WHERE id = ?
        ');
        if (!$updateProcStmt) {
            throw new Exception('SQL prepare error: ' . $conn->error);
        }
        $updateProcStmt->bind_param('ddi', $awardedAmount, $savings, $procurementId);
        $updateProcStmt->execute();
        $updateProcStmt->close();

        // 3. Formulate audit log remarks
        $winnerCompany = !empty($record['company_name']) ? $record['company_name'] : $record['bidder_name'];
        $awardNotes = !empty($remarks)
            ? $remarks
            : sprintf(
                'Selected "%s" as winning quotation at PHP %s. Realized procurement savings: PHP %s.',
                $winnerCompany,
                number_format($awardedAmount, 2),
                number_format($savings, 2)
            );

        // Inserts the award event into the transaction_history audit table
        $histStmt = $conn->prepare('
            INSERT INTO transaction_history (
                procurement_id,
                action,
                old_value,
                new_value,
                remarks,
                created_at
            ) VALUES (?, "Contract Awarded", ?, "Awarded", ?, NOW())
        ');
        if (!$histStmt) {
            throw new Exception('SQL prepare error: ' . $conn->error);
        }
        $oldStatus = (string)$record['procurement_status'];
        $histStmt->bind_param('iss', $procurementId, $oldStatus, $awardNotes);
        $histStmt->execute();
        $histStmt->close();

        $conn->commit();

        return [
            'procurement_id'      => $procurementId,
            'reference_no'        => $record['reference_no'],
            'reference_number'    => $record['reference_no'],
            'awarded_bid_id'      => $bidId,
            'winning_bidder_name' => $winnerCompany,
            'abc'                 => $abc,
            'awarded_amount'      => $awardedAmount,
            'savings'             => $savings,
            'savings_percentage'  => $abc > 0 ? round(($savings / $abc) * 100, 2) : 0,
            'status'              => 'Awarded',
        ];
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to record winning bid award: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$conn = getDbConnection();

// 2. Parse input JSON payload
$input = getJsonInput();

// 3. Select bid in MySQL
$result = selectWinningBid($conn, $input);

sendSuccess('Winning bid selected and procurement updated successfully.', $result);
