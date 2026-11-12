<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/create_procurement.php
 * =============================================================================
 * 
 * Inserts a new procurement project into MySQL table `procurements`.
 * Uses pure PHP MySQLi prepared statements.
 * Also writes an initial creation log to the `transaction_history` audit table.
 * Uses a MySQLi transaction (begin_transaction/commit) to ensure atomic storage.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Validates and inserts a procurement master record into MySQL.
 * Used by: React component ProcurementForm.jsx (Create Mode).
 * Connects to: Endpoint /api/procurements/create_procurement.php
 * Database tables affected: Writes to 'procurements' and 'transaction_history'.
 *
 * @param mysqli $conn Active MySQLi database connection.
 * @param array  $data Input form data payload.
 * @return int Primary key ID of the newly created procurement record.
 */
function createProcurementRecord($conn, $data) {
    // 1. Sanitize and validate input fields
    $refNo           = trim($data['reference_no'] ?? $data['reference_number'] ?? '');
    $title           = trim($data['title'] ?? '');
    $description     = trim($data['description'] ?? '');
    $procurementType = trim($data['procurement_type'] ?? $data['procurement_mode'] ?? 'NP-53.9 Small Value Procurement');
    $budgetSource    = trim($data['budget_source'] ?? 'General Appropriations Act (GAA)');
    $abc             = $data['abc'] ?? null;
    $deadline        = trim($data['deadline'] ?? '');
    $status          = trim($data['status'] ?? 'Open');

    if (empty($refNo)) {
        sendError('Reference Number is required (e.g. CHR-CAR-2024-001).', null, 422);
    }
    if (empty($title)) {
        sendError('Project Title is required.', null, 422);
    }
    if (!is_numeric($abc) || (float)$abc <= 0) {
        sendError('Approved Budget for the Contract (ABC) must be a positive number.', null, 422);
    }
    if (empty($deadline) || strtotime($deadline) === false) {
        sendError('A valid submission deadline date is required.', null, 422);
    }

    $formattedDeadline = date('Y-m-d', strtotime($deadline));

    // Check unique reference_no
    $checkStmt = $conn->prepare('SELECT id FROM procurements WHERE reference_no = ? LIMIT 1');
    if ($checkStmt) {
        $checkStmt->bind_param('s', $refNo);
        $checkStmt->execute();
        $checkStmt->store_result();
        if ($checkStmt->num_rows > 0) {
            $checkStmt->close();
            sendError(sprintf('Reference Number "%s" is already registered.', $refNo), null, 409);
        }
        $checkStmt->close();
    }

    $conn->begin_transaction();

    try {
        // 2. Insert into procurements table
        $stmt = $conn->prepare('
            INSERT INTO procurements (
                reference_no,
                title,
                description,
                procurement_type,
                abc,
                budget_source,
                deadline,
                status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        if (!$stmt) {
            throw new Exception('SQL prepare failed for procurement: ' . $conn->error);
        }

        $abcFloat = (float)$abc;
        $stmt->bind_param(
            'ssssdsss',
            $refNo,
            $title,
            $description,
            $procurementType,
            $abcFloat,
            $budgetSource,
            $formattedDeadline,
            $status
        );
        $stmt->execute();
        $newProcurementId = (int)$conn->insert_id;
        $stmt->close();

        // 3. Log initial creation in transaction_history
        $action = 'Procurement Created';
        $remarks = sprintf('Procurement record "%s" created in CHR-CAR database.', $refNo);
        $historyStmt = $conn->prepare('
            INSERT INTO transaction_history (
                procurement_id,
                action,
                old_value,
                new_value,
                remarks,
                created_at
            ) VALUES (?, ?, NULL, ?, ?, NOW())
        ');
        if (!$historyStmt) {
            throw new Exception('SQL prepare failed for history: ' . $conn->error);
        }

        $historyStmt->bind_param('isss', $newProcurementId, $action, $status, $remarks);
        $historyStmt->execute();
        $historyStmt->close();

        $conn->commit();

        return $newProcurementId;
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Database error during procurement creation: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$conn = getDbConnection();

// 2. Read and parse JSON body
$input = getJsonInput();

// 3. Save into MySQL
$newId = createProcurementRecord($conn, $input);

sendSuccess('Procurement opportunity created successfully.', [
    'procurement_id' => $newId,
], 201);
