const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Document configuration
const DOCUMENT_TYPES = {
  resume: { name: 'Resume / CV', required: true },
  government_id: { name: 'Government ID', required: true },
  photo: { name: '2×2 Photo', required: true },
  tor: { name: 'Transcript of Records (TOR)', required: false },
  diploma: { name: 'Diploma', required: false },
  nbi_clearance: { name: 'NBI Clearance', required: false },
  certificate: { name: 'Certificates', required: false },
  portfolio: { name: 'Portfolio', required: false },
  cover_letter: { name: 'Cover Letter', required: false },
  other: { name: 'Other Supporting Documents', required: false },
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Get the uploads base directory
function getUploadsDir() {
  const uploadsDir = path.join(__dirname, '../../uploads/applicant-documents');
  return uploadsDir;
}

// Ensure uploads directory exists
function ensureUploadsDirExists() {
  const uploadsDir = getUploadsDir();
  const applicantDocsDir = path.join(uploadsDir);
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  return uploadsDir;
}

// Get directory for specific applicant
function getApplicantDocumentsDir(applicantId) {
  const uploadsDir = getUploadsDir();
  const applicantDir = path.join(uploadsDir, applicantId);
  
  if (!fs.existsSync(applicantDir)) {
    fs.mkdirSync(applicantDir, { recursive: true });
  }
  
  return applicantDir;
}

// Validate file
function validateFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return errors;
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  return errors;
}

// Validate document type
function validateDocumentType(documentType) {
  if (!DOCUMENT_TYPES[documentType]) {
    return `Invalid document type: ${documentType}`;
  }
  return null;
}

// Sanitize filename
function sanitizeFilename(originalFilename) {
  // Remove path separators and special characters
  return originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 200);
}

// Save file to disk
function saveFile(file, applicantId) {
  const applicantDir = getApplicantDocumentsDir(applicantId);
  
  // Generate unique filename: uuid + original extension
  const ext = path.extname(file.originalname).toLowerCase();
  const storedFilename = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(applicantDir, storedFilename);

  // Write file synchronously (for simplicity; consider streaming for large files)
  fs.writeFileSync(filePath, file.buffer);

  return {
    storedFilename,
    filePath,
  };
}

// Delete file from disk
function deleteFile(storedFilename, applicantId) {
  try {
    const applicantDir = getApplicantDocumentsDir(applicantId);
    const filePath = path.join(applicantDir, storedFilename);
    
    // Verify file is within applicant directory (security check)
    if (!path.resolve(filePath).startsWith(path.resolve(applicantDir))) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting file:', err);
    return false;
  }
}

// Get file for serving
function getFileStream(storedFilename, applicantId) {
  const applicantDir = getApplicantDocumentsDir(applicantId);
  const filePath = path.join(applicantDir, storedFilename);
  
  // Verify file is within applicant directory (security check)
  if (!path.resolve(filePath).startsWith(path.resolve(applicantDir))) {
    throw new Error('Invalid file path');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  return fs.createReadStream(filePath);
}

// Get required document types
function getRequiredDocumentTypes() {
  return Object.entries(DOCUMENT_TYPES)
    .filter(([, config]) => config.required)
    .map(([type]) => type);
}

// Check if all required documents are present
function checkRequiredDocumentsPresent(documents) {
  const requiredTypes = getRequiredDocumentTypes();
  const presentTypes = new Set(documents.map(doc => doc.document_type));
  
  const missing = requiredTypes.filter(type => !presentTypes.has(type));
  
  return {
    allPresent: missing.length === 0,
    missing,
  };
}

module.exports = {
  DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  getUploadsDir,
  ensureUploadsDirExists,
  getApplicantDocumentsDir,
  validateFile,
  validateDocumentType,
  sanitizeFilename,
  saveFile,
  deleteFile,
  getFileStream,
  getRequiredDocumentTypes,
  checkRequiredDocumentsPresent,
};
