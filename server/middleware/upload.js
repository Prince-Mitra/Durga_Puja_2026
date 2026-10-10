const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const storage = require('../services/storage');
const ApiError = require('../utils/ApiError');
const { classifyFile, largestAllowedBytes, allowedExtensions } = require('../utils/media');

/**
 * multer streams the upload to a temp file (never into memory - videos can be 100 MB).
 * The controller then validates per-kind size and hands the file to the storage driver.
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, storage.tempDir),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase().slice(0, 6)}.part`),
  }),
  limits: { fileSize: largestAllowedBytes(), files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    if (!classifyFile(file.originalname, file.mimetype)) {
      return cb(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', `Unsupported file type. Allowed: ${allowedExtensions()}`));
    }
    return cb(null, true);
  },
});

module.exports = upload.single('file');
