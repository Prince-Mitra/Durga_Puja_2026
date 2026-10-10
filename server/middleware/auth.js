const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../services/playerService');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readAdminToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[config.cookie.name] || null;
}

/** Admin gate. Verifies the JWT AND that the admin still exists. Applied to every /api/admin/* data route. */
const requireAdmin = asyncHandler(async (req, res, next) => {
  const token = readAdminToken(req);
  if (!token) throw ApiError.unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { issuer: 'party-play-admin' });
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.', 'SESSION_EXPIRED');
  }
  const admin = await Admin.findById(payload.sub).lean();
  if (!admin) throw ApiError.unauthorized('Session expired. Please log in again.', 'SESSION_EXPIRED');
  req.admin = { id: String(admin._id), username: admin.username, email: admin.email };
  next();
});

/**
 * CSRF defence for cookie auth: browsers cannot add custom headers to cross-site form posts, and a cross-site
 * fetch with a custom header triggers a CORS preflight that our allow-list rejects.
 * Our axios client always sends X-Requested-With.
 */
function requireCustomHeader(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }
  return next(ApiError.forbidden('Missing X-Requested-With header', 'CSRF_BLOCKED'));
}

/** Public routes: requires a valid server-signed anonymous player token (X-Player-Token). */
function requirePlayer(req, res, next) {
  const player = verifyToken(req.headers['x-player-token']);
  if (!player) return next(ApiError.unauthorized('Player session missing or expired', 'INVALID_PLAYER_TOKEN'));
  req.player = player;
  return next();
}

/** Same, but anonymous requests are allowed (used to personalise GET responses). */
function optionalPlayer(req, res, next) {
  req.player = verifyToken(req.headers['x-player-token']);
  next();
}

module.exports = { requireAdmin, requireCustomHeader, requirePlayer, optionalPlayer };
