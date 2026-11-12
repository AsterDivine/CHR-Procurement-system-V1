<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/update_procurement.php
 * =============================================================================
 * 
 * Updates master details and technical line items for an existing procurement.
 * Records the modification in the transaction_history audit trail table.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Updates an existing procurement record and replaces its line items in MySQL.
 * Used by: React component ProcurementForm.jsx (Edit Mode).
 * Connects to: Endpoint /api/procurements/update_procurement.php
 * Database tables affected: Updates 'procurements', writes to 'procurement_items' and 'transaction_history'.
 *
 * @param PDO   $pdo  Active database connection.
 * @param array $data Input form data payload containing ID and updated fields.
 * @return void
 */
function updateProcurementRecord($pdo, $data) {
    $id              = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $title           = trim($data['title'] ?? '');
    $description     = trim($data['description'] ?? '');
    $procurementMode = trim($data['procurement_mode'] ?? '');
    $abc             = $data['abc'] ?? null;
    $deadline        = trim($data['deadline'] ?? '');
    $items           = $data['items'] ?? null;

    if (!$id) {
        sendError('A valid procurement ID is required.', null, 422);
    }

    // Fetches the existing procurement record from the procurements table
    $stmt = $pdo->prepare('SELECT * FROM procurements WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();

    if (!$existing) {
        sendError('Procurement record not found.', null, 404);
    }

    // Fallbacks to existing values if not provided
    $finalTitle           = !empty($title) ? $title : $existing['title'];
    $finalDescription     = !empty($description) ? $description : $existing['description'];
    $finalProcurementMode = !empty($procurementMode) ? $procurementMode : $existing['procurement_mode'];
    $finalAbc             = (is_numeric($abc) && (float)$abc > 0) ? (float)$abc : (float)$existing['abc'];

    if (!empty($deadline) && strtotime($deadline) !== false) {
        $finalDeadline = date('Y-m-d H:i:s', strtotime($deadline));
    } else {
        $finalDeadline = $existing['deadline'];
    }

    // Recalculate savings if awarded_amount is present and ABC changed
    $savings = $existing['savings'];
    if ($existing['awarded_amount'] !== null) {
        $savings = $finalAbc - (float)$existing['awarded_amount'];
    }

    $pdo->beginTransaction();

    try {
        // Updates the procurement master record in the procurements table
        $updateStmt = $pdo->prepare('
            UPDATE procurements
            SET 
                title = ?,
                description = ?,
                procurement_mode = ?,
                abc = ?,
                deadline = ?,
                savings = ?,
                updated_at = NOW()
            WHERE id = ?
        ');

        $updateStmt->execute([
            $finalTitle,
            $finalDescription,
            $finalProcurementMode,
            $finalAbc,
            $finalDeadline,
            $savings,
            $id,
        ]);

        // If items are provided, replace existing items
        if (is_array($items)) {
            // Deletes outdated items for this procurement
            $delStmt = $pdo->prepare('DELETE FROM procurement_items WHERE procurement_id = ?');
            $delStmt->execute([$id]);

            // Inserts refreshed line items into procurement_items
            $itemStmt = $pdo->prepare('
                INSERT INTO procurement_items (
                    procurement_id,
                    item_name,
                    specifications,
                    quantity,
                    unit,
                    estimated_unit_cost
                ) VALUES (?, ?, ?, ?, ?, ?)
            ');

            foreach ($items as $item) {
                $itemName = trim($item['item_name'] ?? '');
                if (!empty($itemName)) {
                    $itemStmt->execute([
                        $id,
                        $itemName,
                        trim($item['specifications'] ?? ''),
                        (float)($item['quantity'] ?? 1),
                        trim($item['unit'] ?? 'lot'),
                        isset($item['estimated_unit_cost']) && is_numeric($item['estimated_unit_cost'])
                            ? (float)$item['estimated_unit_cost']
                            : null,
                    ]);
                }
            }
        }

        // Inserts modification record into transaction_history table
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
            'Procurement Updated',
            $existing['status'],
            $existing['status'],
            sprintf('Procurement details updated. Title: "%s", ABC: PHP %s.', $finalTitle, number_format($finalAbc, 2)),
            'CHR Procurement Officer',
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError('Failed to update procurement: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Parse input JSON payload
$input = getJsonInput();

// 3. Update record in MySQL
updateProcurementRecord($pdo, $input);

sendSuccess('Procurement project updated successfully.', [
    'procurement_id' => (int)$input['id'],
]);
