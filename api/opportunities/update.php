<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/opportunities/update.php
 * =============================================================================
 * 
 * Allows CHR Personnel to edit an existing opportunity and its line items.
 * 
 * GOVERNANCE & INTEGRITY RULE:
 * Opportunities with status 'awarded' or 'completed' cannot be modified.
 * Once a project has been officially awarded to a supplier or completed, its
 * specifications and ABC are locked to maintain procurement audit integrity.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/audit.php';

// CHR Personnel role only
requireRole('chr');

// Accept only POST (or PUT)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

$input = getJsonInput();

$opportunityId   = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
$title           = trim($input['title'] ?? '');
$description     = trim($input['description'] ?? '');
$procurementType = trim($input['procurement_type'] ?? '');
$abc             = $input['abc'] ?? null;
$deadline        = trim($input['deadline'] ?? '');
$items           = $input['items'] ?? null;

if (!$opportunityId) {
    sendError('A valid opportunity ID is required.', null, 422);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Fetch Current Opportunity State
$stmt = $pdo->prepare('SELECT * FROM procurement_opportunities WHERE id = ? LIMIT 1');
$stmt->execute([$opportunityId]);
$existing = $stmt->fetch();

if (!$existing) {
    sendError('Procurement opportunity not found.', null, 404);
}

// 2. Safe Rule Check: Block Edits on Awarded or Completed Opportunities
if (in_array($existing['status'], ['awarded', 'completed'], true)) {
    sendError(
        sprintf(
            'Cannot modify opportunity: Projects in "%s" status are locked for audit integrity.',
            strtoupper($existing['status'])
        ),
        null,
        403
    );
}

// 3. Validate Inputs
if (empty($title)) {
    $title = $existing['title'];
}
if (empty($description)) {
    $description = $existing['description'];
}
if (empty($procurementType)) {
    $procurementType = $existing['procurement_type'];
}

if ($abc !== null) {
    if (!is_numeric($abc) || (float)$abc <= 0) {
        sendError('ABC must be a positive number.', null, 422);
    }
    $abc = (float)$abc;
} else {
    $abc = (float)$existing['abc'];
}

if (!empty($deadline)) {
    if (strtotime($deadline) === false) {
        sendError('Invalid deadline datetime format.', null, 422);
    }
    $formattedDeadline = date('Y-m-d H:i:s', strtotime($deadline));
} else {
    $formattedDeadline = $existing['deadline'];
}

// 4. Begin Transaction to Update Opportunity and Items
$pdo->beginTransaction();

try {
    $updateStmt = $pdo->prepare('
        UPDATE procurement_opportunities
        SET 
            title = ?,
            description = ?,
            procurement_type = ?,
            abc = ?,
            deadline = ?,
            updated_at = NOW()
        WHERE id = ?
    ');

    $updateStmt->execute([
        $title,
        $description,
        $procurementType,
        $abc,
        $formattedDeadline,
        $opportunityId,
    ]);

    // If new item list was supplied, refresh items
    if (is_array($items) && count($items) > 0) {
        // Remove existing items
        $deleteItemsStmt = $pdo->prepare('DELETE FROM opportunity_items WHERE opportunity_id = ?');
        $deleteItemsStmt->execute([$opportunityId]);

        // Re-insert updated items
        $itemStmt = $pdo->prepare('
            INSERT INTO opportunity_items (
                opportunity_id,
                item_name,
                specifications,
                quantity,
                unit,
                estimated_unit_cost
            ) VALUES (?, ?, ?, ?, ?, ?)
        ');

        foreach ($items as $item) {
            $itemStmt->execute([
                $opportunityId,
                trim($item['item_name'] ?? 'Item'),
                trim($item['specifications'] ?? ''),
                (float)($item['quantity'] ?? 1),
                trim($item['unit'] ?? 'lot'),
                isset($item['estimated_unit_cost']) && is_numeric($item['estimated_unit_cost'])
                    ? (float)$item['estimated_unit_cost']
                    : null,
            ]);
        }
    }

    // 5. Audit Logging
    recordAuditLog(
        $pdo,
        $currentUserId,
        'UPDATE_OPPORTUNITY',
        'opportunity',
        $opportunityId,
        [
            'reference_no' => $existing['reference_no'],
            'old_title'    => $existing['title'],
            'new_title'    => $title,
            'old_abc'      => (float)$existing['abc'],
            'new_abc'      => $abc,
            'items_updated'=> is_array($items),
        ]
    );

    $pdo->commit();

    sendSuccess('Procurement opportunity updated successfully.', [
        'opportunity_id' => $opportunityId,
        'reference_no'   => $existing['reference_no'],
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    sendError('Failed to update opportunity: ' . $e->getMessage(), null, 500);
}
