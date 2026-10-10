const mongoose = require('mongoose');

const { Schema } = mongoose;

const responseSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    anonymousPlayerId: { type: String, required: true },
    playerName: { type: String, default: 'Player' },
    selectedAnswer: { type: Number, required: true }, // option index
    isCorrect: { type: Boolean, default: null }, // null when the game has no correct answer (polls)
    kind: { type: String, enum: ['vote', 'answer'], default: 'answer' },
    isFirst: { type: Boolean, default: false }, // true for the buzzer winner
    attemptNo: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Server-side duplicate protection: one response per (game, player, attempt).
responseSchema.index({ gameId: 1, anonymousPlayerId: 1, attemptNo: 1 }, { unique: true });
// Fast vote counting per option.
responseSchema.index({ gameId: 1, selectedAnswer: 1 });
responseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Response', responseSchema);
