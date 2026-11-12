<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/select_bid.php
 * =============================================================================
 * 
 * Allows CHR Personnel to select the winning bidder quotation for a procurement.
 * Transparently updates:
 * 1. The selected bid status to 'Selected / Awarded'
 * 2. The procurement record:
 *    - awarded_bid_id = selected bid ID
 *    - awarded_amount = selected bid quotation amount
 *    - savings = ABC - awarded_amount (automatic financial calculation)
 *    - status = 'Awarded'
 *    - current_stage = 'Notice of Award'
 * 3. Appends an audit entry into transaction_history recording the winner and savings.
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
 * Used by: React component CHRBidTable.jsx.
 * Connects to: Endpoint /api/procurements/select_bid.php
 * Database tables affected: Updates 'bids' and 'procurements', writes to 'transaction_history'.
 *
 * @param PDO   $pdo  Active database connection.
 * @param array $data Input payload containing bid_id and optional remarks.
 * @return array Updated financial metrics (ABC, awarded_amount, savings).
 */
function selectWinningBid($pdo, $data) {
    $bidId   = filter_var($data['bid_id'] ?? null, FILTER_VALIDATE_INT);
    $remarks = trim($data['remarks'] ?? '');

    if (!$bidId) {
        sendError('A valid bid ID is required.', null, 422);
    }

    // Fetches the selected bid along with its parent procurement
    // Joins the bids table with procurements table
    $stmt = $pdo->prepare('
        SELECT 
            b.id AS bid_id,
            b.procurement_id,
            b.bidder_name,
            b.representative_name,
            b.bid_amount,
            b.status AS bid_status,
            p.reference_number,
            p.title AS procurement_title,
            p.abc,
            p.status AS procurement_status
        FROM bids b
        JOIN procurements p ON b.procurement_id = p.id
        WHERE b.id = ?
        LIMIT 1
    ');
    $stmt->execute([$bidId]);
    $record = $stmt->fetch();

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

    $pdo->beginTransaction();

    try {
        // 1. Updates the selected bid's status in the bids table
        $updateBidStmt = $pdo->prepare('
            UPDATE bids 
            SET status = "Selected / Awarded", updated_at = NOW() 
            WHERE id = ?
        ');
        $updateBidStmt->execute([$bidId]);

        // 2. Updates the procurement record with the winning bid, awarded amount, savings, and status
        $updateProcStmt = $pdo->prepare('
            UPDATE procurements
            SET 
                awarded_bid_id = ?,
                awarded_amount = ?,
                savings = ?,
                status = "Awarded",
                current_stage = "Notice of Award",
                updated_at = NOW()
            WHERE id = ?
        ');
        $updateProcStmt->execute([
            $bidId,
            $awardedAmount,
            $savings,
            $procurementId,
        ]);

        // 3. Formulate audit log remarks
        $awardNotes = !empty($remarks)
            ? $remarks
            : sprintf(
                'Selected "%s" as winning quotation at PHP %s. Realized procurement savings: PHP %s.',
                $record['bidder_name'],
                number_format($awardedAmount, 2),
                number_format($savings, 2)
            );

        // Inserts the award event into the transaction_history audit table
        $histStmt = $pdo->prepare('
            INSERT INTO transaction_history (
                procurement_id,
                action,
                previous_status,
                new_status,
                remarks,
                performed_by,
                created_at
            ) VALUES (?, "Bid Awarded", ?, "Awarded", ?, "CHR BAC Committee", NOW())
        ');
        $histStmt->execute([
            $procurementId,
            $record['procurement_status'],
            $awardNotes,
        ]);

        $pdo->commit();

        return [
            'procurement_id'      => $procurementId,
            'reference_number'    => $record['reference_number'],
            'awarded_bid_id'      => $bidId,
            'winning_bidder_name' => $record['bidder_name'],
            'abc'                 => $abc,
            'awarded_amount'      => $awardedAmount,
            'savings'             => $savings,
            'savings_percentage'  => $abc > 0 ? round(($savings / $abc) * 100, 2) : 0,
            'status'              => 'Awarded',
            'current_stage'       => 'Notice of Award',
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError('Failed to record winning bid award: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Parse input JSON payload
$input = getJsonInput();

// 3. Select bid in MySQL
$result = selectWinningBid($pdo, $input);

sendSuccess('Winning bid selected and procurement updated successfully.', $result);
