import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useFetch } from '../../hooks/useFetch';
import { useSocketEvent } from '../../hooks/useSocket';
import { EVENTS } from '../../utils/constants';
import { formatDate } from '../../utils/format';
import StatCard from '../../components/StatCard';
import { StatusBadges, TypeChip } from '../../components/Badges';
import { EmptyState, ErrorState, Loading } from '../../components/States';

const ACTIONS = [
  { to: '/admin/create', icon: '➕', label: 'Create Game' },
  { to: '/admin/create?type=poll', icon: '🗳️', label: 'Create Poll' },
  { to: '/admin/create?type=image', icon: '⬆️', label: 'Upload Media' },
  { to: '/admin/games', icon: '📊', label: 'View Results' },
];

export default function Dashboard() {
  const { data, loading, error, reload, refresh } = useFetch(() => adminService.stats(), []);
  useSocketEvent(EVENTS.GAMES_CHANGED, () => refresh());

  if (loading) return <Loading label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { stats, recentGames } = data;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/admin/create" className="btn btn-primary">+ Create Game</Link>
      </div>

      <div className="stats-grid">
        <StatCard icon="🎮" label="Total Games" value={stats.totalGames} />
        <StatCard icon="🟢" label="Active Games" value={stats.activeGames} />
        <StatCard icon="🗳️" label="Total Votes" value={stats.totalVotes} />
        <StatCard icon="💬" label="Total Responses" value={stats.totalResponses} />
        <StatCard icon="🖼️" label="Media Files" value={stats.totalMedia} />
      </div>

      <h2 className="section-title">Quick actions</h2>
      <div className="actions-grid">
        {ACTIONS.map((a) => (
          <Link key={a.label} to={a.to} className="action-tile">
            <span aria-hidden="true">{a.icon}</span>
            {a.label}
          </Link>
        ))}
        <Link to="/admin/live" className="action-tile action-live"><span aria-hidden="true">🔴</span>Live Control</Link>
      </div>

      <h2 className="section-title">Recent games</h2>
      {recentGames.length === 0 ? (
        <EmptyState icon="🎮" title="No games yet" action={<Link to="/admin/create" className="btn btn-primary">Create your first game</Link>} />
      ) : (
        <div className="list">
          {recentGames.map((game) => (
            <Link key={game.id} to={`/admin/games/${game.id}/results`} className="list-row">
              <div>
                <strong>{game.title}</strong>
                <div className="row-meta"><TypeChip type={game.contentType} /> <span>{formatDate(game.createdAt)}</span></div>
              </div>
              <StatusBadges game={game} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
