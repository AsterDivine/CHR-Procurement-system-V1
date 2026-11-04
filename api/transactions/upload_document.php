<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/transactions/upload_document.php
 * =============================================================================
 * 
 * Allows CHR Personnel to attach compliance documents (PR, Abstract, BAC Resolution,
 * NOA, PO, NTP, Inspection Reports, Vouchers) to a procurement transaction.
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

$transactionId = filter_input(INPUT_POST, 'transaction_id', FILTER_VALIDATE_INT);
$documentType  = trim($_POST['document_type'] ?? '');
$docStatus     = strtolower(trim($_POST['status'] ?? 'complete'));

if (!$transactionId) {
    sendError('A valid transaction_id is required.', null, 422);
}

if (empty($documentType)) {
    sendError('Document type is required (e.g. Purchase Request, Notice of Award).', null, 422);
}

$allowedStatuses = ['pending', 'complete', 'verified'];
if (!in_array($docStatus, $allowedStatuses, true)) {
    $docStatus = 'complete';
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Verify Transaction Exists
$txStmt = $pdo->prepare('SELECT id, control_no FROM procurement_transactions WHERE id = ? LIMIT 1');
$txStmt->execute([$transactionId]);
$tx = $txStmt->fetch();

if (!$tx) {
    sendError('Procurement transaction not found.', null, 404);
}

// 2. Validate File Upload
$fileField = isset($_FILES['document']) ? 'document' : (isset($_FILES['file']) ? 'file' : null);
if (!$fileField || empty($_FILES[$fileField]['name']) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
    sendError('A valid document file is required.', null, 422);
}

$file = $_FILES[$fileField];
$maxFileSize = 5 * 1024 * 1024; // 5 MB
$allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
$allowedMimeTypes  = ['application/pdf', 'image/jpeg', 'image/png'];

if ($file['size'] > $maxFileSize) {
    sendError('File size exceeds the 5 MB limit.', null, 422);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExtensions, true)) {
    sendError(sprintf('Unsupported file extension (.%s). Allowed: PDF, JPG, JPEG, PNG.', $ext), null, 422);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedMime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($detectedMime, $allowedMimeTypes, true)) {
    sendError(sprintf('Invalid file content MIME type (%s). Allowed: PDF or images.', $detectedMime), null, 422);
}

// 3. Move File to Storage
$uploadDir = __DIR__ . '/../uploads/transactions/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$storedName = sprintf('tx_%d_%s_%s.%s', $transactionId, time(), bin2hex(random_bytes(6)), $ext);
$destPath   = $uploadDir . $storedName;
$dbFilePath = 'uploads/transactions/' . $storedName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    sendError('Failed to save uploaded document to server storage.', null, 500);
}

// 4. Begin Transaction to Save Document Record & History
$pdo->beginTransaction();

try {
    $docStmt = $pdo->prepare('
        INSERT INTO transaction_documents (
            transaction_id,
            document_type,
            original_name,
            stored_name,
            file_path,
            status,
            uploaded_by,
            uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ');

    $docStmt->execute([
        $transactionId,
        $documentType,
        $file['name'],
        $storedName,
        $dbFilePath,
        $docStatus,
        $currentUserId,
    ]);

    $docId = (int)$pdo->lastInsertId();

    // History Log
    $histStmt = $pdo->prepare('
        INSERT INTO transaction_history (
            transaction_id,
            action_type,
            old_value,
            new_value,
            remarks,
            performed_by,
            created_at
        ) VALUES (?, "DOCUMENT_UPLOAD", NULL, ?, ?, ?, NOW())
    ');
    $histStmt->execute([
        $transactionId,
        $file['name'],
        sprintf('Attached %s (Status: %s)', $documentType, $docStatus),
        $currentUserId,
    ]);

    // Audit Log
    recordAuditLog(
        $pdo,
        $currentUserId,
        'UPLOAD_TRANSACTION_DOC',
        'transaction',
        $transactionId,
        [
            'control_no'    => $tx['control_no'],
            'document_type' => $documentType,
            'original_name' => $file['name'],
            'status'        => $docStatus,
        ]
    );

    $pdo->commit();

    sendSuccess('Transaction document uploaded successfully.', [
        'document_id'    => $docId,
        'transaction_id' => $transactionId,
        'document_type'  => $documentType,
        'original_name'  => $file['name'],
        'status'         => $docStatus,
    ], 201);

} catch (Exception $e) {
    $pdo->rollBack();
    if (file_exists($destPath)) {
        @unlink($destPath);
    }
    sendError('Failed to record document metadata: ' . $e->getMessage(), null, 500);
}
