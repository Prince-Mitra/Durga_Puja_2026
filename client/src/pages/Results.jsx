import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { useFetch } from '../hooks/useFetch';
import { useSocketEvent } from '../hooks/useSocket';
import { EVENTS, LETTERS } from '../utils/constants';
import ResultBars from '../components/ResultBars';
import { TypeChip } from '../components/Badges';
import { EmptyState, ErrorState, Loading } from '../components/States';

/** Public results for every game whose results the admin allowed. Refreshes itself. */
export default function Results() {
  const { data, loading, error, reload, refresh } = useFetch(() => gameService.publicResults(), []);

  useEffect(() => {
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  useSocketEvent(EVENTS.GAMES_CHANGED, () => refresh());

  if (loading) return <Loading label="Loading results..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data.length) return <EmptyState icon="📊" title="No results yet.">Results appear here once games have answers.</EmptyState>;

  return (
    <>
      <h1 className="page-title">Results</h1>
      <div className="stack">
        {data.map(({ game, results }) => {
          const lock = results.buzzer?.lock;
          return (
            <section className="card" key={game.id}>
              <div className="card-head">
                <div>
                  <TypeChip type={game.contentType} />
                  <h2>{game.title}</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to={`/game/${game.id}`}>Open</Link>
              </div>
              {results.buzzer && (
                <p className="hint">
                  {lock?.lockedBy === 'player'
                    ? game.interactionMode === 'firstCorrect'
                      ? `🏆 ${lock.responderName} got it right first (${LETTERS[lock.selectedAnswer]})`
                      : `🔒 ${lock.responderName} answered first with ${LETTERS[lock.selectedAnswer]}${lock.isCorrect === true ? ' - correct 🎉' : lock.isCorrect === false ? ' - wrong ❌' : ''}`
                    : lock
                    ? '🔒 Locked by the host'
                    : '🟢 Open - nobody has answered yet'}
                </p>
              )}
              <ResultBars options={results.options} total={results.totalResponses} correct={lock?.correctAnswer ?? null} />
            </section>
          );
        })}
      </div>
    </>
  );
}
