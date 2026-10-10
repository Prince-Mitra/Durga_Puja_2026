const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../services/playerService');

const json = (code, message) => ({ error: { code, message } });

const base = { standardHeaders: true, legacyHeaders: false };

// General safety net. Generous because a whole party may share one wifi IP.
const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 600,
  message: json('RATE_LIMITED', 'Too many requests. Slow down a little.'),
});

// Brute-force protection for the admin password. Successful logins do not count.
const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: json('RATE_LIMITED', 'Too many login attempts. Try again in 15 minutes.'),
});

// Minting NEW anonymous identities is limited per IP (renewing a valid token is free).
// This is what makes "clear localStorage and vote again" expensive. 100/hour still fits a big party on one wifi.
const sessionLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 100,
  skip: (req) => Boolean(verifyToken(req.body?.token)),
  message: json('RATE_LIMITED', 'Too many new players from this network. Try again later.'),
});

// Per-PLAYER limit on answers (falls back to IP). Stops scripted spamming of the buzzer endpoint.
const answerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 40,
  keyGenerator: (req) => req.player?.pid || req.ip,
  message: json('RATE_LIMITED', 'You are clicking too fast.'),
});

module.exports = { apiLimiter, loginLimiter, sessionLimiter, answerLimiter };
