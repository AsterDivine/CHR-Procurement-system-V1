<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/bids/download_document.php
 * =============================================================================
 * 
 * Securely streams an uploaded supporting bid document.
 * 
 * SECURITY GUARDS:
 * 1. Authentication check: Must be logged in.
 * 2. Authorization check: Bidders can ONLY download files from their OWN bids.
 * 3. Path Traversal Prevention: Uses basename() and realpath() boundary verification.
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

// Ensure user is logged in
requireLogin();

$documentId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$documentId) {
    sendError('A valid document ID is required.', null, 422);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();
$currentRole   = getCurrentUserRole();

// 1. Fetch Document Record and its Associated Bid
$stmt = $pdo->prepare('
    SELECT 
        d.id,
        d.bid_id,
        d.document_type,
        d.original_name,
        d.stored_name,
        d.file_path,
        b.bidder_id
    FROM bid_documents d
    JOIN bids b ON d.bid_id = b.id
    WHERE d.id = ?
    LIMIT 1
');
$stmt->execute([$documentId]);
$doc = $stmt->fetch();

if (!$doc) {
    sendError('Document record not found.', null, 404);
}

// 2. Authorization Enforcement: Bidder may ONLY download their own documents!
if ($currentRole === 'bidder' && (int)$doc['bidder_id'] !== (int)$currentUserId) {
    sendError('Access forbidden: You can only download documents attached to your own bids.', null, 403);
}

// 3. Prevent Path Traversal
$baseUploadsDir = realpath(__DIR__ . '/../uploads/bids');
if (!$baseUploadsDir) {
    sendError('Upload storage directory is not accessible.', null, 500);
}

// Strip any directory traversal sequence (e.g. ../ or /) from stored_name
$safeFilename = basename($doc['stored_name']);
$fullFilePath = $baseUploadsDir . DIRECTORY_SEPARATOR . $safeFilename;

$realFilePath = realpath($fullFilePath);

// Boundary check: File must exist and reside inside the designated uploads/bids folder
if (!$realFilePath || strpos($realFilePath, $baseUploadsDir) !== 0 || !is_file($realFilePath)) {
    sendError('File does not exist on disk or path is invalid.', null, 404);
}

// 4. Determine MIME Type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $realFilePath) ?: 'application/octet-stream';
finfo_close($finfo);

// 5. Send Headers and Stream File
// Clean any leftover buffer
if (ob_get_level()) {
    ob_end_clean();
}

$downloadName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $doc['original_name']);

header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: inline; filename="' . $downloadName . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');
header('Content-Length: ' . filesize($realFilePath));

readfile($realFilePath);
exit;
