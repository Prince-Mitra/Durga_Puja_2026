import { Link } from 'react-router-dom';
import { TypeChip } from './Badges';
import { TYPE_META } from '../utils/constants';
import { assetUrl, playLabel } from '../utils/format';

export default function GameCard({ game }) {
  const thumb = game.media?.kind === 'image' ? assetUrl(game.media.url) : null;
  const icon = TYPE_META[game.contentType]?.icon || '🎮';
  const locked = (game.interactionMode === 'buzzer' || game.interactionMode === 'firstCorrect') && game.answerStatus === 'locked';

  return (
    <Link to={`/game/${game.id}`} className="game-card" aria-label={`${game.title} - ${playLabel(game)}`}>
      <div className={`game-card-thumb${thumb ? '' : ' no-image'}`}>
        {thumb ? <img src={thumb} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{icon}</span>}
        {locked && <span className="badge badge-amber game-card-flag">🔒 Answered</span>}
        {game.windowState === 'upcoming' && <span className="badge badge-blue game-card-flag">Starts soon</span>}
        {game.windowState === 'ended' && <span className="badge badge-grey game-card-flag">Ended</span>}
      </div>
      <div className="game-card-body">
        <TypeChip type={game.contentType} />
        <h3>{game.title}</h3>
        {game.description && <p>{game.description}</p>}
        <span className="game-card-cta">{playLabel(game)}</span>
      </div>
    </Link>
  );
}
