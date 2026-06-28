const express = require('express');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { upload } = require('../middleware/upload');
const {
  validateFile,
  validateDocumentType,
  saveFile,
  deleteFile,
  getFileStream,
  DOCUMENT_TYPES,
} = require('../services/documentService');
const { notifyAllHr } = require('../services/userNotifications');

const router = express.Router();

// Required document types that must be uploaded for application to be complete
const REQUIRED_DOCUMENT_TYPES = ['resume', 'government_id', 'photo'];

async function checkAndUpdateDocumentPendingStatus(pool, applicantId) {
  try {
    // Get all required documents for this applicant
    const [uploadedDocs] = await pool.query(
      `SELECT DISTINCT document_type FROM ApplicantDocuments
       WHERE applicant_id = ? AND document_type IN (?)`,
      [applicantId, REQUIRED_DOCUMENT_TYPES]
    );
    
    const uploadedTypes = new Set(uploadedDocs.map(d => d.document_type));
    const allRequiredUploaded = REQUIRED_DOCUMENT_TYPES.every(type => uploadedTypes.has(type));
    
    if (allRequiredUploaded) {
      // All required documents uploaded - update status
      await pool.query(
        `UPDATE Applicant SET documents_pending = FALSE, hiring_decision = 'pending_review'
         WHERE id = ? AND documents_pending = TRUE`,
        [applicantId]
      );
    }
  } catch (err) {
    console.error('Error checking document pending status:', err);
  }
}

async function insertDocumentHistory(pool, doc) {
  const [historyRows] = await pool.query(
    `SELECT MAX(version_number) AS max_version
     FROM ApplicantDocumentHistory
     WHERE document_id = ?`,
    [doc.id]
  );
  const nextVersion = (historyRows[0]?.max_version || 0) + 1;
  await pool.query(
    `INSERT INTO ApplicantDocumentHistory (
       id, document_id, applicant_id, document_type, version_number,
       original_filename, stored_filename, mime_type, file_size, upload_timestamp,
       verification_status, verified_by_user_id, verified_at, verification_comments, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      crypto.randomUUID(),
      doc.id,
      doc.applicant_id,
      doc.document_type,
      nextVersion,
      doc.original_filename,
      doc.stored_filename,
      doc.mime_type,
      doc.file_size,
      doc.upload_timestamp,
      doc.verification_status,
      doc.verified_by_user_id,
      doc.verified_at,
      doc.verification_comments,
    ]
  );
}

async function resolveApplicantByToken(pool, accessToken) {
  if (!accessToken) return null;
  const [rows] = await pool.query(
    `SELECT id FROM Applicant WHERE document_access_token = ? LIMIT 1`,
    [accessToken]
  );
  return rows.length ? rows[0].id : null;
}

async function resolveApplicantFromRequest(pool, providedApplicantId, accessToken) {
  if (providedApplicantId && accessToken) {
    const tokenApplicantId = await resolveApplicantByToken(pool, accessToken);
    if (tokenApplicantId && tokenApplicantId === providedApplicantId) {
      return providedApplicantId;
    }
    return null;
  }

  if (providedApplicantId) {
    return null;
  }

  return resolveApplicantByToken(pool, accessToken);
}

async function notifyHrAboutDocument(pool, applicantId, documentType, action, documentId) {
  try {
    const [rows] = await pool.query(
      `SELECT a.full_name, jp.title AS job_title
       FROM Applicant a
       LEFT JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.id = ? LIMIT 1`,
      [applicantId]
    );
    const applicantName = rows[0]?.full_name || 'Applicant';
    const jobTitle = rows[0]?.job_title || 'position';
    await notifyAllHr(pool, {
      category: 'hr_document_upload',
      title: `Document ${action} for ${applicantName}`,
      body: `${applicantName} uploaded or replaced a ${DOCUMENT_TYPES[documentType]?.name || documentType} document for the ${jobTitle} application.`,
      entityType: 'applicant',
      entityId: applicantId,
      metadata: {
        documentId,
        documentType,
        action,
      },
    });
  } catch (err) {
    console.error('Could not notify HR about document upload:', err);
  }
}

/**
 * POST /api/recruitment/upload-document
 * Upload a single applicant document (before application submission)
 * 
 * Body:
 *   - file: Binary file data (multipart/form-data)
 *   - applicant_id: Applicant UUID (optional, must be paired with an access_token)
 *   - document_type: Type of document (resume, government_id, photo, etc.)
 *   - session_id: Session ID for temporary uploads before applicant creation
 *   - access_token: Secure applicant document access token
 * 
 * Response:
 *   - document_id: UUID of the created document record
 *   - original_filename: Name as uploaded
 *   - file_size: Size in bytes
 *   - document_type: Type
 */
router.post('/upload-document', upload.single('file'), async (req, res) => {
  const { applicant_id, document_type, session_id, access_token } = req.body;

  if (!document_type) {
    return res.status(400).json({ error: 'document_type is required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Validate document type
  const docTypeError = validateDocumentType(document_type);
  if (docTypeError) {
    return res.status(400).json({ error: docTypeError });
  }

  // Validate file
  const fileErrors = validateFile(req.file);
  if (fileErrors.length > 0) {
    return res.status(400).json({ error: fileErrors.join('; ') });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const resolvedApplicantId = await resolveApplicantFromRequest(pool, applicant_id, access_token);
    if (!resolvedApplicantId) {
      return res.status(403).json({ error: 'Applicant authorization failed' });
    }

    // Save file to disk
    const { storedFilename } = saveFile(req.file, resolvedApplicantId);

    const documentId = crypto.randomUUID();
    const now = new Date();

    const [existingDocs] = await pool.query(
      `SELECT id, stored_filename FROM ApplicantDocuments
       WHERE applicant_id = ? AND document_type = ?
       LIMIT 1`,
      [resolvedApplicantId, document_type]
    );

    if (existingDocs.length > 0) {
      const existingDoc = existingDocs[0];
      await insertDocumentHistory(pool, existingDoc);
      await pool.query(
        `UPDATE ApplicantDocuments
         SET original_filename = ?, stored_filename = ?, mime_type = ?, file_size = ?, upload_timestamp = ?, verification_status = 'uploaded', verified_by_user_id = NULL, verified_at = NULL, verification_comments = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          req.file.originalname,
          storedFilename,
          req.file.mimetype,
          req.file.size,
          now,
          existingDoc.id,
        ]
      );

      // Check if all required documents are now uploaded
      await checkAndUpdateDocumentPendingStatus(pool, resolvedApplicantId);

      await notifyHrAboutDocument(pool, resolvedApplicantId, document_type, 'replaced', existingDoc.id);

      return res.status(200).json({
        document_id: existingDoc.id,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        document_type,
        mime_type: req.file.mimetype,
        verification_status: 'uploaded',
        uploaded_at: now.toISOString(),
        last_updated_at: now.toISOString(),
      });
    }

    await pool.query(
      `INSERT INTO ApplicantDocuments (
         id, applicant_id, document_type, original_filename, stored_filename,
         mime_type, file_size, upload_timestamp, verification_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')`,
      [
        documentId,
        resolvedApplicantId,
        document_type,
        req.file.originalname,
        storedFilename,
        req.file.mimetype,
        req.file.size,
        now,
      ]
    );

    // Check if all required documents are now uploaded
    await checkAndUpdateDocumentPendingStatus(pool, resolvedApplicantId);

    await notifyHrAboutDocument(pool, resolvedApplicantId, document_type, 'uploaded', documentId);

    return res.status(201).json({
      document_id: documentId,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      document_type,
      mime_type: req.file.mimetype,
      verification_status: 'uploaded',
      uploaded_at: now.toISOString(),
      last_updated_at: now.toISOString(),
    });
  } catch (err) {
    console.error('Document upload error:', err);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * DELETE /api/recruitment/documents/:documentId
 * Remove an uploaded document (before application submission)
 * 
 * Query params:
 *   - applicant_id: Applicant UUID (required for authorization)
 */
router.delete('/documents/:documentId', async (req, res) => {
  const { documentId } = req.params;
  const { applicant_id, token } = req.query;

  if (!applicant_id && !token) {
    return res.status(400).json({ error: 'applicant_id or token is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Find document
    const [documents] = await pool.query(
      'SELECT id, applicant_id, stored_filename FROM ApplicantDocuments WHERE id = ? LIMIT 1',
      [documentId]
    );

    if (!documents.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documents[0];

    // Verify authorization (document belongs to this applicant)
    const resolvedApplicantId = await resolveApplicantFromRequest(pool, applicant_id, token);
    if (!resolvedApplicantId || doc.applicant_id !== resolvedApplicantId) {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    // Delete file from disk
    deleteFile(doc.stored_filename, resolvedApplicantId);

    // Delete database record
    await pool.query('DELETE FROM ApplicantDocuments WHERE id = ?', [documentId]);

    return res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Document deletion error:', err);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * GET /api/recruitment/documents/:documentId/download
 * Download an applicant document
 * 
 * Query params:
 *   - applicant_id: Applicant UUID (required for authorization)
 */
router.get('/documents/:documentId/download', async (req, res) => {
  const { documentId } = req.params;
  const { applicant_id, token } = req.query;

  if (!applicant_id && !token) {
    return res.status(400).json({ error: 'applicant_id or token is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Find document
    const [documents] = await pool.query(
      `SELECT id, applicant_id, stored_filename, original_filename, mime_type 
       FROM ApplicantDocuments WHERE id = ? LIMIT 1`,
      [documentId]
    );

    if (!documents.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documents[0];

    // Verify authorization
    const resolvedApplicantId = await resolveApplicantFromRequest(pool, applicant_id, token);
    if (!resolvedApplicantId || doc.applicant_id !== resolvedApplicantId) {
      return res.status(403).json({ error: 'Not authorized to download this document' });
    }

    // Get file stream and send
    try {
      const fileStream = getFileStream(doc.stored_filename, resolvedApplicantId);
      res.setHeader('Content-Type', doc.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
      fileStream.pipe(res);
    } catch (err) {
      return res.status(404).json({ error: 'File not found on server' });
    }
  } catch (err) {
    console.error('Document download error:', err);
    return res.status(500).json({ error: 'Failed to download document' });
  }
});

/**
 * GET /api/recruitment/applicants/:applicantId/documents
 * List all documents for an applicant
 */
router.get('/applicants/:applicantId/documents', async (req, res) => {
  const { applicantId } = req.params;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'access token is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const resolvedApplicantId = await resolveApplicantFromRequest(pool, null, token);
    if (!resolvedApplicantId || resolvedApplicantId !== applicantId) {
      return res.status(403).json({ error: 'Not authorized to view documents' });
    }

    const [documents] = await pool.query(
      `SELECT id, document_type, original_filename, file_size, mime_type, upload_timestamp, verification_status, updated_at
       FROM ApplicantDocuments 
       WHERE applicant_id = ?
       ORDER BY upload_timestamp DESC`,
      [applicantId]
    );

    return res.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        document_type: doc.document_type,
        document_type_label: DOCUMENT_TYPES[doc.document_type]?.name || doc.document_type,
        original_filename: doc.original_filename,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        uploaded_at: doc.upload_timestamp,
        verification_status: doc.verification_status || 'uploaded',
        verified_by_user_id: doc.verified_by_user_id,
        verified_at: doc.verified_at,
        verification_comments: doc.verification_comments,
        last_updated_at: doc.updated_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching documents:', err);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

module.exports = router;
