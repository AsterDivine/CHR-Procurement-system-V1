<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/create_bid.php
 * =============================================================================
 * 
 * Allows a prospective supplier/bidder to submit an official price quotation.
 * In this 50% prototype, bidders submit directly with their company credentials
 * without requiring account registration, session login, or file uploads.
 * Records the quotation in the bids table and logs the submission into transaction_history.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Validates and records a supplier's bid quotation in MySQL.
 * Used by: React component BidderQuotationForm.jsx.
 * Connects to: Endpoint /api/procurements/create_bid.php
 * Database tables affected: Writes to 'bids' and 'transaction_history'. Reads from 'procurements'.
 *
 * @param PDO   $pdo  Active database connection.
 * @param array $data Input payload containing procurement_id, bidder_name, representative_name, contact, email, bid_amount, remarks.
 * @return int Primary key ID of the newly inserted bid record.
 */
function createBidQuotation($pdo, $data) {
    $procurementId      = filter_var($data['procurement_id'] ?? null, FILTER_VALIDATE_INT);
    $bidderName         = trim($data['bidder_name'] ?? '');
    $representativeName = trim($data['representative_name'] ?? '');
    $contactNumber      = trim($data['contact_number'] ?? '');
    $email              = trim($data['email'] ?? '');
    $bidAmount          = $data['bid_amount'] ?? null;
    $remarks            = trim($data['remarks'] ?? '');

    // Form field validation
    if (!$procurementId) {
        sendError('A valid procurement ID is required.', null, 422);
    }
    if (empty($bidderName)) {
        sendError('Supplier / Company Name is required.', null, 422);
    }
    if (empty($representativeName)) {
        sendError('Authorized Representative Name is required.', null, 422);
    }
    if (empty($contactNumber)) {
        sendError('Contact Number is required.', null, 422);
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('A valid Email Address is required.', null, 422);
    }
    if (!is_numeric($bidAmount) || (float)$bidAmount <= 0) {
        sendError('Bid Quotation Amount must be a valid positive number.', null, 422);
    }

    $bidAmount = (float)$bidAmount;

    // Verify procurement exists and is open for bidding
    // Queries the procurements table to check project status
    $stmt = $pdo->prepare('SELECT id, reference_number, title, abc, status, deadline FROM procurements WHERE id = ? LIMIT 1');
    $stmt->execute([$procurementId]);
    $procurement = $stmt->fetch();

    if (!$procurement) {
        sendError('Procurement project not found.', null, 404);
    }

    // Prototype rule: can submit bids on 'Published / Open' projects
    if ($procurement['status'] !== 'Published / Open') {
        sendError(sprintf('Cannot submit quotation: This procurement is currently "%s" (must be "Published / Open").', $procurement['status']), null, 422);
    }

    $pdo->beginTransaction();

    try {
        // Inserts the new supplier quotation into the bids table
        $insertStmt = $pdo->prepare('
            INSERT INTO bids (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, "Submitted", NOW(), NOW())
        ');

        $insertStmt->execute([
            $procurementId,
            $bidderName,
            $representativeName,
            $contactNumber,
            $email,
            $bidAmount,
            $remarks,
        ]);

        $bidId = (int)$pdo->lastInsertId();

        // Inserts the quotation event into the transaction_history audit table
        $histStmt = $pdo->prepare('
            INSERT INTO transaction_history (
                procurement_id,
                action,
                previous_status,
                new_status,
                remarks,
                performed_by,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');

        $histStmt->execute([
            $procurementId,
            'Bid Submitted',
            $procurement['status'],
            $procurement['status'],
            sprintf('Quotation submitted by "%s" (Amount: PHP %s). Notes: %s', $bidderName, number_format($bidAmount, 2), $remarks ?: 'None provided.'),
            $bidderName . ' (' . $representativeName . ')',
        ]);

        $pdo->commit();

        return $bidId;
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError('Failed to submit bid quotation: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Parse input JSON payload
$input = getJsonInput();

// 3. Record bid in MySQL
$bidId = createBidQuotation($pdo, $input);

sendSuccess('Quotation submitted successfully.', [
    'bid_id' => $bidId,
], 201);
