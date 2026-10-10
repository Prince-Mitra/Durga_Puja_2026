import { gameService } from '../services/gameService';
import { useFetch } from '../hooks/useFetch';
import { useSocketEvent } from '../hooks/useSocket';
import { EVENTS } from '../utils/constants';
import GamePlayer from '../components/GamePlayer';
import { EmptyState, ErrorState, Loading } from '../components/States';

/**
 * The "projector link": always shows whatever question the admin made live.
 * When the admin presses NEXT QUESTION, every open Live page switches without a refresh
 * and everybody gets a fresh chance to answer.
 */
export default function Live() {
  const live = useFetch(() => gameService.live(), []);
  useSocketEvent(EVENTS.LIVE_CHANGED, () => live.refresh());
  useSocketEvent(EVENTS.GAMES_CHANGED, (p) => p.action === 'unpublished' || p.action === 'deleted' ? live.refresh() : null);

  if (live.loading) return <Loading label="Joining live game..." />;
  if (live.error) return <ErrorState message={live.error} onRetry={live.reload} />;
  if (!live.data) {
    return (
      <EmptyState icon="📡" title="Waiting for the host...">
        No live question right now. This page updates by itself the moment the host starts one.
      </EmptyState>
    );
  }
  return <GamePlayer key={live.data.id} gameId={live.data.id} />;
}
