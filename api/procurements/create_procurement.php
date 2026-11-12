<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/procurements/create_procurement.php
 * =============================================================================
 * 
 * Inserts a new procurement project along with its technical line items into MySQL.
 * Also writes an initial creation log to the transaction_history audit table.
 * Uses a PDO database transaction (beginTransaction/commit) to ensure atomic storage.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * Validates and inserts a procurement master record and line items into MySQL.
 * Used by: React component ProcurementForm.jsx (Create Mode).
 * Connects to: Endpoint /api/procurements/create_procurement.php
 * Database tables affected: Writes to 'procurements', 'procurement_items', and 'transaction_history'.
 *
 * @param PDO   $pdo  Active database connection.
 * @param array $data Input form data payload.
 * @return int Primary key ID of the newly created procurement record.
 */
function createProcurementRecord($pdo, $data) {
    // 1. Sanitize and validate input fields
    $refNumber       = trim($data['reference_number'] ?? '');
    $title           = trim($data['title'] ?? '');
    $description     = trim($data['description'] ?? '');
    $procurementMode = trim($data['procurement_mode'] ?? 'NP-53.9 Small Value Procurement');
    $abc             = $data['abc'] ?? null;
    $deadline        = trim($data['deadline'] ?? '');
    $status          = trim($data['status'] ?? 'Draft');
    $stage           = trim($data['current_stage'] ?? 'Purchase Request');
    $items           = $data['items'] ?? [];

    if (empty($refNumber)) {
        sendError('Reference Number is required (e.g. CHR-CAR-2024-001).', null, 422);
    }
    if (empty($title)) {
        sendError('Project Title is required.', null, 422);
    }
    if (empty($description)) {
        sendError('Project Description is required.', null, 422);
    }
    if (!is_numeric($abc) || (float)$abc <= 0) {
        sendError('Approved Budget for the Contract (ABC) must be a positive number.', null, 422);
    }
    if (empty($deadline) || strtotime($deadline) === false) {
        sendError('A valid submission deadline datetime is required.', null, 422);
    }

    $formattedDeadline = date('Y-m-d H:i:s', strtotime($deadline));

    // Check for duplicate reference number
    // Queries the procurements table for existing reference number
    $checkStmt = $pdo->prepare('SELECT id FROM procurements WHERE reference_number = ? LIMIT 1');
    $checkStmt->execute([$refNumber]);
    if ($checkStmt->fetch()) {
        sendError(sprintf('A procurement with reference number "%s" already exists.', $refNumber), null, 409);
    }

    // 2. Begin atomic database transaction
    $pdo->beginTransaction();

    try {
        // Inserts the new procurement record into the centralized procurements table
        $stmt = $pdo->prepare('
            INSERT INTO procurements (
                reference_number,
                title,
                description,
                procurement_mode,
                abc,
                deadline,
                status,
                current_stage,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');

        $stmt->execute([
            $refNumber,
            $title,
            $description,
            $procurementMode,
            (float)$abc,
            $formattedDeadline,
            $status,
            $stage,
        ]);

        $procurementId = (int)$pdo->lastInsertId();

        // Inserts line items if provided
        if (is_array($items) && count($items) > 0) {
            // Inserts item rows into the procurement_items table
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
                        $procurementId,
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

        // Inserts initial audit trail entry into the transaction_history table
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
            'Procurement Created',
            null,
            $status,
            sprintf('Initial creation of procurement "%s" with ABC PHP %s.', $refNumber, number_format((float)$abc, 2)),
            'CHR Procurement Officer',
        ]);

        // Commit all SQL operations
        $pdo->commit();

        return $procurementId;
    } catch (Exception $e) {
        $pdo->rollBack();
        sendError('Failed to create procurement: ' . $e->getMessage(), null, 500);
    }
}

// 1. Establish database connection
$pdo = connectDatabase();

// 2. Parse input JSON payload
$input = getJsonInput();

// 3. Create record in MySQL
$newId = createProcurementRecord($pdo, $input);

sendSuccess('Procurement project created successfully.', [
    'procurement_id' => $newId,
], 201);
