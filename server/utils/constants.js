const CONTENT_TYPES = ['image', 'video', 'audio', 'quiz', 'poll'];
const INTERACTION_MODES = ['none', 'normal', 'buzzer', 'firstCorrect'];
const MAX_OPTIONS = 8;
const LETTERS = 'ABCDEFGH';

// Socket.IO event names (mirrored in client/src/utils/constants.js)
const EVENTS = Object.freeze({
  GAMES_CHANGED: 'games:changed',
  LIVE_CHANGED: 'live:changed',
  QUESTION_OPENED: 'question:opened',
  QUESTION_LOCKED: 'question:locked',
  QUESTION_RESET: 'question:reset',
  POLL_UPDATED: 'poll:updated',
});

module.exports = { CONTENT_TYPES, INTERACTION_MODES, MAX_OPTIONS, LETTERS, EVENTS };
