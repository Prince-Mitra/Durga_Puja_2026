const Game = require('../models/Game');
const Response = require('../models/Response');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const storage = require('../services/storage');
const sockets = require('../services/socketService');
const gameService = require('../services/gameService');
const liveService = require('../services/liveService');
const { adminGame } = require('../services/serializers');
const { kindFromKey } = require('../utils/media');
const { gameBodySchema, normalizeGameInput } = require('../validators/gameValidators');

/** Re-resolves an uploaded media reference from the storage key (never trusts client-sent url/kind/size). */
async function resolveMedia(input, previous) {
  if (!input) return { key: null, kind: null, mimeType: null, size: null, originalName: null };
  if (previous?.key === input.key) return previous; // unchanged
  const kind = kindFromKey(input.key);
  if (!kind || !(await storage.exists(input.key))) {
    throw ApiError.badRequest('The uploaded file could not be found. Please upload it again.');
  }
  return {
    key: input.key,
    kind,
    mimeType: typeof input.mimeType === 'string' ? input.mimeType.slice(0, 100) : null,
    size: Number.isFinite(input.size) ? input.size : null,
    originalName: typeof input.originalName === 'string' ? input.originalName.slice(0, 200) : null,
  };
}

function assertMediaMatchesType(contentType, media) {
  if (['image', 'video', 'audio'].includes(contentType) && media.kind !== contentType) {
    throw ApiError.badRequest(`This game needs ${contentType === 'image' ? 'an' : 'a'} ${contentType} file, but a ${media.kind} file was uploaded.`);
  }
}

// GET /api/admin/games?status=published|draft&type=image
const listGames = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status === 'published') filter.published = true;
  if (req.query.status === 'draft') filter.published = false;
  if (typeof req.query.type === 'string' && ['image', 'video', 'audio', 'quiz', 'poll'].includes(req.query.type)) {
    filter.contentType = req.query.type;
  }
  const [games, liveId] = await Promise.all([
    Game.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
    liveService.getCurrentId(),
  ]);
  res.json({ games: games.map((game) => adminGame(game, { liveId })) });
});

// GET /api/admin/games/:id
const getGame = asyncHandler(async (req, res) => {
  const [game, liveId] = await Promise.all([gameService.findGameOrThrow(req.params.id), liveService.getCurrentId()]);
  res.json({ game: adminGame(game, { liveId }) });
});

// POST /api/admin/games
const createGame = asyncHandler(async (req, res) => {
  const data = normalizeGameInput(gameBodySchema.parse(req.body));
  const media = await resolveMedia(req.body.media);
  assertMediaMatchesType(data.contentType, media);

  const game = await Game.create({ ...data, media, createdBy: req.admin.id });
  sockets.gamesChanged('created', game._id);
  res.status(201).json({ game: adminGame(game.toObject()) });
});

// PUT /api/admin/games/:id
const updateGame = asyncHandler(async (req, res) => {
  const existing = await gameService.findGameOrThrow(req.params.id);
  const data = normalizeGameInput(gameBodySchema.parse(req.body));
  const media = await resolveMedia(req.body.media, existing.media);
  assertMediaMatchesType(data.contentType, media);

  // If the thing players answer changed, old answers are meaningless -> start clean and re-open.
  const answerShapeChanged =
    JSON.stringify([existing.options, existing.correctAnswer ?? null, existing.interactionMode]) !==
    JSON.stringify([data.options, data.correctAnswer, data.interactionMode]);

  const update = { $set: { ...data, media } };
  if (answerShapeChanged) {
    update.$set.answerStatus = 'open';
    update.$set.responseCount = 0;
    update.$unset = { firstResponder: '', selectedAnswer: '', answeredAt: '', isCorrect: '', lockedBy: '' };
  }

  const game = await Game.findByIdAndUpdate(existing._id, update, { new: true, lean: true, runValidators: true });
  if (answerShapeChanged) await Response.deleteMany({ gameId: existing._id });
  if (existing.media?.key && existing.media.key !== media.key) await storage.remove(existing.media.key);

  sockets.gamesChanged('updated', game._id);
  if (answerShapeChanged) sockets.questionReset(game._id);
  res.json({ game: adminGame(game, { liveId: await liveService.getCurrentId() }) });
});

// DELETE /api/admin/games/:id
const deleteGame = asyncHandler(async (req, res) => {
  const game = await Game.findByIdAndDelete(req.params.id).lean();
  if (!game) throw ApiError.notFound('Game not found');
  await Promise.all([
    Response.deleteMany({ gameId: game._id }),
    game.media?.key ? storage.remove(game.media.key) : null,
    liveService.clearIfCurrent(game._id),
  ]);
  sockets.gamesChanged('deleted', game._id);
  res.json({ ok: true });
});

// PATCH /api/admin/games/:id/publish   { published?: boolean }  (toggles when omitted)
const setPublished = asyncHandler(async (req, res) => {
  const existing = await gameService.findGameOrThrow(req.params.id);
  const published = typeof req.body?.published === 'boolean' ? req.body.published : !existing.published;
  const game = await Game.findByIdAndUpdate(existing._id, { $set: { published } }, { new: true, lean: true });
  sockets.gamesChanged(published ? 'published' : 'unpublished', game._id);
  res.json({ game: adminGame(game, { liveId: await liveService.getCurrentId() }) });
});

// GET /api/admin/games/:id/results
const getResults = asyncHandler(async (req, res) => {
  const game = await gameService.findGameOrThrow(req.params.id);
  res.json({ game: adminGame(game), results: await gameService.buildResults(game, { admin: true }) });
});

// POST /api/admin/games/:id/reset
const resetGame = asyncHandler(async (req, res) => {
  const game = await gameService.resetGame(req.params.id);
  res.json({ game: adminGame(game, { liveId: await liveService.getCurrentId() }) });
});

// POST /api/admin/games/:id/lock
const lockGame = asyncHandler(async (req, res) => {
  const game = await gameService.lockGame(req.params.id);
  res.json({ game: adminGame(game, { liveId: await liveService.getCurrentId() }) });
});

// POST /api/admin/games/:id/open  -> "Start question": publish + make live + (re)open it
const openGame = asyncHandler(async (req, res) => {
  await liveService.setCurrent(req.params.id);
  const game = await gameService.findGameOrThrow(req.params.id);
  res.json({ game: adminGame(game, { liveId: await liveService.getCurrentId() }) });
});

module.exports = { listGames, getGame, createGame, updateGame, deleteGame, setPublished, getResults, resetGame, lockGame, openGame };
