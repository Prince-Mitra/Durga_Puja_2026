/**
 * Buzzer race-condition test.   Usage: npm run test:race      (needs a reachable MongoDB)
 *
 * Fires N simultaneous "clicks" from N different players at ONE open question and checks that
 * exactly one wins, exactly one response is stored, and everyone else gets QUESTION_ALREADY_ANSWERED.
 * Then it simulates "Next question" (reset) and checks everybody can answer again.
 *
 * Uses a separate database (<MONGO_URI db>-race-test) which is dropped at the end.
 */
const assert = require('assert');
const mongoose = require('mongoose');
const config = require('../config/env');
const connectDB = require('../config/db');
const Game = require('../models/Game');
const Response = require('../models/Response');
const gameService = require('../services/gameService');

const PLAYERS = 50;
const ROUNDS = 5;

const testUri = () => {
  const url = new URL(config.mongoUri);
  url.pathname = `${url.pathname.replace(/\/$/, '') || '/party-game'}-race-test`;
  return url.toString();
};

const player = (n) => ({ pid: `player-${n}`, name: `Player ${n}` });

async function fireRound(game, label) {
  const results = await Promise.allSettled(
    Array.from({ length: PLAYERS }, (_, n) => gameService.submitAnswer(game._id, player(n), n % 4))
  );
  const winners = results.filter((r) => r.status === 'fulfilled');
  const losers = results.filter((r) => r.status === 'rejected');

  assert.strictEqual(winners.length, 1, `${label}: expected exactly 1 winner, got ${winners.length}`);
  assert.ok(
    losers.every((r) => r.reason.code === 'QUESTION_ALREADY_ANSWERED'),
    `${label}: every loser must get QUESTION_ALREADY_ANSWERED`
  );

  const stored = await Game.findById(game._id).lean();
  const responses = await Response.countDocuments({ gameId: game._id });
  assert.strictEqual(stored.answerStatus, 'locked', `${label}: game must be locked`);
  assert.strictEqual(responses, 1, `${label}: exactly 1 response may be stored, found ${responses}`);
  assert.strictEqual(stored.firstResponder.playerId, winners[0].value.lock.responderId, `${label}: stored winner mismatch`);
  console.log(`  ✓ ${label}: winner = ${stored.firstResponder.name}, ${losers.length} rejected`);
}

(async () => {
  await connectDB(testUri());
  await Promise.all([Game.init(), Response.init()]); // make sure unique indexes exist
  try {
    const game = await Game.create({
      title: 'Race test',
      contentType: 'quiz',
      interactionMode: 'buzzer',
      question: 'Who is this?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 2,
      published: true,
    });

    console.log(`Buzzer race: ${PLAYERS} simultaneous players x ${ROUNDS} rounds`);
    for (let round = 1; round <= ROUNDS; round += 1) {
      await fireRound(game, `round ${round}`);
      await gameService.resetGame(game._id); // what "Next question"/"Reset" does for a buzzer question
    }

    // ---- First-correct-wins: one chance each, wrong answers do not lock ----
    console.log('\nFirst-correct race: one chance per player');
    const fc = await Game.create({
      title: 'First correct test', contentType: 'quiz', interactionMode: 'firstCorrect',
      question: 'Q?', options: ['A', 'B', 'C', 'D'], correctAnswer: 2, published: true,
    });
    const first = await gameService.submitAnswer(fc._id, player(100), 0); // wrong
    assert.strictEqual(first.won, false);
    assert.strictEqual((await Game.findById(fc._id).lean()).answerStatus, 'open', 'a wrong answer must NOT lock');
    await assert.rejects(gameService.submitAnswer(fc._id, player(100), 2), (e) => e.code === 'ALREADY_RESPONDED');
    console.log('  ✓ wrong answer keeps the game open; same player cannot try again');

    const raced = await Promise.allSettled(
      Array.from({ length: PLAYERS }, (_, n) => gameService.submitAnswer(fc._id, player(n), n % 4))
    );
    const wins = raced.filter((r) => r.status === 'fulfilled' && r.value.won === true);
    const wrongs = raced.filter((r) => r.status === 'fulfilled' && r.value.won === false);
    const late = raced.filter((r) => r.status === 'rejected');
    assert.strictEqual(wins.length, 1, `expected exactly 1 winner, got ${wins.length}`);
    assert.ok(late.every((r) => r.reason.code === 'QUESTION_ALREADY_ANSWERED' || r.reason.code === 'ALREADY_RESPONDED'));
    const lockedFc = await Game.findById(fc._id).lean();
    assert.strictEqual(lockedFc.answerStatus, 'locked');
    assert.strictEqual(lockedFc.selectedAnswer, 2);
    const perPlayer = await Response.aggregate([{ $match: { gameId: fc._id } }, { $group: { _id: '$anonymousPlayerId', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]);
    assert.strictEqual(perPlayer.length, 0, 'no player may have more than one response');
    console.log(`  ✓ 1 winner, ${wrongs.length} wrong answers recorded, ${late.length} rejected, nobody answered twice`);
    await assert.rejects(gameService.submitAnswer(fc._id, player(7), 2), (e) => e.code === 'QUESTION_ALREADY_ANSWERED');
    await gameService.resetGame(fc._id);
    await gameService.submitAnswer(fc._id, player(100), 1); // fresh chance after reset
    console.log('  ✓ after Reset / Next question everybody has a new chance');

    // Admin lock must beat late clicks too.
    await gameService.lockGame(game._id);
    await assert.rejects(gameService.submitAnswer(game._id, player(1), 0), (e) => e.code === 'QUESTION_ALREADY_ANSWERED');
    console.log('  ✓ admin lock rejects late clicks');

    console.log('\nAll buzzer race tests passed.');
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
})().catch((error) => {
  console.error('\nRACE TEST FAILED:', error.message);
  process.exit(1);
});
