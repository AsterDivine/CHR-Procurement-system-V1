<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/create_procurement.php
 * =============================================================================
 * 
 * Pure PHP API endpoint that validates and inserts a new procurement project
 * into the centralized MySQL `procurements` table using MySQLi prepared statements.
 * Also logs an initial 'Procurement Created' entry in `transaction_history`.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Validates and sanitizes incoming procurement form data on the server side.
 * Ensures React validation cannot be bypassed via direct HTTP requests.
 * Used by: create_procurement.php main execution flow.
 * Connects to: React component ProcurementForm.jsx (POST payload).
 * Database table affected: Validates columns for 'procurements'.
 *
 * @param array $data Raw decoded JSON or $_POST payload from the client.
 * @return array Sanitized and validated fields ready for database insertion.
 */
function validateProcurementInput($data) {
    $allowedStatuses = ['Open', 'For Evaluation', 'Awarded', 'In Progress', 'Completed'];

    $refNo           = trim((string)($data['reference_no'] ?? $data['reference_number'] ?? ''));
    $title           = trim((string)($data['title'] ?? ''));
    $description     = trim((string)($data['description'] ?? ''));
    $procurementType = trim((string)($data['procurement_type'] ?? $data['procurement_mode'] ?? 'NP-53.9 Small Value Procurement'));
    $budgetSource    = trim((string)($data['budget_source'] ?? ''));
    $abc             = $data['abc'] ?? null;
    $deadline        = trim((string)($data['deadline'] ?? ''));
    $status          = trim((string)($data['status'] ?? 'Open'));

    // 1. Validate required fields
    if ($refNo === '') {
        sendError('Reference Number is required.', null, 422);
    }
    if (strlen($refNo) > 50) {
        sendError('Reference Number must not exceed 50 characters.', null, 422);
    }
    if ($title === '') {
        sendError('Procurement Title is required.', null, 422);
    }
    if (strlen($title) > 150) {
        sendError('Procurement Title must not exceed 150 characters.', null, 422);
    }

    // 2. Verify ABC is provided and strictly greater than zero
    if ($abc === null || $abc === '' || !is_numeric($abc) || (float)$abc <= 0) {
        sendError('Approved Budget for the Contract (ABC) is required and must be greater than zero.', null, 422);
    }

    // 3. Validate submission deadline
    if ($deadline === '' || strtotime($deadline) === false) {
        sendError('A valid Submission Deadline date is required.', null, 422);
    }

    // 4. Validate status against prototype choices
    if ($status === '') {
        $status = 'Open';
    } elseif (!in_array($status, $allowedStatuses, true)) {
        sendError('Invalid status selected. Allowed values: Open, For Evaluation, Awarded, In Progress, Completed.', null, 422);
    }

    return [
        'reference_no'     => $refNo,
        'title'            => $title,
        'description'      => $description,
        'procurement_type' => $procurementType !== '' ? $procurementType : 'NP-53.9 Small Value Procurement',
        'budget_source'    => $budgetSource !== '' ? $budgetSource : null,
        'abc'              => round((float)$abc, 2),
        'deadline'         => date('Y-m-d', strtotime($deadline)),
        'status'           => $status,
    ];
}

/**
 * Checks whether a given Reference Number already exists in the `procurements` table.
 * Used by: createProcurementRecord() in create_procurement.php.
 * Connects to: MySQL database `chr_procurement`.
 * Database table affected: Reads from 'procurements'.
 *
 * @param mysqli $conn  Active MySQLi database connection.
 * @param string $refNo Reference number to check for duplicates.
 * @return bool True if a duplicate exists, false otherwise.
 */
function isDuplicateReferenceNo($conn, $refNo) {
    $stmt = $conn->prepare('SELECT id FROM procurements WHERE reference_no = ? LIMIT 1');
    if (!$stmt) {
        error_log('Duplicate check prepare failed: ' . $conn->error);
        sendError('Unable to validate reference number.', null, 500);
    }

    $stmt->bind_param('s', $refNo);
    $stmt->execute();
    $stmt->store_result();
    $exists = $stmt->num_rows > 0;
    $stmt->close();

    return $exists;
}

/**
 * Inserts a validated procurement record into `procurements` and logs creation
 * in `transaction_history` using a MySQLi transaction and prepared statements.
 * Used by: api/procurements/create_procurement.php
 * Connects to: React component ProcurementForm.jsx via fetch().
 * Database tables affected: Writes to 'procurements' and 'transaction_history'.
 *
 * @param mysqli $conn Active MySQLi database connection.
 * @param array  $validData Sanitized procurement fields from validateProcurementInput().
 * @return int Primary key ID of the newly created procurement record.
 */
function createProcurementRecord($conn, $validData) {
    // Check that reference number is not duplicated
    if (isDuplicateReferenceNo($conn, $validData['reference_no'])) {
        sendError(
            sprintf('Reference Number "%s" already exists. Please use a unique reference number.', $validData['reference_no']),
            null,
            409
        );
    }

    $conn->begin_transaction();

    try {
        // Prepared SQL INSERT statement for procurements table
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

        $stmt->bind_param(
            'ssssdsss',
            $validData['reference_no'],
            $validData['title'],
            $validData['description'],
            $validData['procurement_type'],
            $validData['abc'],
            $validData['budget_source'],
            $validData['deadline'],
            $validData['status']
        );

        if (!$stmt->execute()) {
            throw new Exception('SQL execute failed for procurement: ' . $stmt->error);
        }

        $newProcurementId = (int)$conn->insert_id;
        $stmt->close();

        // Log initial creation into transaction_history
        $action = 'Procurement Created';
        $remarks = sprintf(
            'Procurement record "%s" (%s) created in CHR-CAR database.',
            $validData['reference_no'],
            $validData['title']
        );

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

        $historyStmt->bind_param('isss', $newProcurementId, $action, $validData['status'], $remarks);
        if (!$historyStmt->execute()) {
            throw new Exception('SQL execute failed for history: ' . $historyStmt->error);
        }
        $historyStmt->close();

        $conn->commit();

        return $newProcurementId;
    } catch (Exception $e) {
        $conn->rollback();
        error_log('Create procurement failed: ' . $e->getMessage());
        sendError('Failed to save procurement record. Please try again.', null, 500);
    }
}

// 1. Establish MySQLi database connection
$conn = getDbConnection();

// 2. Accept JSON or standard POST form data
$input = getJsonInput();

// 3. Validate fields on PHP backend
$validatedData = validateProcurementInput($input);

// 4. Insert record using prepared SQL statements
$newId = createProcurementRecord($conn, $validatedData);

// 5. Return standard JSON success response
sendSuccess('Procurement record created successfully.', [
    'procurement_id' => $newId,
    'reference_no'   => $validatedData['reference_no'],
], 201);
