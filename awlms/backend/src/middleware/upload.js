const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure multer for document uploads
const storage = multer.memoryStorage(); // Store in memory, then save to disk manually

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Allow specific MIME types and extensions
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}`));
    }

    cb(null, true);
  },
});

module.exports = { upload };
