<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/update_status.php
 * =============================================================================
 * 
 * Updates the procurement's status ('Open', 'For Evaluation', 'Awarded', 'In Progress', 'Completed').
 * Uses pure PHP MySQLi prepared statements.
 * Immediately logs the transition with remarks into `transaction_history`.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Transitions the procurement status and records the audit history.
 * Used by: React components.
 * Connects to: Endpoint /api/procurements/update_status.php
 * Database tables affected: Updates 'procurements', writes to 'transaction_history'.
 *
 * @param mysqli $conn Active MySQLi database connection.
 * @param array  $data Input payload containing id, status, and remarks.
 * @return void
 */
function updateProcurementStatusAndStage($conn, $data) {
    $id      = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $status  = trim($data['status'] ?? '');
    $remarks = trim($data['remarks'] ?? '');

    if (!$id) {
        sendError('A valid procurement ID is required.', null, 422);
    }

    $stmt = $conn->prepare('SELECT id, reference_no, title, status FROM procurements WHERE id = ? LIMIT 1');
    if (!$stmt) {
        sendError('SQL prepare error: ' . $conn->error, null, 500);
    }
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $procurement = $result->fetch_assoc();
    $stmt->close();

    if (!$procurement) {
        sendError('Procurement record not found.', null, 404);
    }

    $oldStatus = $procurement['status'];
    $newStatus = !empty($status) ? $status : $oldStatus;

    $conn->begin_transaction();

    try {
        $updateStmt = $conn->prepare('
            UPDATE procurements
            SET 
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        ');
        if (!$updateStmt) {
            throw new Exception('SQL prepare error: ' . $conn->error);
        }
        $updateStmt->bind_param('si', $newStatus, $id);
        $updateStmt->execute();
        $updateStmt->close();

        $action = 'Status Changed';
        $histRemarks = !empty($remarks) ? $remarks : sprintf('Status updated from "%s" to "%s".', $oldStatus, $newStatus);

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
            throw new Exception('SQL prepare error: ' . $conn->error);
        }
        $histStmt->bind_param('issss', $id, $action, $oldStatus, $newStatus, $histRemarks);
        $histStmt->execute();
        $histStmt->close();

        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to update procurement status: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$conn = getDbConnection();

// 2. Read JSON body
$input = getJsonInput();

// 3. Update MySQL
updateProcurementStatusAndStage($conn, $input);

sendSuccess('Procurement status updated successfully.', [
    'procurement_id' => (int)($input['id'] ?? 0),
    'status'         => $input['status'] ?? '',
]);
