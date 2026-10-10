import { MODE_META, TYPE_META } from '../utils/constants';

export function TypeChip({ type }) {
  const meta = TYPE_META[type] || { icon: '🎮', label: type };
  return (
    <span className="chip">
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
    </span>
  );
}

export function ModeChip({ mode }) {
  return <span className="chip chip-mode">{MODE_META[mode]?.label || mode}</span>;
}

/** Admin-facing status pills. */
export function StatusBadges({ game }) {
  return (
    <span className="badges">
      <span className={`badge ${game.published ? 'badge-green' : 'badge-grey'}`}>{game.published ? 'Published' : 'Draft'}</span>
      {game.isLive && <span className="badge badge-live">● Live</span>}
      {(game.interactionMode === 'buzzer' || game.interactionMode === 'firstCorrect') && game.answerStatus === 'locked' && <span className="badge badge-amber">🔒 Locked</span>}
      {game.windowState === 'upcoming' && <span className="badge badge-blue">Scheduled</span>}
      {game.windowState === 'ended' && <span className="badge badge-grey">Ended</span>}
    </span>
  );
}
