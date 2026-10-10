import { Link } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { useFetch } from '../hooks/useFetch';
import { useSocketEvent } from '../hooks/useSocket';
import { EVENTS } from '../utils/constants';
import GameCard from '../components/GameCard';
import { EmptyState, ErrorState, Loading } from '../components/States';

export default function Home() {
  const games = useFetch(() => gameService.list(), []);
  const live = useFetch(() => gameService.live().catch(() => null), []);

  // New game published / live question changed -> update the list without a refresh.
  useSocketEvent(EVENTS.GAMES_CHANGED, () => {
    games.refresh();
    live.refresh();
  });
  useSocketEvent(EVENTS.LIVE_CHANGED, () => live.refresh());

  return (
    <>
      <section className="hero">
        <h1>🎮 PARTY PLAY</h1>
        <p>Choose a game and start playing!</p>
      </section>

      {live.data && (
        <Link to="/live" className="live-banner">
          <span className="live-dot" aria-hidden="true" />
          <div>
            <strong>LIVE NOW</strong>
            <span>{live.data.title}</span>
          </div>
          <b>JOIN →</b>
        </Link>
      )}

      {games.loading && <Loading label="Loading games..." />}
      {games.error && <ErrorState message={games.error} onRetry={games.reload} />}
      {!games.loading && !games.error && games.data?.length === 0 && (
        <EmptyState icon="🎮" title="No games available right now.">Check back soon!</EmptyState>
      )}
      {games.data?.length > 0 && (
        <div className="grid">
          {games.data.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </>
  );
}
