const mongoose = require('mongoose');

// Singleton document (key: 'main') remembering which game is the current "live question".
const liveStateSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    currentGameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveState', liveStateSchema);
