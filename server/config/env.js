const path = require('path');
const dotenv = require('dotenv');

// Root .env first (project layout), then server/.env as a fallback. dotenv never overrides existing vars.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serverRoot = path.resolve(__dirname, '..');
const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const required = ['MONGO_URI', 'JWT_SECRET', 'PLAYER_TOKEN_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
}
if (isProd) {
  const weak = ['JWT_SECRET', 'PLAYER_TOKEN_SECRET'].filter(
    (key) => process.env[key].startsWith('change_me') || process.env[key].length < 32
  );
  if (weak.length) {
    throw new Error(`Refusing to start in production with weak secrets: ${weak.join(', ')} (use 32+ random characters).`);
  }
}

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(sameSite)) {
  throw new Error('COOKIE_SAMESITE must be one of: lax, strict, none');
}

const config = Object.freeze({
  nodeEnv,
  isProd,
  port: toInt(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  playerTokenSecret: process.env.PLAYER_TOKEN_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  trustProxy: toInt(process.env.TRUST_PROXY, 0),
  cookie: {
    name: 'pp_admin',
    sameSite,
    // SameSite=None is only accepted by browsers together with Secure.
    secure: isProd || sameSite === 'none',
  },
  admin: {
    username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    email: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: path.resolve(serverRoot, process.env.UPLOAD_DIR || 'uploads'),
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  },
  limits: {
    imageBytes: toInt(process.env.MAX_IMAGE_MB, 10) * 1024 * 1024,
    audioBytes: toInt(process.env.MAX_AUDIO_MB, 30) * 1024 * 1024,
    videoBytes: toInt(process.env.MAX_VIDEO_MB, 100) * 1024 * 1024,
  },
  serverRoot,
});

module.exports = config;
