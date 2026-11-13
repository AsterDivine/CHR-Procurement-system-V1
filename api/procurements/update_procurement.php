<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/update_procurement.php
 * =============================================================================
 * 
 * Pure PHP endpoint that updates an existing procurement record in the centralized
 * MySQL `chr_procurement` database (`procurements` table) and records a detailed
 * change entry in `transaction_history` using MySQLi prepared statements.
 *
 * Connection Flow:
 * React Edit Form (ProcurementForm.jsx) -> POST JSON -> update_procurement.php
 * -> MySQLi prepared statements -> `procurements` & `transaction_history` tables.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Validates and sanitizes incoming edit form data on the PHP server.
 * Prevents bypassing React validation and blocks any attempt to alter ID or reference_no.
 * Used by: api/procurements/update_procurement.php main flow.
 * Connects to: React component ProcurementForm.jsx (Edit Mode POST payload).
 * Database table affected: Validates updatable columns of `procurements`.
 *
 * @param array $data Raw JSON or POST form data from React.
 * @return array Validated procurement update fields.
 */
function validateUpdateProcurementInput($data) {
    $allowedStatuses = ['Open', 'For Evaluation', 'Awarded', 'In Progress', 'Completed'];

    $id              = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $title           = trim((string)($data['title'] ?? ''));
    $description     = trim((string)($data['description'] ?? ''));
    $procurementType = trim((string)($data['procurement_type'] ?? $data['procurement_mode'] ?? ''));
    $budgetSource    = trim((string)($data['budget_source'] ?? ''));
    $abc             = $data['abc'] ?? null;
    $deadline        = trim((string)($data['deadline'] ?? ''));
    $status          = trim((string)($data['status'] ?? ''));

    if (!$id || $id <= 0) {
        sendError('A valid procurement ID is required.', null, 422);
    }
    if ($title === '') {
        sendError('Procurement Title is required.', null, 422);
    }
    if (strlen($title) > 150) {
        sendError('Procurement Title must not exceed 150 characters.', null, 422);
    }
    if ($abc === null || $abc === '' || !is_numeric($abc) || (float)$abc <= 0) {
        sendError('Approved Budget for the Contract (ABC) must be greater than zero.', null, 422);
    }
    if ($deadline === '' || strtotime($deadline) === false) {
        sendError('A valid Submission Deadline date is required.', null, 422);
    }
    if ($status !== '' && !in_array($status, $allowedStatuses, true)) {
        sendError('Invalid status selected. Allowed values: Open, For Evaluation, Awarded, In Progress, Completed.', null, 422);
    }

    return [
        'id'               => (int)$id,
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
 * Compares previous MySQL values against updated values to build clean audit strings
 * for the `transaction_history` table (e.g., Old Value: "Status: Open", New Value: "Status: For Evaluation").
 * Used by: updateProcurementRecord() in update_procurement.php.
 * Connects to: MySQL `transaction_history` columns `old_value` and `new_value`.
 * Database table affected: Prepares values for `transaction_history`.
 *
 * @param array $existing Current procurement row loaded from MySQL.
 * @param array $updated  Validated new values submitted from React.
 * @return array{old_value: string, new_value: string, remarks: string}
 */
function buildUpdateAuditSummary($existing, $updated) {
    $oldParts = [];
    $newParts = [];

    if ((string)$existing['status'] !== (string)$updated['status']) {
        $oldParts[] = 'Status: ' . $existing['status'];
        $newParts[] = 'Status: ' . $updated['status'];
    }
    if ((string)$existing['title'] !== (string)$updated['title']) {
        $oldParts[] = 'Title: ' . $existing['title'];
        $newParts[] = 'Title: ' . $updated['title'];
    }
    if ((float)$existing['abc'] !== (float)$updated['abc']) {
        $oldParts[] = 'ABC: ' . number_format((float)$existing['abc'], 2);
        $newParts[] = 'ABC: ' . number_format((float)$updated['abc'], 2);
    }
    if ((string)($existing['procurement_type'] ?? '') !== (string)$updated['procurement_type']) {
        $oldParts[] = 'Type: ' . ($existing['procurement_type'] ?: 'None');
        $newParts[] = 'Type: ' . $updated['procurement_type'];
    }
    if ((string)($existing['budget_source'] ?? '') !== (string)($updated['budget_source'] ?? '')) {
        $oldParts[] = 'Budget Source: ' . ($existing['budget_source'] ?: 'None');
        $newParts[] = 'Budget Source: ' . ($updated['budget_source'] ?: 'None');
    }
    if ((string)($existing['deadline'] ?? '') !== (string)$updated['deadline']) {
        $oldParts[] = 'Deadline: ' . ($existing['deadline'] ?: 'None');
        $newParts[] = 'Deadline: ' . $updated['deadline'];
    }
    if ((string)($existing['description'] ?? '') !== (string)$updated['description']) {
        $oldParts[] = 'Description updated';
        $newParts[] = 'Description modified';
    }

    if (empty($oldParts)) {
        return [
            'old_value' => 'Status: ' . $existing['status'],
            'new_value' => 'Status: ' . $updated['status'],
            'remarks'   => 'Procurement record saved with no field changes.',
        ];
    }

    $oldText = substr(implode(' | ', $oldParts), 0, 255);
    $newText = substr(implode(' | ', $newParts), 0, 255);

    return [
        'old_value' => $oldText,
        'new_value' => $newText,
        'remarks'   => sprintf('Updated procurement "%s" via CHR Edit Procurement page.', $existing['reference_no']),
    ];
}

/**
 * Updates allowed fields of an existing procurement record in MySQL (`procurements`),
 * logs the modification in `transaction_history`, and returns the reloaded record.
 * Used by: api/procurements/update_procurement.php.
 * Connects to: MySQL database `chr_procurement` via MySQLi prepared statements.
 * Database tables affected: Updates `procurements`, inserts into `transaction_history`.
 *
 * @param mysqli $conn Active MySQLi database connection from getDbConnection().
 * @param array  $data Validated update fields from validateUpdateProcurementInput().
 * @return array Reloaded procurement record directly from MySQL.
 */
function updateProcurementRecord($conn, $data) {
    $id = $data['id'];

    // 1. Load existing record from MySQL using a prepared statement
    $selectStmt = $conn->prepare('SELECT * FROM procurements WHERE id = ? LIMIT 1');
    if (!$selectStmt) {
        error_log('update_procurement select prepare failed: ' . $conn->error);
        sendError('Unable to load existing procurement record.', null, 500);
    }
    $selectStmt->bind_param('i', $id);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $existing = $result->fetch_assoc();
    $selectStmt->close();

    if (!$existing) {
        sendError('Procurement record not found.', null, 404);
    }

    $finalStatus = $data['status'] !== '' ? $data['status'] : $existing['status'];
    $data['status'] = $finalStatus;

    // Preserve and recalculate savings if an awarded_amount already exists
    $awardedAmount = $existing['awarded_amount'] !== null ? (float)$existing['awarded_amount'] : null;
    $recalculatedSavings = $awardedAmount !== null ? round($data['abc'] - $awardedAmount, 2) : null;

    $audit = buildUpdateAuditSummary($existing, $data);

    $conn->begin_transaction();

    try {
        // 2. Save updated fields in `procurements` (id and reference_no remain unchanged)
        $updateStmt = $conn->prepare('
            UPDATE procurements
            SET
                title = ?,
                description = ?,
                procurement_type = ?,
                abc = ?,
                budget_source = ?,
                deadline = ?,
                status = ?,
                savings = ?,
                updated_at = NOW()
            WHERE id = ?
        ');
        if (!$updateStmt) {
            throw new Exception('SQL prepare failed for update: ' . $conn->error);
        }

        $updateStmt->bind_param(
            'sssdsssdi',
            $data['title'],
            $data['description'],
            $data['procurement_type'],
            $data['abc'],
            $data['budget_source'],
            $data['deadline'],
            $finalStatus,
            $recalculatedSavings,
            $id
        );

        if (!$updateStmt->execute()) {
            throw new Exception('SQL execute failed for update: ' . $updateStmt->error);
        }
        $updateStmt->close();

        // 3. Add a history entry into `transaction_history`
        $action = 'Procurement record updated';
        $histStmt = $conn->prepare('
            INSERT INTO transaction_history (
                procurement_id,
                action,
                old_value,
                new_value,
                remarks,
                created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())
        ');
        if (!$histStmt) {
            throw new Exception('SQL prepare failed for history: ' . $conn->error);
        }

        $histStmt->bind_param(
            'issss',
            $id,
            $action,
            $audit['old_value'],
            $audit['new_value'],
            $audit['remarks']
        );
        if (!$histStmt->execute()) {
            throw new Exception('SQL execute failed for history: ' . $histStmt->error);
        }
        $histStmt->close();

        $conn->commit();

        // 4. Reload updated procurement row from MySQL to return newest values
        $reloadStmt = $conn->prepare('SELECT * FROM procurements WHERE id = ? LIMIT 1');
        $reloadStmt->bind_param('i', $id);
        $reloadStmt->execute();
        $updatedRecord = $reloadStmt->get_result()->fetch_assoc();
        $reloadStmt->close();

        if ($updatedRecord) {
            $updatedRecord['id']             = (int)$updatedRecord['id'];
            $updatedRecord['abc']            = (float)$updatedRecord['abc'];
            $updatedRecord['awarded_amount'] = $updatedRecord['awarded_amount'] !== null ? (float)$updatedRecord['awarded_amount'] : null;
            $updatedRecord['savings']        = $updatedRecord['savings'] !== null ? (float)$updatedRecord['savings'] : null;
        }

        return $updatedRecord;
    } catch (Exception $e) {
        $conn->rollback();
        error_log('Update procurement failed: ' . $e->getMessage());
        sendError('Failed to update procurement record. Please try again.', null, 500);
    }
}

// 1. Establish MySQLi database connection to `chr_procurement`
$conn = getDbConnection();

// 2. Read JSON or POST form data from React
$input = getJsonInput();

// 3. Validate editable fields on PHP server
$validatedData = validateUpdateProcurementInput($input);

// 4. Save changes, log transaction_history, and reload newest MySQL record
$updatedProcurement = updateProcurementRecord($conn, $validatedData);

// 5. Return standard JSON success response
sendSuccess('Procurement record updated successfully.', [
    'procurement_id' => $validatedData['id'],
    'procurement'    => $updatedProcurement,
]);
