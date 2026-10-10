const mongoose = require('mongoose');
const { CONTENT_TYPES, INTERACTION_MODES } = require('../utils/constants');

const { Schema } = mongoose;

/**
 * A "Game" is one playable card / question.
 *
 *  contentType      image | video | audio | quiz | poll        (what is shown)
 *  interactionMode  none | normal | buzzer                      (how people interact)
 *
 * question / options / correctAnswer are all OPTIONAL so media-only content is valid.
 * correctAnswer is the INDEX of the right option.
 *
 * Buzzer state lives on the document itself (answerStatus, firstResponder, ...). The first-click
 * race is decided by ONE atomic findOneAndUpdate({ answerStatus: 'open' }) - see services/gameService.js.
 */
const gameSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    contentType: { type: String, enum: CONTENT_TYPES, required: true },
    interactionMode: { type: String, enum: INTERACTION_MODES, default: 'none' },

    media: {
      key: { type: String, default: null }, // storage key; the URL is derived from it by the storage driver
      kind: { type: String, enum: ['image', 'video', 'audio', null], default: null },
      mimeType: { type: String, default: null },
      size: { type: Number, default: null },
      originalName: { type: String, default: null },
    },

    question: { type: String, trim: true, maxlength: 300, default: null },
    options: { type: [String], default: [] },
    correctAnswer: { type: Number, default: null },

    settings: {
      showResults: { type: Boolean, default: true },
      revealCorrectAnswer: { type: Boolean, default: true },
      allowMultipleAttempts: { type: Boolean, default: false },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
    },

    published: { type: Boolean, default: false },
    order: { type: Number, default: () => Date.now() }, // sequence used by "Next question"

    // ---- Buzzer / first-click state ----
    answerStatus: { type: String, enum: ['open', 'locked'], default: 'open' },
    lockedBy: { type: String, enum: ['player', 'admin', null], default: null },
    firstResponder: {
      playerId: { type: String, default: null },
      name: { type: String, default: null },
    },
    selectedAnswer: { type: Number, default: null },
    answeredAt: { type: Date, default: null },
    isCorrect: { type: Boolean, default: null },

    responseCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

gameSchema.index({ published: 1, order: 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ 'media.key': 1 }, { sparse: true });

module.exports = mongoose.model('Game', gameSchema);
