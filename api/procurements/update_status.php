<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/update_status.php
 * =============================================================================
 * 
 * Updates the procurement's status ('Draft', 'Published / Open', 'Under Evaluation',
 * 'Awarded', 'Completed', 'Cancelled') and/or its statutory workflow stage.
 * Immediately logs the transition with remarks into transaction_history.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Transitions the procurement status or stage and records the audit history.
 * Used by: React component ProcurementStatusTracker.jsx and ProcurementTable.jsx.
 * Connects to: Endpoint /api/procurements/update_status.php
 * Database tables affected: Updates 'procurements', writes to 'transaction_history'.
 *
 * @param PDO   $pdo  Active database connection.
 * @param array $data Input payload containing id, status, current_stage, and remarks.
 * @return void
 */
function updateProcurementStatusAndStage($pdo, $data) {
    $id      = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $status  = trim($data['status'] ?? '');
    $stage   = trim($data['current_stage'] ?? '');
    $remarks = trim($data['remarks'] ?? '');

    if (!$id) {
        sendError('A valid procurement ID is required.', null, 422);
    }

    // Fetches the current state of the procurement from the procurements table
    $stmt = $pdo->prepare('SELECT id, reference_number, title, status, current_stage FROM procurements WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $procurement = $stmt->fetch();

    if (!$procurement) {
        sendError('Procurement record not found.', null, 404);
    }

    $oldStatus = $procurement['status'];
    $oldStage  = $procurement['current_stage'];

    $newStatus = !empty($status) ? $status : $oldStatus;
    $newStage  = !empty($stage) ? $stage : $oldStage;

    $pdo->beginTransaction();

    try {
        // Updates status and current_stage in the procurements table
        $updateStmt = $pdo->prepare('
            UPDATE procurements
            SET 
                status = ?,
                current_stage = ?,
                updated_at = NOW()
            WHERE id = ?
        ');
        $updateStmt->execute([$newStatus, $newStage, $id]);

        // Formulate descriptive log notes
        $logRemarks = !empty($remarks) ? $remarks : sprintf('Status changed from "%s" to "%s", Stage: "%s".', $oldStatus, $newStatus, $newStage);

        // Inserts the state change into the transaction_history audit table
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
            $id,
            'Status / Stage Updated',
            $oldStatus,
            $newStatus,
            $logRemarks,
            'CHR Procurement Officer',
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError('Failed to update procurement status: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Parse input JSON payload
$input = getJsonInput();

// 3. Update status in MySQL
updateProcurementStatusAndStage($pdo, $input);

sendSuccess('Procurement status updated successfully.', [
    'procurement_id' => (int)$input['id'],
]);
