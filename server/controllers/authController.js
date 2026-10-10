const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { loginSchema } = require('../validators/authValidators');

const cookieOptions = () => ({
  httpOnly: true, // JavaScript can never read the token -> XSS cannot steal the session
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/',
});

const login = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const identifier = (body.identifier || body.username || body.email).toLowerCase();

  const admin = await Admin.findOne({ $or: [{ username: identifier }, { email: identifier }] }).select('+password');
  // Always run bcrypt, even for unknown users, so response time does not reveal which usernames exist.
  const valid = await (admin ? admin.comparePassword(body.password) : require('bcryptjs').compare(body.password, Admin.DUMMY_HASH));
  if (!admin || !valid) throw ApiError.unauthorized('Invalid username or password', 'INVALID_CREDENTIALS');

  const token = jwt.sign({ sub: String(admin._id) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: 'party-play-admin',
  });
  res.cookie(config.cookie.name, token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ admin: { id: String(admin._id), username: admin.username, email: admin.email } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(config.cookie.name, cookieOptions());
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = { login, logout, me };
