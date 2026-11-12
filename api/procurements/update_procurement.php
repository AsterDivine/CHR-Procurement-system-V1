<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/update_procurement.php
 * =============================================================================
 * 
 * Updates master details for an existing procurement record in MySQL.
 * Uses pure PHP MySQLi prepared statements.
 * Records the modification in the `transaction_history` audit trail table.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Updates an existing procurement record in MySQL.
 * Used by: React component ProcurementForm.jsx (Edit Mode).
 * Connects to: Endpoint /api/procurements/update_procurement.php
 * Database tables affected: Updates 'procurements', writes to 'transaction_history'.
 *
 * @param mysqli $conn Active MySQLi database connection.
 * @param array  $data Input form data payload containing ID and updated fields.
 * @return void
 */
function updateProcurementRecord($conn, $data) {
    $id              = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $title           = trim($data['title'] ?? '');
    $description     = trim($data['description'] ?? '');
    $procurementType = trim($data['procurement_type'] ?? $data['procurement_mode'] ?? '');
    $budgetSource    = trim($data['budget_source'] ?? '');
    $abc             = $data['abc'] ?? null;
    $deadline        = trim($data['deadline'] ?? '');

    if (!$id) {
        sendError('A valid procurement ID is required.', null, 422);
    }

    $stmt = $conn->prepare('SELECT * FROM procurements WHERE id = ? LIMIT 1');
    if (!$stmt) {
        sendError('SQL prepare error: ' . $conn->error, null, 500);
    }
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $existing = $result->fetch_assoc();
    $stmt->close();

    if (!$existing) {
        sendError('Procurement record not found.', null, 404);
    }

    $finalTitle           = !empty($title) ? $title : $existing['title'];
    $finalDescription     = !empty($description) ? $description : $existing['description'];
    $finalProcurementType = !empty($procurementType) ? $procurementType : $existing['procurement_type'];
    $finalBudgetSource    = !empty($budgetSource) ? $budgetSource : $existing['budget_source'];
    $finalAbc             = (is_numeric($abc) && (float)$abc > 0) ? (float)$abc : (float)$existing['abc'];

    if (!empty($deadline) && strtotime($deadline) !== false) {
        $finalDeadline = date('Y-m-d', strtotime($deadline));
    } else {
        $finalDeadline = $existing['deadline'];
    }

    $conn->begin_transaction();

    try {
        $updateStmt = $conn->prepare('
            UPDATE procurements
            SET 
                title = ?,
                description = ?,
                procurement_type = ?,
                budget_source = ?,
                abc = ?,
                deadline = ?,
                updated_at = NOW()
            WHERE id = ?
        ');
        if (!$updateStmt) {
            throw new Exception('SQL prepare error: ' . $conn->error);
        }

        $finalAbcFloat = (float)$finalAbc;
        $updateStmt->bind_param(
            'ssssdsi',
            $finalTitle,
            $finalDescription,
            $finalProcurementType,
            $finalBudgetSource,
            $finalAbcFloat,
            $finalDeadline,
            $id
        );
        $updateStmt->execute();
        $updateStmt->close();

        $action = 'Procurement Updated';
        $remarks = 'Master procurement fields updated by CHR Personnel.';
        $oldVal = (string)$existing['title'];
        $newVal = (string)$finalTitle;

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

        $histStmt->bind_param('issss', $id, $action, $oldVal, $newVal, $remarks);
        $histStmt->execute();
        $histStmt->close();

        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to update procurement: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$conn = getDbConnection();

// 2. Read JSON body
$input = getJsonInput();

// 3. Update MySQL
updateProcurementRecord($conn, $input);

sendSuccess('Procurement record updated successfully.', [
    'procurement_id' => (int)($input['id'] ?? 0),
]);
