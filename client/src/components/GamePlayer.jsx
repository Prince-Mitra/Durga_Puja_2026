import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gameService } from '../services/gameService';
import { getErrorCode, getErrorMessage } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useGameSocket, useSocketEvent } from '../hooks/useSocket';
import { usePlayer } from '../context/PlayerContext';
import { EVENTS, LETTERS, RACE_MODES } from '../utils/constants';
import { formatDate } from '../utils/format';
import MediaView from './MediaView';
import OptionButton from './OptionButton';
import ResultBars from './ResultBars';
import LockBanner from './LockBanner';
import ShareButton from './ShareButton';
import { TypeChip } from './Badges';
import { ErrorState, Loading } from './States';

/**
 * Plays one game. Used by /game/:id and by the /live page.
 *
 *  none    -> just the media
 *  normal  -> pick an option + SUBMIT (poll / quiz). Server enforces one answer per player.
 *  buzzer  -> tapping an option sends it IMMEDIATELY. The server decides who was first; everyone else is locked
 *             out in real time through Socket.IO (and also by the 409 response if their tap lost the race).
 *  firstCorrect -> tap = your ONE chance. Wrong answer: you are out for this question but the game goes on.
 *             The first correct answer locks the question for everyone.
 */
export default function GamePlayer({ gameId, showBack = false }) {
  const { player } = usePlayer();
  const { data: game, loading, error, reload, refresh, setData: setGame } = useFetch(() => gameService.get(gameId), [gameId]);

  const [selected, setSelected] = useState(null);
  const [pendingIndex, setPendingIndex] = useState(null); // buzzer tap in flight
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const clearLocal = useCallback(() => {
    setSelected(null);
    setPendingIndex(null);
    setResults(null);
    setRetrying(false);
  }, []);

  useEffect(clearLocal, [gameId, clearLocal]);

  /* ----------------------------- real-time ----------------------------- */
  const applyLock = useCallback(
    (payload) => {
      setGame((g) =>
        g && {
          ...g,
          answerStatus: 'locked',
          lock: {
            lockedBy: payload.lockedBy,
            responderId: payload.responderId,
            responderName: payload.responderName,
            isMe: Boolean(player && payload.responderId && payload.responderId === player.id),
            selectedAnswer: payload.selectedAnswer,
            isCorrect: payload.isCorrect,
            correctAnswer: payload.correctAnswer,
            answeredAt: payload.answeredAt,
          },
        }
      );
      setPendingIndex(null);
    },
    [player, setGame]
  );

  const connected = useGameSocket(gameId, {
    [EVENTS.QUESTION_LOCKED]: (payload) => payload.questionId === gameId && applyLock(payload),
    [EVENTS.QUESTION_RESET]: () => {
      clearLocal();
      refresh();
    },
    [EVENTS.QUESTION_OPENED]: () => {
      clearLocal();
      refresh();
    },
    [EVENTS.POLL_UPDATED]: (payload) => {
      if (payload.questionId === gameId && payload.options?.length) setResults(payload);
    },
  });

  useSocketEvent(EVENTS.GAMES_CHANGED, (payload) => {
    if (payload.gameId !== gameId) return;
    if (payload.action === 'deleted' || payload.action === 'unpublished') reload();
    else if (payload.action === 'updated') {
      clearLocal();
      refresh();
    }
  });

  // Phones sleep. When the tab wakes up, re-sync with the server instead of trusting stale state.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // Already answered earlier (page reload)? Show the results straight away.
  useEffect(() => {
    if (game?.myResponse && game.settings.showResults && game.interactionMode === 'normal' && !results) {
      gameService.results(gameId).then(setResults).catch(() => {});
    }
  }, [game?.myResponse, game?.settings?.showResults, game?.interactionMode, gameId, results]);

  /* ------------------------------ actions ------------------------------ */
  const race = async (index) => {
    if (pendingIndex !== null || game.answerStatus === 'locked') return;
    if (game.interactionMode === 'firstCorrect' && game.myResponse) return; // chance already used
    setSelected(index);
    setPendingIndex(index);
    try {
      const response = await gameService.answer(gameId, index);
      if (response.won === false) {
        // first-correct mode, wrong answer: the game stays open, but this player's chance is gone
        setGame((g) => ({ ...g, myResponse: response.myResponse }));
        toast('Wrong answer - you used your chance', { icon: '❌' });
      } else {
        setGame((g) => ({ ...g, answerStatus: 'locked', lock: response.lock }));
      }
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'QUESTION_ALREADY_ANSWERED' && err.response?.data?.lock) {
        setGame((g) => ({ ...g, answerStatus: 'locked', lock: err.response.data.lock }));
        toast(game.interactionMode === 'firstCorrect' ? 'Someone just got it right!' : 'Someone answered first!', { icon: '🔒' });
      } else if (code === 'ALREADY_RESPONDED') {
        setGame((g) => ({ ...g, myResponse: err.response.data.myResponse }));
        toast('You already used your chance on this question.', { icon: 'ℹ️' });
      } else {
        toast.error(getErrorMessage(err));
        if (code === 'QUESTION_NOT_OPEN') refresh();
      }
      setSelected(null);
    } finally {
      setPendingIndex(null);
    }
  };

  const submit = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    try {
      const response = await gameService.answer(gameId, selected);
      setGame((g) => ({ ...g, myResponse: response.myResponse }));
      if (response.results) setResults(response.results);
      setRetrying(false);
      toast.success(game.contentType === 'poll' ? 'Vote submitted' : 'Answer submitted');
    } catch (err) {
      if (getErrorCode(err) === 'ALREADY_RESPONDED') {
        setGame((g) => ({ ...g, myResponse: err.response.data.myResponse }));
        toast('You have already answered this one.', { icon: 'ℹ️' });
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------ render ------------------------------- */
  if (loading) return <Loading label="Loading game..." />;
  if (error || !game) return <ErrorState message={error || 'This game is not available.'} onRetry={reload} />;

  const isRace = RACE_MODES.includes(game.interactionMode);
  const isFirstCorrect = game.interactionMode === 'firstCorrect';
  const isNormal = game.interactionMode === 'normal';
  const locked = game.answerStatus === 'locked';
  const windowClosed = game.windowState !== 'live';
  const answered = isNormal && game.myResponse && !retrying;
  const mine = game.myResponse;

  const optionState = (i) => {
    if (windowClosed) return 'disabled';
    if (isRace) {
      const lock = game.lock;
      if (locked) {
        if (isFirstCorrect) {
          if (lock?.correctAnswer === i) return 'correct';
          if (lock && lock.correctAnswer == null && lock.selectedAnswer === i) return 'correct';
          if (mine?.isCorrect === false && mine.selectedAnswer === i) return 'wrong';
          return 'locked';
        }
        if (lock?.correctAnswer === i) return 'correct';
        if (lock?.selectedAnswer === i) return lock.isCorrect === false ? 'wrong' : lock.isCorrect ? 'correct' : 'picked';
        return 'locked';
      }
      // first-correct, chance already used: show my wrong pick, everything else is off
      if (isFirstCorrect && mine) return mine.selectedAnswer === i ? 'wrong' : 'disabled';
      if (pendingIndex === i) return 'pending';
      return pendingIndex !== null ? 'disabled' : 'idle';
    }
    if (answered) {
      if (mine.correctAnswer === i) return 'correct';
      if (mine.selectedAnswer === i) return mine.isCorrect === false ? 'wrong' : mine.isCorrect ? 'correct' : 'picked';
      return 'disabled';
    }
    return selected === i ? 'selected' : 'idle';
  };

  const correctText = mine?.correctAnswer != null ? `${LETTERS[mine.correctAnswer]}. ${game.options[mine.correctAnswer]}` : null;

  return (
    <article className="play">
      {showBack && (
        <Link to="/" className="back-link">← Back</Link>
      )}

      <header className="play-head">
        <TypeChip type={game.contentType} />
        <h1>{game.title}</h1>
        {game.description && <p className="lead">{game.description}</p>}
      </header>

      {game.windowState === 'upcoming' && (
        <div className="banner banner-locked" role="status"><span className="banner-emoji">⏳</span><div><strong>Not started yet</strong><span>Opens {formatDate(game.settings.startsAt)}</span></div></div>
      )}
      {game.windowState === 'ended' && (
        <div className="banner banner-locked" role="status"><span className="banner-emoji">🏁</span><div><strong>This game has ended</strong></div></div>
      )}

      <MediaView media={game.media} title={game.title} />

      {game.interactionMode !== 'none' && (
        <section className="play-question" aria-label="Question">
          {game.question && <h2 className="question">{game.question}</h2>}

          {isRace && !windowClosed && <LockBanner game={game} connected={connected} />}

          <div className="options" role="group" aria-label="Answer options">
            {game.options.map((text, i) => (
              <OptionButton
                key={i}
                index={i}
                text={text}
                state={optionState(i)}
                onClick={() => (isRace ? race(i) : setSelected(i))}
              />
            ))}
          </div>

          {isNormal && !answered && !windowClosed && (
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={selected === null || submitting}>
              {submitting ? 'Submitting...' : game.contentType === 'poll' ? 'VOTE' : 'SUBMIT'}
            </button>
          )}

          {answered && (
            <div className={`banner ${mine.isCorrect === true ? 'banner-correct' : mine.isCorrect === false ? 'banner-wrong' : 'banner-open'} pop`} role="status" aria-live="polite">
              <span className="banner-emoji" aria-hidden="true">{mine.isCorrect === true ? '🎉' : mine.isCorrect === false ? '❌' : '✅'}</span>
              <div>
                <strong>{mine.isCorrect === true ? 'Correct!' : mine.isCorrect === false ? 'Not quite!' : 'Vote submitted'}</strong>
                <span>
                  {mine.isCorrect === true && 'Great job!'}
                  {mine.isCorrect === false && (correctText ? <>The correct answer was <b>{correctText}</b></> : 'Better luck next time.')}
                  {mine.isCorrect === null && (game.settings.showResults ? 'Here is how everyone is voting.' : 'Thanks! The host will share the results.')}
                </span>
              </div>
            </div>
          )}

          {answered && game.settings.allowMultipleAttempts && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => { setRetrying(true); setSelected(null); }}>
              Try again
            </button>
          )}

          {isNormal && game.settings.showResults && results?.options?.length > 0 && answered && (
            <div className="card results-card">
              <h3>Live results</h3>
              <ResultBars
                options={results.options}
                total={results.totalResponses}
                highlight={mine?.selectedAnswer ?? null}
                correct={mine?.correctAnswer ?? null}
              />
            </div>
          )}
        </section>
      )}

      <footer className="play-foot">
        <ShareButton path={`/game/${game.id}`} title={game.title} />
      </footer>
    </article>
  );
}
