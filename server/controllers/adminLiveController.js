const Game = require('../models/Game');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const liveService = require('../services/liveService');
const { adminGame } = require('../services/serializers');
const { z } = require('zod');

async function snapshot() {
  const [queue, currentId] = await Promise.all([liveService.queue(), liveService.getCurrentId()]);
  const current = currentId ? await Game.findById(currentId).lean() : null;
  const index = current ? queue.findIndex((g) => String(g._id) === currentId) : -1;
  const upcoming = queue[index + 1] || null;
  return {
    current: current ? adminGame(current, { liveId: currentId }) : null,
    next: upcoming ? { id: String(upcoming._id), title: upcoming.title } : null,
    queue: queue.map((game) => adminGame(game, { liveId: currentId })),
  };
}

// GET /api/admin/live
const getLive = asyncHandler(async (req, res) => res.json(await snapshot()));

// POST /api/admin/live/next
const nextQuestion = asyncHandler(async (req, res) => {
  await liveService.next();
  res.json(await snapshot());
});

// POST /api/admin/live/set  { gameId }
const setLive = asyncHandler(async (req, res) => {
  const { gameId } = z.object({ gameId: z.string().length(24) }).parse(req.body);
  await liveService.setCurrent(gameId);
  res.json(await snapshot());
});

// POST /api/admin/live/clear
const clearLive = asyncHandler(async (req, res) => {
  await liveService.clear();
  res.json(await snapshot());
});

module.exports = { getLive, nextQuestion, setLive, clearLive, ApiError };
