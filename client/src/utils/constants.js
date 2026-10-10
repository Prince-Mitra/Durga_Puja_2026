export const RACE_MODES = ['buzzer', 'firstCorrect'];
export const LETTERS = 'ABCDEFGH';
export const MAX_OPTIONS = 8;

// Socket.IO events (mirror server/utils/constants.js)
export const EVENTS = {
  GAMES_CHANGED: 'games:changed',
  LIVE_CHANGED: 'live:changed',
  QUESTION_OPENED: 'question:opened',
  QUESTION_LOCKED: 'question:locked',
  QUESTION_RESET: 'question:reset',
  POLL_UPDATED: 'poll:updated',
};

export const TYPE_META = {
  image: { icon: '🖼️', label: 'Image' },
  video: { icon: '🎬', label: 'Video' },
  audio: { icon: '🎵', label: 'Audio' },
  quiz: { icon: '❓', label: 'Quiz' },
  poll: { icon: '🗳️', label: 'Poll' },
};

export const MODE_META = {
  none: { label: 'View only', hint: 'No answer buttons - players just view, watch or listen.' },
  normal: { label: 'Normal voting', hint: 'Everyone can answer once.' },
  firstCorrect: { label: 'First correct wins', hint: 'Everyone gets ONE chance. A wrong answer does not stop the game - the question locks the moment someone answers correctly.' },
  buzzer: { label: 'First click / Buzzer', hint: 'Only the first player to click is recorded, then the question locks for everyone.' },
};

/** Choices on the admin "Create" screen. */
export const PRESETS = [
  { id: 'image-only', icon: '🖼️', label: 'Image Only', contentType: 'image', modes: ['none'], mode: 'none' },
  { id: 'video-only', icon: '🎬', label: 'Video Only', contentType: 'video', modes: ['none'], mode: 'none' },
  { id: 'audio-only', icon: '🎵', label: 'Audio Only', contentType: 'audio', modes: ['none'], mode: 'none' },
  { id: 'image-question', icon: '🖼️', label: 'Image + Question', contentType: 'image', modes: ['firstCorrect', 'buzzer', 'normal'], mode: 'firstCorrect' },
  { id: 'video-question', icon: '🎬', label: 'Video + Question', contentType: 'video', modes: ['firstCorrect', 'buzzer', 'normal'], mode: 'firstCorrect' },
  { id: 'audio-question', icon: '🎵', label: 'Audio + Question', contentType: 'audio', modes: ['firstCorrect', 'buzzer', 'normal'], mode: 'firstCorrect' },
  { id: 'quiz', icon: '❓', label: 'Quiz', contentType: 'quiz', modes: ['firstCorrect', 'normal', 'buzzer'], mode: 'firstCorrect' },
  { id: 'poll', icon: '🗳️', label: 'Poll', contentType: 'poll', modes: ['normal'], mode: 'normal' },
];

// Client-side upload checks (the server validates again - never trust the client alone).
export const MEDIA_RULES = {
  image: { exts: ['jpg', 'jpeg', 'png', 'webp', 'gif'], maxMb: 10 },
  video: { exts: ['mp4', 'webm', 'mov'], maxMb: 100 },
  audio: { exts: ['mp3', 'wav', 'm4a'], maxMb: 30 },
};
