<?php
/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: api/bids/submit.php
 * =============================================================================
 * 
 * Allows a registered and authenticated Bidder to submit a quotation and upload
 * 1 to 5 supporting documents (PDF, JPG, JPEG, PNG, max 5MB each).
 * 
 * KEY RULES:
 * - Bidder must be logged in.
 * - Opportunity must be status='open' and deadline has not passed.
 * - One bidder can only submit ONE bid per opportunity.
 * - Bid amount must be greater than zero.
 * - Stored filenames are cryptographically randomized (never trust original names).
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/audit.php';

// Bidder role only
requireRole('bidder');

// Accept only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

$pdo = getDBConnection();
$currentUserId = getCurrentUserId();

// 1. Read Form Inputs
$opportunityId = filter_input(INPUT_POST, 'opportunity_id', FILTER_VALIDATE_INT);
$bidAmount     = filter_input(INPUT_POST, 'bid_amount', FILTER_VALIDATE_FLOAT);
$remarks       = trim($_POST['remarks'] ?? '');

if (!$opportunityId) {
    sendError('A valid opportunity_id is required.', null, 422);
}

if ($bidAmount === false || $bidAmount <= 0) {
    sendError('Bid amount must be a valid positive number.', null, 422);
}

// 2. Verify Opportunity Exists, is 'open', and Deadline Has Not Passed
$oppStmt = $pdo->prepare('
    SELECT id, reference_no, title, abc, status, deadline
    FROM procurement_opportunities
    WHERE id = ?
    LIMIT 1
');
$oppStmt->execute([$opportunityId]);
$opportunity = $oppStmt->fetch();

if (!$opportunity) {
    sendError('Procurement opportunity not found.', null, 404);
}

if ($opportunity['status'] !== 'open') {
    sendError(
        sprintf('Cannot submit bid: Opportunity is currently "%s" (must be "open").', $opportunity['status']),
        null,
        422
    );
}

if (strtotime($opportunity['deadline']) < time()) {
    sendError('Cannot submit bid: The submission deadline for this opportunity has expired.', null, 422);
}

// 3. Enforce Rule: ONE Bid Per Bidder Per Opportunity
$existingBidStmt = $pdo->prepare('
    SELECT id FROM bids 
    WHERE opportunity_id = ? AND bidder_id = ? 
    LIMIT 1
');
$existingBidStmt->execute([$opportunityId, $currentUserId]);
if ($existingBidStmt->fetch()) {
    sendError(
        'You have already submitted a bid for this opportunity. Only one quotation per supplier is allowed.',
        null,
        409
    );
}

// 4. Normalize and Validate Uploaded Files (1 to 5 files allowed)
$uploadDir = __DIR__ . '/../uploads/bids/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filesToProcess = [];

// Helper to normalize $_FILES structure (handles documents[] or individual file inputs)
if (!empty($_FILES)) {
    foreach ($_FILES as $inputKey => $fileData) {
        if (is_array($fileData['name'])) {
            // Multiple file input: documents[]
            $count = count($fileData['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($fileData['error'][$i] === UPLOAD_ERR_OK) {
                    $filesToProcess[] = [
                        'name'     => $fileData['name'][$i],
                        'type'     => $fileData['type'][$i],
                        'tmp_name' => $fileData['tmp_name'][$i],
                        'size'     => $fileData['size'][$i],
                        'doc_type' => 'Supporting Document',
                    ];
                }
            }
        } elseif ($fileData['error'] === UPLOAD_ERR_OK) {
            // Single file input: document, quotation_file, eligibility_file
            $docType = ($inputKey === 'quotation_file') ? 'Financial Quotation' : 'Eligibility Document';
            $filesToProcess[] = [
                'name'     => $fileData['name'],
                'type'     => $fileData['type'],
                'tmp_name' => $fileData['tmp_name'],
                'size'     => $fileData['size'],
                'doc_type' => $docType,
            ];
        }
    }
}

$fileCount = count($filesToProcess);
if ($fileCount < 1 || $fileCount > 5) {
    sendError(
        sprintf('You must upload between 1 and 5 supporting files. Found %d valid file(s).', $fileCount),
        null,
        422
    );
}

$maxFileSize = 5 * 1024 * 1024; // 5 Megabytes
$allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
$allowedMimeTypes  = [
    'application/pdf',
    'image/jpeg',
    'image/png',
];

// Validate each file before saving any
$validatedFiles = [];
$finfo = finfo_open(FILEINFO_MIME_TYPE);

foreach ($filesToProcess as $idx => $f) {
    $origName = $f['name'];
    $fileSize = $f['size'];
    $tmpPath  = $f['tmp_name'];

    if ($fileSize > $maxFileSize) {
        sendError(sprintf('File "%s" exceeds the maximum allowed size of 5 MB.', $origName), null, 422);
    }

    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExtensions, true)) {
        sendError(
            sprintf('File "%s" has an unsupported extension (.%s). Allowed: PDF, JPG, JPEG, PNG.', $origName, $ext),
            null,
            422
        );
    }

    // Verify actual MIME type from file content
    $detectedMime = finfo_file($finfo, $tmpPath);
    if (!in_array($detectedMime, $allowedMimeTypes, true)) {
        sendError(
            sprintf('File "%s" contains invalid MIME type (%s). Allowed: PDF or Images.', $origName, $detectedMime),
            null,
            422
        );
    }

    // Generate cryptographically random stored filename
    $storedName = sprintf(
        'bid_%d_%d_%s.%s',
        $opportunityId,
        $currentUserId,
        bin2hex(random_bytes(8)),
        $ext
    );

    $validatedFiles[] = [
        'original_name' => $origName,
        'stored_name'   => $storedName,
        'tmp_path'      => $tmpPath,
        'file_path'     => 'uploads/bids/' . $storedName,
        'doc_type'      => $f['doc_type'],
    ];
}
finfo_close($finfo);

// 5. Begin Database Transaction and Save Uploads
$pdo->beginTransaction();
$uploadedDiskPaths = [];

try {
    // Insert Bid Record
    $bidStmt = $pdo->prepare('
        INSERT INTO bids (
            opportunity_id,
            bidder_id,
            bid_amount,
            remarks,
            status,
            submitted_at,
            updated_at
        ) VALUES (?, ?, ?, ?, "submitted", NOW(), NOW())
    ');
    $bidStmt->execute([
        $opportunityId,
        $currentUserId,
        $bidAmount,
        $remarks ?: null,
    ]);

    $bidId = (int)$pdo->lastInsertId();

    // Move uploaded files and insert metadata
    $docStmt = $pdo->prepare('
        INSERT INTO bid_documents (
            bid_id,
            document_type,
            original_name,
            stored_name,
            file_path,
            uploaded_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
    ');

    $savedDocs = [];
    foreach ($validatedFiles as $vFile) {
        $destPath = $uploadDir . $vFile['stored_name'];

        if (!move_uploaded_file($vFile['tmp_path'], $destPath)) {
            throw new Exception(sprintf('Failed to move uploaded file "%s" to storage.', $vFile['original_name']));
        }
        $uploadedDiskPaths[] = $destPath;

        $docStmt->execute([
            $bidId,
            $vFile['doc_type'],
            $vFile['original_name'],
            $vFile['stored_name'],
            $vFile['file_path'],
        ]);

        $savedDocs[] = [
            'id'            => (int)$pdo->lastInsertId(),
            'document_type' => $vFile['doc_type'],
            'original_name' => $vFile['original_name'],
        ];
    }

    // Record Audit Trail
    recordAuditLog(
        $pdo,
        $currentUserId,
        'SUBMIT_BID',
        'bid',
        $bidId,
        [
            'opportunity_id' => $opportunityId,
            'reference_no'   => $opportunity['reference_no'],
            'bid_amount'     => $bidAmount,
            'files_count'    => count($savedDocs),
        ]
    );

    $pdo->commit();

    sendSuccess('Bid quotation and supporting documents submitted successfully.', [
        'bid_id'         => $bidId,
        'opportunity_id' => $opportunityId,
        'bid_amount'     => $bidAmount,
        'status'         => 'submitted',
        'documents'      => $savedDocs,
    ], 201);

} catch (Exception $e) {
    $pdo->rollBack();

    // Clean up any files moved to disk if transaction failed
    foreach ($uploadedDiskPaths as $path) {
        if (file_exists($path)) {
            @unlink($path);
        }
    }

    sendError('Bid submission failed: ' . $e->getMessage(), null, 500);
}
