const mongoose = require('mongoose');
const Game = require('../models/Game');
const Response = require('../models/Response');
const asyncHandler = require('../utils/asyncHandler');
const liveService = require('../services/liveService');
const { adminGame } = require('../services/serializers');

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const [totalGames, activeGames, totalResponses, totalVotes, totalMedia, recent, liveId] = await Promise.all([
    Game.estimatedDocumentCount(),
    Game.countDocuments({ published: true }),
    Response.estimatedDocumentCount(),
    Response.countDocuments({ kind: 'vote' }),
    Game.countDocuments({ 'media.key': mongoose.trusted({ $ne: null }) }),
    Game.find().sort({ createdAt: -1 }).limit(5).lean(),
    liveService.getCurrentId(),
  ]);

  res.json({
    stats: { totalGames, activeGames, totalVotes, totalResponses, totalMedia },
    recentGames: recent.map((game) => adminGame(game, { liveId })),
  });
});

module.exports = { getStats };
