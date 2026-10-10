const mongoose = require('mongoose');
const Game = require('../models/Game');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const gameService = require('../services/gameService');
const liveService = require('../services/liveService');
const { publicSummary, publicGame } = require('../services/serializers');
const { answerBodySchema, resolveOptionIndex } = require('../validators/gameValidators');

// GET /api/games
const listGames = asyncHandler(async (req, res) => {
  const games = await Game.find({ published: true }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ games: games.map(publicSummary) });
});

// GET /api/games/live  -> the admin-selected live question (or null)
const getLiveGame = asyncHandler(async (req, res) => {
  const currentId = await liveService.getCurrentId();
  const game = currentId ? await Game.findOne({ _id: currentId, published: true }).lean() : null;
  if (!game) return res.json({ game: null });
  const myResponse = await gameService.latestResponseOf(game._id, req.player?.pid);
  return res.json({ game: publicGame(game, { viewerId: req.player?.pid, myResponse }) });
});

// GET /api/games/:id
const getGame = asyncHandler(async (req, res) => {
  const game = await gameService.findPublishedOrThrow(req.params.id);
  const myResponse = await gameService.latestResponseOf(game._id, req.player?.pid);
  res.json({ game: publicGame(game, { viewerId: req.player?.pid, myResponse }) });
});

// POST /api/games/:id/answer  (aliases: /respond, /vote)
// The body only says WHICH OPTION the player wants. Everything else (first? correct? allowed?) is decided here.
const answerGame = asyncHandler(async (req, res) => {
  const body = answerBodySchema.parse(req.body);
  const optionIndex = resolveOptionIndex(body);
  const result = await gameService.submitAnswer(req.params.id, req.player, optionIndex);
  res.status(200).json(result);
});

// GET /api/games/:id/results
const getResults = asyncHandler(async (req, res) => {
  const game = await gameService.findPublishedOrThrow(req.params.id);
  if (game.interactionMode === 'none') throw ApiError.notFound('This content has no results');
  res.json({ results: await gameService.buildResults(game) });
});

// GET /api/results -> every game whose results the admin has made public
const listPublicResults = asyncHandler(async (req, res) => {
  const games = await Game.find({
    published: true,
    'settings.showResults': mongoose.trusted({ $ne: false }),
    $or: [
      { interactionMode: mongoose.trusted({ $in: ['normal', 'buzzer'] }) },
      { interactionMode: 'firstCorrect', answerStatus: 'locked' }, // hidden until the question is decided
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const items = await Promise.all(
    games.map(async (game) => ({
      game: publicSummary(game),
      results: await gameService.buildResults(game),
    }))
  );
  res.json({ items });
});

module.exports = { listGames, getLiveGame, getGame, answerGame, getResults, listPublicResults };
