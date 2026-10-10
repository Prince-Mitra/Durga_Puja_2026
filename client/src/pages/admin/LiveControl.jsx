import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSocketEvent } from '../../hooks/useSocket';
import { EVENTS, LETTERS } from '../../utils/constants';
import { StatusBadges, TypeChip } from '../../components/Badges';
import ConfirmDialog from '../../components/ConfirmDialog';
import QRModal from '../../components/QRModal';
import { ErrorState, Loading } from '../../components/States';

/** Host console for live games: start / lock / reset / next question. Updates in real time as players buzz in. */
export default function LiveControl() {
  const { data, loading, error, reload, refresh, setData } = useFetch(() => adminService.live(), []);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useSocketEvent(EVENTS.GAMES_CHANGED, () => refresh());
  useSocketEvent(EVENTS.LIVE_CHANGED, () => refresh());
  // Player buzzes land in the game room; the games:changed('locked') broadcast above covers the console.

  const run = async (action, success) => {
    setBusy(true);
    try {
      const snapshot = await action();
      if (snapshot?.queue) setData(snapshot);
      else refresh();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(getErrorMessage(err));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading live console..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { current, next, queue } = data;
  const isBuzzer = current?.interactionMode === 'buzzer' || current?.interactionMode === 'firstCorrect';
  const isFirstCorrect = current?.interactionMode === 'firstCorrect';
  const locked = current?.answerStatus === 'locked';

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Live control</h1>
        <button type="button" className="btn btn-ghost" onClick={() => setShowQr(true)}>📱 QR for /live</button>
      </div>

      <section className={`card live-console${locked ? ' is-locked' : ''}`}>
        <h2 className="eyebrow">CURRENT QUESTION</h2>
        {!current ? (
          <p className="hint">Nothing is live. Start one from the list below{queue.length ? ' or press Next.' : '.'}</p>
        ) : (
          <>
            <h3 className="live-title">{current.title}</h3>
            <div className="row-meta"><TypeChip type={current.contentType} /> <StatusBadges game={current} /></div>
            {current.question && <p className="lead">❓ {current.question}</p>}

            {isBuzzer && (
              <div className={`live-status ${locked ? 'is-locked' : 'is-open'}`} aria-live="polite">
                <span className="eyebrow">STATUS</span>
                <strong>{locked ? '🔒 LOCKED' : '🟢 OPEN'}</strong>
                {locked && current.lockedBy === 'player' && current.firstResponder && (
                  <dl>
                    <div><dt>{isFirstCorrect ? 'Winner' : 'First responder'}</dt><dd>{current.firstResponder.name}</dd></div>
                    <div><dt>Selected</dt><dd>{LETTERS[current.selectedAnswer]}. {current.options[current.selectedAnswer]}</dd></div>
                    <div>
                      <dt>Result</dt>
                      <dd className={current.isCorrect ? 'text-green' : 'text-red'}>
                        {current.isCorrect === null ? 'n/a' : current.isCorrect ? 'CORRECT' : 'WRONG'}
                      </dd>
                    </div>
                    {current.correctAnswer != null && <div><dt>Correct answer</dt><dd>{LETTERS[current.correctAnswer]}. {current.options[current.correctAnswer]}</dd></div>}
                  </dl>
                )}
                {locked && current.lockedBy === 'admin' && <span>Locked by you - nobody answered.</span>}
                {isFirstCorrect && !locked && <span>{current.responseCount} wrong {current.responseCount === 1 ? 'attempt' : 'attempts'} so far - waiting for a correct answer.</span>}
              </div>
            )}

            <div className="live-actions">
              {isBuzzer && (
                <button type="button" className="btn btn-ghost" disabled={busy || locked} onClick={() => run(() => adminService.lockGame(current.id), 'Question locked')}>
                  🔒 Lock
                </button>
              )}
              {(isBuzzer || current.responseCount > 0) && (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirmReset(true)}>
                  🔄 Reset
                </button>
              )}
              <Link className="btn btn-ghost" to={`/admin/games/${current.id}/results`}>📊 Results</Link>
            </div>
          </>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          disabled={busy || !queue.length}
          onClick={() => run(() => adminService.nextQuestion(), 'Next question is live ➡️')}
        >
          ➡️ Next Question{next ? `: ${next.title}` : ''}
        </button>
        {current && (
          <button type="button" className="btn btn-link" disabled={busy} onClick={() => run(() => adminService.clearLive(), 'Live cleared')}>
            End live session
          </button>
        )}
      </section>

      <h2 className="section-title">Running order</h2>
      <p className="hint">Published games, in the order they were created. Starting a buzzer question re-opens it for everyone.</p>
      {queue.length === 0 ? (
        <p className="hint">No published games yet. <Link to="/admin/games">Publish one</Link> to use it live.</p>
      ) : (
        <div className="list">
          {queue.map((game, index) => (
            <div className={`list-row${game.isLive ? ' is-current' : ''}`} key={game.id}>
              <div>
                <strong>{index + 1}. {game.title}</strong>
                <div className="row-meta"><TypeChip type={game.contentType} /> <StatusBadges game={game} /></div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy || game.isLive}
                onClick={() => run(() => adminService.setLive(game.id), 'Question is live')}
              >
                {game.isLive ? 'Live' : '▶ Start'}
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset this question?"
          message="The current first response will be removed and everyone can answer again."
          confirmLabel="Reset"
          danger
          onConfirm={async () => {
            await run(() => adminService.resetGame(current.id), 'Question reset');
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      {showQr && <QRModal path="/live" title="Join the live game" onClose={() => setShowQr(false)} />}
    </>
  );
}
