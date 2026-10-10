import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useGameSocket } from '../../hooks/useSocket';
import { EVENTS, LETTERS } from '../../utils/constants';
import { formatDate } from '../../utils/format';
import ResultBars from '../../components/ResultBars';
import Doughnut from '../../components/Doughnut';
import ConfirmDialog from '../../components/ConfirmDialog';
import { StatusBadges, TypeChip } from '../../components/Badges';
import { ErrorState, Loading } from '../../components/States';

export default function GameResults() {
  const { id } = useParams();
  const { data, loading, error, reload, refresh } = useFetch(() => adminService.results(id), [id]);
  const [confirmReset, setConfirmReset] = useState(false);

  // Live updates while people answer.
  useGameSocket(id, {
    [EVENTS.POLL_UPDATED]: () => refresh(),
    [EVENTS.QUESTION_LOCKED]: () => refresh(),
    [EVENTS.QUESTION_RESET]: () => refresh(),
  });

  if (loading) return <Loading label="Loading results..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { game, results } = data;

  const doReset = async () => {
    try {
      await adminService.resetGame(id);
      toast.success('Results reset');
      setConfirmReset(false);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <Link to="/admin/games" className="back-link">← All games</Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">{game.title}</h1>
          <div className="row-meta"><TypeChip type={game.contentType} /> <StatusBadges game={game} /></div>
        </div>
        <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmReset(true)}>🔄 Reset results</button>
      </div>

      {game.question && <p className="lead">❓ {game.question}</p>}

      <div className="stats-grid stats-compact">
        <div className="stat-card"><span className="stat-label">Total responses</span><span className="stat-value">{results.totalResponses}</span></div>
        <div className="stat-card"><span className="stat-label">Players</span><span className="stat-value">{results.totalPlayers}</span></div>
        {results.stats && (
          <>
            <div className="stat-card"><span className="stat-label">Correct</span><span className="stat-value text-green">{results.stats.correct}</span></div>
            <div className="stat-card"><span className="stat-label">Incorrect</span><span className="stat-value text-red">{results.stats.incorrect}</span></div>
          </>
        )}
      </div>

      {results.buzzer && (
        <section className="card">
          <h2>{game.interactionMode === 'firstCorrect' ? '🎯 First-correct status' : '⚡ Buzzer status'}</h2>
          {game.answerStatus === 'open' ? (
            <p>🟢 Open - {game.interactionMode === 'firstCorrect' ? `${results.totalResponses} wrong attempt(s), nobody correct yet.` : 'nobody has answered yet.'}</p>
          ) : game.lockedBy === 'admin' ? (
            <p>🔒 Locked by the host.</p>
          ) : (
            <p>
              {game.interactionMode === 'firstCorrect' ? '🏆' : '🔒'} <b>{game.firstResponder?.name}</b> {game.interactionMode === 'firstCorrect' ? 'got it right first with' : 'answered first with'} <b>{LETTERS[game.selectedAnswer]}. {game.options[game.selectedAnswer]}</b>
              {game.isCorrect === true && ' - ✅ correct'}
              {game.isCorrect === false && ' - ❌ wrong'}
              <span className="hint"> · {formatDate(game.answeredAt)}</span>
            </p>
          )}
        </section>
      )}

      {results.options.length > 0 && (
        <div className="two-col">
          <section className="card">
            <h2>Votes per option</h2>
            <ResultBars options={results.options} total={results.totalResponses} correct={results.correctAnswer} />
          </section>
          {results.stats && (
            <section className="card center">
              <h2>Accuracy</h2>
              <Doughnut
                data={[
                  { label: 'Correct', value: results.stats.correct, color: 'var(--green)' },
                  { label: 'Incorrect', value: results.stats.incorrect, color: 'var(--red)' },
                ]}
                centerValue={`${results.stats.accuracy}%`}
                centerLabel="accuracy"
              />
            </section>
          )}
        </div>
      )}

      <section className="card">
        <h2>Player responses {results.responses.length >= 200 && <small>(latest 200)</small>}</h2>
        {results.responses.length === 0 ? (
          <p className="hint">No responses yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Player</th><th>Answer</th><th>Result</th><th>Time</th></tr>
              </thead>
              <tbody>
                {results.responses.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Player">{r.playerName} {r.isFirst && <span className="badge badge-amber">First</span>}</td>
                    <td data-label="Answer">{LETTERS[r.selectedAnswer]}. {r.selectedText}</td>
                    <td data-label="Result">{r.isCorrect === null ? '-' : r.isCorrect ? '✅ Correct' : '❌ Wrong'}</td>
                    <td data-label="Time">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset this question?"
          message="The current first response and all answers will be removed, and the question re-opens for everybody."
          confirmLabel="Reset"
          danger
          onConfirm={doReset}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </>
  );
}
