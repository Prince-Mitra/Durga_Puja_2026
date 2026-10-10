const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const storage = require('../services/storage');
const Game = require('../models/Game');
const { classifyFile, maxBytesFor, kindFromKey } = require('../utils/media');

// POST /api/admin/upload  (multipart, field "file")
const uploadMedia = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest('No file received. Send it as multipart field "file".');

  try {
    const classified = classifyFile(file.originalname, file.mimetype);
    if (!classified) throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Unsupported file type.');

    const limit = maxBytesFor(classified.kind);
    if (file.size > limit) {
      throw new ApiError(413, 'FILE_TOO_LARGE', `${classified.kind} files can be at most ${Math.round(limit / 1024 / 1024)} MB.`);
    }

    const { key } = await storage.save({
      path: file.path,
      ext: classified.ext,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    });

    res.status(201).json({
      media: {
        key,
        url: storage.getUrl(key),
        kind: classified.kind,
        mimeType: file.mimetype,
        size: file.size,
        originalName: file.originalname.slice(0, 200),
      },
    });
  } catch (error) {
    await storage.removeTemp(file.path); // never leave rejected uploads on disk
    throw error;
  }
});

// DELETE /api/admin/upload/:key  - only if no game uses it (used when the admin discards a fresh upload)
const deleteMedia = asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (!kindFromKey(key) || !(await storage.exists(key))) throw ApiError.notFound('File not found');
  if (await Game.exists({ 'media.key': key })) throw ApiError.conflict('MEDIA_IN_USE', 'This file is used by a game.');
  await storage.remove(key);
  res.json({ ok: true });
});

module.exports = { uploadMedia, deleteMedia };
