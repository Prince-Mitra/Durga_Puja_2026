const mongoose = require('mongoose');
const Game = require('../models/Game');
const Response = require('../models/Response');
const ApiError = require('../utils/ApiError');
const sockets = require('./socketService');
const { lockOut, settingsOf, windowState, myResponseOut } = require('./serializers');

const RACE_MODES = ['buzzer', 'firstCorrect'];

/* -------------------------------------------------------------------------- */
/*  Reads                                                                      */
/* -------------------------------------------------------------------------- */

async function findGameOrThrow(gameId) {
  if (!mongoose.isValidObjectId(gameId)) throw ApiError.notFound('Game not found');
  const game = await Game.findById(gameId).lean();
  if (!game) throw ApiError.notFound('Game not found');
  return game;
}

async function findPublishedOrThrow(gameId) {
  const game = await findGameOrThrow(gameId);
  if (!game.published) throw ApiError.notFound('Game not found'); // unpublished games do not exist for players
  return game;
}

async function latestResponseOf(gameId, playerId) {
  if (!playerId) return null;
  return Response.findOne({ gameId, anonymousPlayerId: playerId }).sort({ attemptNo: -1 }).lean();
}

/* -------------------------------------------------------------------------- */
/*  Results                                                                    */
/* -------------------------------------------------------------------------- */

async function aggregateResponses(game) {
  const [row] = await Response.aggregate([
    { $match: { gameId: game._id } },
    {
      $facet: {
        byOption: [{ $group: { _id: '$selectedAnswer', votes: { $sum: 1 } } }],
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              correct: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
              incorrect: { $sum: { $cond: [{ $eq: ['$isCorrect', false] }, 1, 0] } },
            },
          },
        ],
        players: [{ $group: { _id: '$anonymousPlayerId' } }, { $count: 'n' }],
      },
    },
  ]);
  const totals = row?.totals?.[0] || { total: 0, correct: 0, incorrect: 0 };
  const votesByIndex = new Map((row?.byOption || []).map((entry) => [entry._id, entry.votes]));
  return { totals, players: row?.players?.[0]?.n || 0, votesByIndex };
}

/**
 * Results for one game. `admin: true` adds correct/incorrect stats, the correct answer and the raw response list.
 */
async function buildResults(game, { admin = false } = {}) {
  const { totals, players, votesByIndex } = await aggregateResponses(game);
  const options = (game.options || []).map((text, index) => {
    const votes = votesByIndex.get(index) || 0;
    return { index, text, votes, percent: totals.total ? Math.round((votes / totals.total) * 100) : 0 };
  });
  const settings = settingsOf(game);

  const results = {
    gameId: String(game._id),
    title: game.title,
    contentType: game.contentType,
    interactionMode: game.interactionMode,
    totalResponses: totals.total,
    totalPlayers: players,
    options,
  };

  if (!admin && game.interactionMode === 'firstCorrect' && game.answerStatus !== 'locked') {
    // Vote counts would reveal the right answer by elimination while the question is still open.
    throw ApiError.forbidden('Results appear once someone gets it right', 'RESULTS_HIDDEN');
  }

  if (RACE_MODES.includes(game.interactionMode)) {
    results.buzzer = {
      status: game.answerStatus,
      lock: lockOut(game, null),
    };
    if (results.buzzer.lock) delete results.buzzer.lock.isMe;
  }

  if (admin) {
    const hasCorrect = game.correctAnswer != null;
    results.correctAnswer = game.correctAnswer ?? null;
    results.stats = hasCorrect
      ? {
          correct: totals.correct,
          incorrect: totals.incorrect,
          accuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
        }
      : null;
    const rows = await Response.find({ gameId: game._id }).sort({ createdAt: -1 }).limit(200).lean();
    results.responses = rows.map((row) => ({
      id: String(row._id),
      playerId: row.anonymousPlayerId,
      playerName: row.playerName,
      selectedAnswer: row.selectedAnswer,
      selectedText: game.options?.[row.selectedAnswer] ?? null,
      isCorrect: row.isCorrect ?? null,
      isFirst: row.isFirst,
      createdAt: row.createdAt,
    }));
  } else if (!settings.showResults && game.interactionMode === 'normal') {
    throw ApiError.forbidden('Results are hidden for this game', 'RESULTS_HIDDEN');
  }
  return results;
}

/** Lightweight payload pushed over sockets while people are voting. */
async function pollPayload(gameId) {
  const game = await Game.findById(gameId).lean();
  if (!game) return { questionId: String(gameId), totalResponses: 0, options: [] };
  const { totals, votesByIndex } = await aggregateResponses(game);
  const showCounts = settingsOf(game).showResults;
  return {
    questionId: String(game._id),
    totalResponses: totals.total,
    options: showCounts
      ? (game.options || []).map((text, index) => {
          const votes = votesByIndex.get(index) || 0;
          return { index, text, votes, percent: totals.total ? Math.round((votes / totals.total) * 100) : 0 };
        })
      : [],
  };
}

/* -------------------------------------------------------------------------- */
/*  Answering                                                                  */
/* -------------------------------------------------------------------------- */

function assertPlayable(game, optionIndex) {
  if (!game.published) throw ApiError.notFound('Game not found');
  if (game.interactionMode === 'none') {
    throw ApiError.badRequest('This content is view-only', { code: 'NO_INTERACTION' });
  }
  const state = windowState(game);
  if (state !== 'live') {
    throw new ApiError(403, 'GAME_NOT_ACTIVE', state === 'upcoming' ? 'This game has not started yet' : 'This game has ended');
  }
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (game.options || []).length) {
    throw ApiError.badRequest('Invalid option');
  }
}

/**
 * FIRST-CLICK-WINS.
 *
 * The whole race is decided by this single atomic operation. MongoDB applies a findOneAndUpdate to one
 * document at a time, so when 50 requests arrive together exactly ONE of them still sees answerStatus:'open';
 * that one flips it to 'locked' and records the responder. Every other request matches nothing and gets a 409.
 * No application-level locking, no read-then-write gap.
 *
 * correctAnswer is part of the filter so a concurrent admin edit cannot make us store a stale isCorrect.
 */
async function submitBuzzer(game, player, optionIndex) {
  const isCorrect = game.correctAnswer == null ? null : optionIndex === game.correctAnswer;
  const answeredAt = new Date();

  const won = await Game.findOneAndUpdate(
    {
      _id: game._id,
      published: true,
      interactionMode: 'buzzer',
      answerStatus: 'open',
      correctAnswer: game.correctAnswer ?? null,
    },
    {
      $set: {
        answerStatus: 'locked',
        lockedBy: 'player',
        firstResponder: { playerId: player.pid, name: player.name },
        selectedAnswer: optionIndex,
        answeredAt,
        isCorrect,
      },
      $inc: { responseCount: 1 },
    },
    { new: true, lean: true }
  );

  if (!won) {
    const fresh = await Game.findById(game._id).lean();
    if (fresh && fresh.answerStatus === 'locked') {
      throw ApiError.conflict('QUESTION_ALREADY_ANSWERED', 'Question already answered.', {
        lock: lockOut(fresh, player.pid),
      });
    }
    throw ApiError.conflict('QUESTION_NOT_OPEN', 'This question is not open right now.');
  }

  // Audit trail (also feeds results). The unique index makes a duplicate here harmless.
  await Response.create({
    gameId: won._id,
    anonymousPlayerId: player.pid,
    playerName: player.name,
    selectedAnswer: optionIndex,
    isCorrect,
    isFirst: true,
    kind: 'answer',
  }).catch((error) => {
    if (error.code !== 11000) throw error;
  });

  const lock = lockOut(won, player.pid);
  sockets.questionLocked(won._id, {
    selectedAnswer: lock.selectedAnswer,
    responderId: lock.responderId,
    responderName: lock.responderName,
    isCorrect: lock.isCorrect,
    correctAnswer: lock.correctAnswer,
    lockedBy: 'player',
    answeredAt,
  });
  sockets.gamesChanged('locked', won._id);

  return { mode: 'buzzer', won: true, lock };
}

/**
 * FIRST CORRECT WINS - one chance per player, wrong answers do NOT lock the question.
 *
 *  1. The player's single chance is claimed by inserting a Response (unique index gameId+player+attempt 0),
 *     so a second tap / second tab / replay is rejected with ALREADY_RESPONDED.
 *  2. Wrong answer -> stored, question stays open for everybody else.
 *  3. Correct answer -> the same atomic open->locked update as the buzzer. Exactly one correct request wins;
 *     a simultaneous correct request gets QUESTION_ALREADY_ANSWERED (and its response is discarded).
 */
async function submitFirstCorrect(game, player, optionIndex) {
  if (game.answerStatus === 'locked') {
    throw ApiError.conflict('QUESTION_ALREADY_ANSWERED', 'Question already answered.', { lock: lockOut(game, player.pid) });
  }
  if (game.correctAnswer == null) throw ApiError.badRequest('This question has no correct answer configured.');
  const isCorrect = optionIndex === game.correctAnswer;

  let response;
  try {
    response = await Response.create({
      gameId: game._id,
      anonymousPlayerId: player.pid,
      playerName: player.name,
      selectedAnswer: optionIndex,
      isCorrect,
      kind: 'answer',
      attemptNo: 0,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await latestResponseOf(game._id, player.pid);
      throw ApiError.conflict('ALREADY_RESPONDED', 'You already used your chance on this question.', {
        myResponse: myResponseOut(game, existing),
      });
    }
    throw error;
  }

  if (!isCorrect) {
    await Game.updateOne({ _id: game._id }, { $inc: { responseCount: 1 } });
    return { mode: 'firstCorrect', won: false, myResponse: myResponseOut(game, response.toObject()) };
  }

  const answeredAt = new Date();
  const won = await Game.findOneAndUpdate(
    { _id: game._id, published: true, interactionMode: 'firstCorrect', answerStatus: 'open', correctAnswer: game.correctAnswer },
    {
      $set: {
        answerStatus: 'locked',
        lockedBy: 'player',
        firstResponder: { playerId: player.pid, name: player.name },
        selectedAnswer: optionIndex,
        answeredAt,
        isCorrect: true,
      },
      $inc: { responseCount: 1 },
    },
    { new: true, lean: true }
  );

  if (!won) {
    await Response.deleteOne({ _id: response._id }); // lost the race (or the question changed): give the chance back
    const fresh = await Game.findById(game._id).lean();
    if (fresh && fresh.answerStatus === 'locked') {
      throw ApiError.conflict('QUESTION_ALREADY_ANSWERED', 'Question already answered.', { lock: lockOut(fresh, player.pid) });
    }
    throw ApiError.conflict('QUESTION_NOT_OPEN', 'This question is not open right now.');
  }

  await Response.updateOne({ _id: response._id }, { $set: { isFirst: true } });

  const lock = lockOut(won, player.pid);
  sockets.questionLocked(won._id, {
    selectedAnswer: lock.selectedAnswer,
    responderId: lock.responderId,
    responderName: lock.responderName,
    isCorrect: true,
    correctAnswer: lock.correctAnswer,
    lockedBy: 'player',
    answeredAt,
  });
  sockets.gamesChanged('locked', won._id);
  return { mode: 'firstCorrect', won: true, lock };
}

/** Normal voting / quiz: everybody may answer, once per player (unless multiple attempts are allowed). */
async function submitNormal(game, player, optionIndex) {
  const settings = settingsOf(game);
  const isCorrect = game.correctAnswer == null ? null : optionIndex === game.correctAnswer;
  const attemptNo = settings.allowMultipleAttempts
    ? await Response.countDocuments({ gameId: game._id, anonymousPlayerId: player.pid })
    : 0;

  let created;
  try {
    created = await Response.create({
      gameId: game._id,
      anonymousPlayerId: player.pid,
      playerName: player.name,
      selectedAnswer: optionIndex,
      isCorrect,
      kind: game.contentType === 'poll' ? 'vote' : 'answer',
      attemptNo,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await latestResponseOf(game._id, player.pid);
      throw ApiError.conflict('ALREADY_RESPONDED', 'You have already answered this one.', {
        myResponse: myResponseOut(game, existing),
      });
    }
    throw error;
  }

  await Game.updateOne({ _id: game._id }, { $inc: { responseCount: 1 } });
  sockets.pollUpdated(game._id, () => pollPayload(game._id));

  const response = created.toObject();
  const results = settings.showResults ? await buildResults(game).catch(() => null) : null;
  return { mode: 'normal', won: null, myResponse: myResponseOut(game, response), results };
}

async function submitAnswer(gameId, player, optionIndex) {
  const game = await findGameOrThrow(gameId);
  assertPlayable(game, optionIndex);
  if (game.interactionMode === 'buzzer') return submitBuzzer(game, player, optionIndex);
  if (game.interactionMode === 'firstCorrect') return submitFirstCorrect(game, player, optionIndex);
  return submitNormal(game, player, optionIndex);
}

/* -------------------------------------------------------------------------- */
/*  Admin controls                                                             */
/* -------------------------------------------------------------------------- */

const CLEAR_BUZZER_STATE = {
  $set: { answerStatus: 'open', responseCount: 0 },
  $unset: { firstResponder: '', selectedAnswer: '', answeredAt: '', isCorrect: '', lockedBy: '' },
};

/** Clears the first response + all answers for this game and re-opens it for everybody. */
async function resetGame(gameId) {
  const game = await Game.findByIdAndUpdate(gameId, CLEAR_BUZZER_STATE, { new: true, lean: true });
  if (!game) throw ApiError.notFound('Game not found');
  await Response.deleteMany({ gameId: game._id });
  sockets.questionReset(game._id);
  sockets.pollUpdated(game._id, () => pollPayload(game._id));
  sockets.gamesChanged('reset', game._id);
  return game;
}

/** Admin closes the question without anyone answering (atomic, same guard as a player click). */
async function lockGame(gameId) {
  const game = await Game.findOneAndUpdate(
    { _id: gameId, answerStatus: 'open', interactionMode: mongoose.trusted({ $in: RACE_MODES }) },
    { $set: { answerStatus: 'locked', lockedBy: 'admin' } },
    { new: true, lean: true }
  );
  if (!game) {
    const existing = await findGameOrThrow(gameId);
    if (!RACE_MODES.includes(existing.interactionMode)) throw ApiError.badRequest('Only buzzer / first-correct questions can be locked');
    throw ApiError.conflict('ALREADY_LOCKED', 'This question is already locked.');
  }
  const lock = lockOut(game, null);
  sockets.questionLocked(game._id, {
    selectedAnswer: null,
    responderId: null,
    responderName: null,
    isCorrect: null,
    correctAnswer: lock.correctAnswer,
    lockedBy: 'admin',
    answeredAt: null,
  });
  sockets.gamesChanged('locked', game._id);
  return game;
}

/** Makes sure a buzzer question starts fresh when it becomes the live question. */
async function prepareForLive(gameId) {
  const game = await findGameOrThrow(gameId);
  const raceQuestion = RACE_MODES.includes(game.interactionMode);
  // New live question = everybody gets a fresh chance (also clears leftover one-chance attempts).
  if (raceQuestion && (game.answerStatus === 'locked' || (game.interactionMode === 'firstCorrect' && game.responseCount > 0))) {
    return resetGame(gameId);
  }
  sockets.questionOpened(gameId);
  return game;
}

module.exports = {
  findGameOrThrow,
  findPublishedOrThrow,
  latestResponseOf,
  buildResults,
  pollPayload,
  submitAnswer,
  submitBuzzer,
  resetGame,
  lockGame,
  prepareForLive,
};
