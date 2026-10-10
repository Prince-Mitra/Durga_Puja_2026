const storage = require('./storage');

/**
 * Serializers decide exactly what leaves the server.
 * Public output NEVER contains correctAnswer unless it has been legitimately revealed.
 * All functions expect lean() objects.
 */

const RACE_MODES = ['buzzer', 'firstCorrect'];
const id = (value) => (value ? String(value) : null);

function settingsOf(game) {
  const s = game.settings || {};
  return {
    showResults: s.showResults ?? true,
    revealCorrectAnswer: s.revealCorrectAnswer ?? true,
    allowMultipleAttempts: s.allowMultipleAttempts ?? false,
    startsAt: s.startsAt ?? null,
    endsAt: s.endsAt ?? null,
  };
}

/** upcoming | live | ended, based on the optional start/end window. */
function windowState(game, now = new Date()) {
  const { startsAt, endsAt } = settingsOf(game);
  if (startsAt && now < new Date(startsAt)) return 'upcoming';
  if (endsAt && now > new Date(endsAt)) return 'ended';
  return 'live';
}

function mediaOut(media, { admin = false } = {}) {
  if (!media || !media.key) return null;
  const out = { url: storage.getUrl(media.key), kind: media.kind, mimeType: media.mimeType, originalName: media.originalName };
  if (admin) Object.assign(out, { key: media.key, size: media.size });
  return out;
}

/** Lock details visible to players. Correct answer is only included once locked (and if the admin allows it). */
function lockOut(game, viewerId) {
  if (game.answerStatus !== 'locked') return null;
  const settings = settingsOf(game);
  const responderId = game.firstResponder?.playerId ?? null;
  return {
    lockedBy: game.lockedBy || (responderId ? 'player' : 'admin'),
    responderId,
    responderName: game.firstResponder?.name ?? null,
    isMe: Boolean(viewerId && responderId && viewerId === responderId),
    selectedAnswer: game.selectedAnswer ?? null,
    isCorrect: game.isCorrect ?? null,
    correctAnswer: settings.revealCorrectAnswer && game.correctAnswer != null ? game.correctAnswer : null,
    answeredAt: game.answeredAt ?? null,
  };
}

/** Result of a player's own normal-mode answer. */
function myResponseOut(game, response) {
  if (!response) return null;
  const settings = settingsOf(game);
  return {
    selectedAnswer: response.selectedAnswer,
    isCorrect: response.isCorrect ?? null,
    // In "first correct wins" the answer must stay secret while the question is still open.
    correctAnswer:
      settings.revealCorrectAnswer &&
      game.correctAnswer != null &&
      response.isCorrect !== null &&
      !(game.interactionMode === 'firstCorrect' && game.answerStatus !== 'locked')
        ? game.correctAnswer
        : null,
    createdAt: response.createdAt,
  };
}

function publicSummary(game) {
  const settings = settingsOf(game);
  const interactive = game.interactionMode !== 'none';
  return {
    id: id(game._id),
    title: game.title,
    description: game.description || '',
    contentType: game.contentType,
    interactionMode: game.interactionMode,
    media: mediaOut(game.media),
    hasQuestion: Boolean(game.question),
    answerStatus: game.answerStatus,
    windowState: windowState(game),
    // First-correct results would leak the answer by elimination, so they appear only once the question is locked.
    resultsVisible: interactive && settings.showResults && (game.interactionMode !== 'firstCorrect' || game.answerStatus === 'locked'),
    createdAt: game.createdAt,
  };
}

function publicGame(game, { viewerId = null, myResponse = null } = {}) {
  const settings = settingsOf(game);
  return {
    ...publicSummary(game),
    question: game.question || null,
    options: game.interactionMode === 'none' ? [] : game.options || [],
    settings: {
      showResults: settings.showResults,
      allowMultipleAttempts: settings.allowMultipleAttempts,
      startsAt: settings.startsAt,
      endsAt: settings.endsAt,
    },
    lock: RACE_MODES.includes(game.interactionMode) ? lockOut(game, viewerId) : null,
    myResponse: myResponseOut(game, myResponse),
  };
}

function adminGame(game, { liveId = null } = {}) {
  return {
    id: id(game._id),
    title: game.title,
    description: game.description || '',
    contentType: game.contentType,
    interactionMode: game.interactionMode,
    media: mediaOut(game.media, { admin: true }),
    question: game.question || null,
    options: game.options || [],
    correctAnswer: game.correctAnswer ?? null,
    settings: settingsOf(game),
    published: Boolean(game.published),
    windowState: windowState(game),
    order: game.order,
    answerStatus: game.answerStatus,
    lockedBy: game.lockedBy ?? null,
    firstResponder: game.firstResponder?.playerId
      ? { playerId: game.firstResponder.playerId, name: game.firstResponder.name }
      : null,
    selectedAnswer: game.selectedAnswer ?? null,
    answeredAt: game.answeredAt ?? null,
    isCorrect: game.isCorrect ?? null,
    responseCount: game.responseCount || 0,
    isLive: Boolean(liveId && id(game._id) === String(liveId)),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

module.exports = { settingsOf, windowState, mediaOut, lockOut, myResponseOut, publicSummary, publicGame, adminGame };
