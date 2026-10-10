const asyncHandler = require('../utils/asyncHandler');
const { playerSessionSchema } = require('../validators/authValidators');
const { createOrRefreshSession } = require('../services/playerService');

// POST /api/player/session  { token?, nickname? } -> { token, player: { id, name } }
const createSession = asyncHandler(async (req, res) => {
  const body = playerSessionSchema.parse(req.body ?? {});
  res.json(createOrRefreshSession(body));
});

module.exports = { createSession };
