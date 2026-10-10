const Game = require('../models/Game');
const LiveState = require('../models/LiveState');
const ApiError = require('../utils/ApiError');
const sockets = require('./socketService');
const gameService = require('./gameService');

async function getCurrentId() {
  const state = await LiveState.findOne({ key: 'main' }).lean();
  return state?.currentGameId ? String(state.currentGameId) : null;
}

async function writeCurrent(gameId) {
  await LiveState.findOneAndUpdate({ key: 'main' }, { $set: { currentGameId: gameId } }, { upsert: true });
  sockets.liveChanged(gameId);
}

/** The running order for "Next question": published games, oldest sequence first. */
function queue() {
  return Game.find({ published: true }).sort({ order: 1, createdAt: 1 }).lean();
}

/** Makes a game the live question. A previously answered buzzer question is reset so everyone gets a fresh chance. */
async function setCurrent(gameId) {
  const game = await gameService.findGameOrThrow(gameId);
  if (!game.published) await Game.updateOne({ _id: game._id }, { $set: { published: true } });
  await gameService.prepareForLive(game._id);
  await writeCurrent(game._id);
  sockets.gamesChanged('live', game._id);
  return String(game._id);
}

async function next() {
  const [list, currentId] = await Promise.all([queue(), getCurrentId()]);
  if (!list.length) throw ApiError.conflict('NO_GAMES', 'There are no published games to go live with.');
  const index = currentId ? list.findIndex((g) => String(g._id) === currentId) : -1;
  const target = list[index + 1];
  if (!target) throw ApiError.conflict('NO_MORE_QUESTIONS', 'That was the last question. Pick any game to go live again.');
  return setCurrent(target._id);
}

async function clear() {
  await writeCurrent(null);
}

/** Called when a game is deleted. */
async function clearIfCurrent(gameId) {
  if ((await getCurrentId()) === String(gameId)) await clear();
}

module.exports = { getCurrentId, setCurrent, next, clear, clearIfCurrent, queue };
