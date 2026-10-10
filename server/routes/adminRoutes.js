const express = require('express');
const authRoutes = require('./authRoutes');
const games = require('../controllers/adminGameController');
const live = require('../controllers/adminLiveController');
const { getStats } = require('../controllers/adminStatsController');
const { uploadMedia, deleteMedia } = require('../controllers/uploadController');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
router.param('id', validateObjectId);

// POST /api/admin/login | /logout, GET /api/admin/me   (same router is also mounted at /api/auth)
router.use(authRoutes);

// ---- Everything below requires a valid admin session ----
router.use(requireAdmin);

router.get('/stats', getStats);

router.post('/upload', upload, uploadMedia);
router.delete('/upload/:key', deleteMedia);

router.get('/games', games.listGames);
router.post('/games', games.createGame);
router.get('/games/:id', games.getGame);
router.put('/games/:id', games.updateGame);
router.delete('/games/:id', games.deleteGame);
router.patch('/games/:id/publish', games.setPublished);
router.get('/games/:id/results', games.getResults);
router.post('/games/:id/reset', games.resetGame);
router.post('/games/:id/lock', games.lockGame);
router.post('/games/:id/open', games.openGame);

router.get('/live', live.getLive);
router.post('/live/next', live.nextQuestion);
router.post('/live/set', live.setLive);
router.post('/live/clear', live.clearLive);

module.exports = router;
