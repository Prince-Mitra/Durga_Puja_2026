import { LETTERS } from '../utils/constants';

/**
 * Status strip for race-style questions.
 *  buzzer       - first click wins, right or wrong
 *  firstCorrect - one chance each, a wrong answer does not stop the game, first CORRECT answer wins
 */
export default function LockBanner({ game, connected }) {
  const { lock, options, interactionMode } = game;
  const mine = game.myResponse;
  const firstCorrect = interactionMode === 'firstCorrect';
  const correctText = lock?.correctAnswer != null ? `${LETTERS[lock.correctAnswer]}. ${options[lock.correctAnswer]}` : null;

  /* ------------------------------ still open ------------------------------ */
  if (game.answerStatus !== 'locked') {
    if (firstCorrect && mine) {
      return (
        <div className="banner banner-wrong" role="status" aria-live="polite">
          <span className="banner-emoji" aria-hidden="true">❌</span>
          <div>
            <strong>Wrong answer - your chance is used</strong>
            <span>The game is still on. Waiting for someone to get it right...</span>
            {!connected && <span className="banner-warn">Reconnecting to live updates...</span>}
          </div>
        </div>
      );
    }
    return (
      <div className="banner banner-open" role="status" aria-live="polite">
        <span className="live-dot" aria-hidden="true" />
        <div>
          <strong>{firstCorrect ? 'Game on!' : 'Waiting for answers...'}</strong>
          <span>{firstCorrect ? 'One chance each - the first correct answer wins.' : 'First click wins - be quick!'}</span>
          {!connected && <span className="banner-warn">Reconnecting to live updates...</span>}
        </div>
      </div>
    );
  }

  /* ------------------------------ locked by host ------------------------------ */
  if (lock?.lockedBy === 'admin') {
    return (
      <div className="banner banner-locked" role="status" aria-live="assertive">
        <span className="banner-emoji" aria-hidden="true">🔒</span>
        <div>
          <strong>Question locked</strong>
          <span>The host closed this question.</span>
          {correctText && <span>Correct answer: <b>{correctText}</b></span>}
        </div>
      </div>
    );
  }

  /* ------------------------------ first-correct: decided ------------------------------ */
  if (firstCorrect) {
    if (lock?.isMe) {
      return (
        <div className="banner banner-correct pop" role="status" aria-live="assertive">
          <span className="banner-emoji" aria-hidden="true">🎉</span>
          <div>
            <strong>You got it first!</strong>
            <span>Correct answer: <b>{correctText || `${LETTERS[lock.selectedAnswer]}. ${options[lock.selectedAnswer]}`}</b></span>
          </div>
        </div>
      );
    }
    return (
      <div className="banner banner-locked" role="status" aria-live="assertive">
        <span className="banner-emoji" aria-hidden="true">🏆</span>
        <div>
          <strong>{lock?.responderName || 'Someone'} got it right!</strong>
          <span>Correct answer: <b>{correctText || `${LETTERS[lock.selectedAnswer]}. ${options[lock.selectedAnswer]}`}</b></span>
          {mine?.isCorrect === false && <span>Your answer was wrong - better luck next question.</span>}
          {!mine && <span>You were too slow this time.</span>}
          <span className="banner-sub">Get ready - the next question is coming.</span>
        </div>
      </div>
    );
  }

  /* ------------------------------ buzzer: decided ------------------------------ */
  if (lock?.isMe) {
    const tone = lock.isCorrect === false ? 'banner-wrong' : lock.isCorrect ? 'banner-correct' : 'banner-locked';
    return (
      <div className={`banner ${tone}`} role="status" aria-live="assertive">
        <span className="banner-emoji" aria-hidden="true">{lock.isCorrect === false ? '❌' : lock.isCorrect ? '🎉' : '⚡'}</span>
        <div>
          <strong>{lock.isCorrect === false ? 'Not quite!' : lock.isCorrect ? 'You got it!' : 'You answered first!'}</strong>
          <span>{lock.isCorrect === false ? 'You were first, but that was the wrong answer.' : 'You were the fastest finger.'}</span>
          {lock.isCorrect === false && correctText && <span>The correct answer was <b>{correctText}</b></span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`banner ${lock?.isCorrect ? 'banner-correct' : 'banner-locked'}`} role="status" aria-live="assertive">
      <span className="banner-emoji" aria-hidden="true">🔒</span>
      <div>
        <strong>Answer already taken!</strong>
        <span><b>{lock?.responderName || 'Someone'}</b> answered first.</span>
        {lock?.isCorrect === true && <span>🎉 They got it right.</span>}
        {lock?.isCorrect === false && <span>❌ Wrong answer.{correctText && <> Correct: <b>{correctText}</b></>}</span>}
        {lock?.isCorrect == null && <span>Waiting for the result...</span>}
        <span className="banner-sub">Get ready - the next question is coming.</span>
      </div>
    </div>
  );
}
