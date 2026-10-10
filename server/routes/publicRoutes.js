const express = require('express');
const ctrl = require('../controllers/publicGameController');
const playerCtrl = require('../controllers/playerController');
const { requirePlayer, optionalPlayer } = require('../middleware/auth');
const { sessionLimiter, answerLimiter } = require('../middleware/rateLimits');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
router.param('id', validateObjectId);

router.post('/player/session', sessionLimiter, playerCtrl.createSession);

router.get('/games', ctrl.listGames);
router.get('/games/live', optionalPlayer, ctrl.getLiveGame); // must be declared before /games/:id
router.get('/games/:id', optionalPlayer, ctrl.getGame);
router.get('/games/:id/results', ctrl.getResults);

// One handler, three names: /answer (buzzer + quiz), /respond and /vote (poll) - all behave identically.
const answer = [requirePlayer, answerLimiter, ctrl.answerGame];
router.post('/games/:id/answer', ...answer);
router.post('/games/:id/respond', ...answer);
router.post('/games/:id/vote', ...answer);

router.get('/results', ctrl.listPublicResults);

module.exports = router;
