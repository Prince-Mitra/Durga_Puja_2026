const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 40 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    // select:false -> the hash is never loaded unless explicitly requested.
    password: { type: String, required: true, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  return next();
});

adminSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

// Used to burn the same CPU time when the username does not exist (prevents user enumeration by timing).
adminSchema.statics.DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

module.exports = mongoose.model('Admin', adminSchema);
