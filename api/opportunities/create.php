<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/opportunities/create.php
 * =============================================================================
 * 
 * Allows CHR Personnel to create a new procurement opportunity along with its
 * line items inside an atomic database transaction.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/audit.php';

// CHR Personnel role only
requireRole('chr');

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

$input = getJsonInput();

// 1. Extract and Validate Opportunity Fields
$referenceNo     = trim($input['reference_no'] ?? '');
$title           = trim($input['title'] ?? '');
$description     = trim($input['description'] ?? '');
$procurementType = trim($input['procurement_type'] ?? 'NP-53.9 Small Value Procurement');
$abc             = $input['abc'] ?? null;
$deadline        = trim($input['deadline'] ?? '');
$status          = trim($input['status'] ?? 'draft');
$items           = $input['items'] ?? [];

if (empty($referenceNo)) {
    sendError('Reference number is required (e.g. CHR-CAR-2024-001).', null, 422);
}

if (empty($title)) {
    sendError('Project title is required.', null, 422);
}

if (!is_numeric($abc) || (float)$abc <= 0) {
    sendError('Approved Budget for the Contract (ABC) must be a positive number.', null, 422);
}
$abc = (float)$abc;

if (empty($deadline) || strtotime($deadline) === false) {
    sendError('A valid submission deadline datetime is required.', null, 422);
}

// Convert deadline to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
$formattedDeadline = date('Y-m-d H:i:s', strtotime($deadline));

$allowedStatuses = ['draft', 'open'];
if (!in_array($status, $allowedStatuses, true)) {
    $status = 'draft';
}

// 2. Validate Items (Must have at least one line item)
if (!is_array($items) || count($items) === 0) {
    sendError('At least one procurement line item is required.', null, 422);
}

foreach ($items as $idx => $item) {
    $itemName = trim($item['item_name'] ?? '');
    $quantity = $item['quantity'] ?? null;
    $unit     = trim($item['unit'] ?? '');

    if (empty($itemName)) {
        sendError(sprintf('Item #%d: Item name is required.', $idx + 1), null, 422);
    }
    if (!is_numeric($quantity) || (float)$quantity <= 0) {
        sendError(sprintf('Item #%d: Quantity must be a positive number.', $idx + 1), null, 422);
    }
    if (empty($unit)) {
        sendError(sprintf('Item #%d: Unit of measurement (e.g., pcs, lots) is required.', $idx + 1), null, 422);
    }
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 3. Check for Duplicate Reference Number
$checkStmt = $pdo->prepare('SELECT id FROM procurement_opportunities WHERE reference_no = ? LIMIT 1');
$checkStmt->execute([$referenceNo]);
if ($checkStmt->fetch()) {
    sendError(sprintf('An opportunity with reference number "%s" already exists.', $referenceNo), null, 409);
}

// 4. Begin Database Transaction
$pdo->beginTransaction();

try {
    // Insert Opportunity Master Record
    $stmt = $pdo->prepare('
        INSERT INTO procurement_opportunities (
            reference_no,
            title,
            description,
            procurement_type,
            abc,
            deadline,
            status,
            created_by,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');

    $stmt->execute([
        $referenceNo,
        $title,
        $description,
        $procurementType,
        $abc,
        $formattedDeadline,
        $status,
        $currentUserId,
    ]);

    $opportunityId = (int)$pdo->lastInsertId();

    // Insert Opportunity Line Items
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
            trim($item['item_name']),
            trim($item['specifications'] ?? ''),
            (float)$item['quantity'],
            trim($item['unit']),
            isset($item['estimated_unit_cost']) && is_numeric($item['estimated_unit_cost'])
                ? (float)$item['estimated_unit_cost']
                : null,
        ]);
    }

    // 5. Record Audit Trail
    recordAuditLog(
        $pdo,
        $currentUserId,
        'CREATE_OPPORTUNITY',
        'opportunity',
        $opportunityId,
        [
            'reference_no' => $referenceNo,
            'title'        => $title,
            'abc'          => $abc,
            'status'       => $status,
            'items_count'  => count($items),
        ]
    );

    // Commit all changes
    $pdo->commit();

    sendSuccess('Procurement opportunity created successfully.', [
        'opportunity_id' => $opportunityId,
        'reference_no'   => $referenceNo,
        'status'         => $status,
    ], 201);

} catch (Exception $e) {
    // Rollback any partial database writes
    $pdo->rollBack();
    sendError('Failed to create opportunity: ' . $e->getMessage(), null, 500);
}
