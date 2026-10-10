const { Server } = require('socket.io');
const mongoose = require('mongoose');
const config = require('../config/env');
const { EVENTS } = require('../utils/constants');

let io = null;
const gameRoom = (gameId) => `game:${gameId}`;

/**
 * Real-time layer. Clients only LISTEN; every state change originates from a REST call that has already
 * been validated and persisted, then this module broadcasts the outcome.
 *
 *  global events      games:changed, live:changed
 *  per-game events    question:opened | question:locked | question:reset | poll:updated   (room "game:<id>")
 */
function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrls, credentials: true },
    // Keeps memory down at party scale: clients never send big payloads.
    maxHttpBufferSize: 1e4,
  });

  io.on('connection', (socket) => {
    socket.on('game:join', (gameId) => {
      if (!mongoose.isValidObjectId(gameId)) return;
      for (const room of socket.rooms) {
        if (room.startsWith('game:')) socket.leave(room); // one game room at a time
      }
      socket.join(gameRoom(String(gameId)));
    });
    socket.on('game:leave', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('game:')) socket.leave(room);
      }
    });
  });

  return io;
}

function emitGlobal(event, payload) {
  if (io) io.emit(event, payload);
}
function emitToGame(gameId, event, payload) {
  if (io) io.to(gameRoom(String(gameId))).emit(event, payload);
}

const gamesChanged = (action, gameId) => emitGlobal(EVENTS.GAMES_CHANGED, { action, gameId: String(gameId) });
const liveChanged = (gameId) => emitGlobal(EVENTS.LIVE_CHANGED, { gameId: gameId ? String(gameId) : null });

const questionOpened = (gameId) =>
  emitToGame(gameId, EVENTS.QUESTION_OPENED, { questionId: String(gameId), status: 'open' });
const questionReset = (gameId) =>
  emitToGame(gameId, EVENTS.QUESTION_RESET, { questionId: String(gameId), status: 'open' });
const questionLocked = (gameId, payload) =>
  emitToGame(gameId, EVENTS.QUESTION_LOCKED, { questionId: String(gameId), status: 'locked', ...payload });

// Votes arrive in bursts at a party; coalesce them so we compute + broadcast at most ~3 times a second per game.
const pending = new Map();
function pollUpdated(gameId, computePayload) {
  const key = String(gameId);
  if (pending.has(key)) return;
  pending.set(
    key,
    setTimeout(async () => {
      pending.delete(key);
      try {
        emitToGame(key, EVENTS.POLL_UPDATED, await computePayload());
      } catch (error) {
        console.warn(`[socket] poll update failed: ${error.message}`);
      }
    }, 300)
  );
}

module.exports = { init, gamesChanged, liveChanged, questionOpened, questionReset, questionLocked, pollUpdated };
