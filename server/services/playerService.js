const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { cleanName, newId } = require('../utils/text');

const TOKEN_LIFETIME = '90d';

/**
 * Anonymous player identity.
 * The SERVER generates the player id and signs it, so a client cannot invent or edit an id.
 * (It can still throw its token away and ask for a new one - see README "Known limits".)
 */
const defaultName = (pid) => `Player-${pid.slice(0, 4).toUpperCase()}`;

function signToken(pid, name) {
  return jwt.sign({ pid, name }, config.playerTokenSecret, { expiresIn: TOKEN_LIFETIME, issuer: 'party-play' });
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, config.playerTokenSecret, { issuer: 'party-play' });
    if (typeof payload.pid !== 'string' || !payload.pid) return null;
    return { pid: payload.pid, name: cleanName(payload.name, defaultName(payload.pid)) };
  } catch {
    return null;
  }
}

/** Reuses the identity inside a valid token, otherwise mints a new one. Optionally renames. */
function createOrRefreshSession({ token, nickname }) {
  const existing = verifyToken(token);
  const pid = existing ? existing.pid : newId();
  const name = cleanName(nickname ?? existing?.name, defaultName(pid));
  return { token: signToken(pid, name), player: { id: pid, name } };
}

module.exports = { verifyToken, createOrRefreshSession };
