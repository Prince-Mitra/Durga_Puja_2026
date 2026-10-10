import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSocketEvent } from '../../hooks/useSocket';
import { EVENTS, TYPE_META } from '../../utils/constants';
import { assetUrl, formatDate } from '../../utils/format';
import { ModeChip, StatusBadges, TypeChip } from '../../components/Badges';
import ConfirmDialog from '../../components/ConfirmDialog';
import QRModal from '../../components/QRModal';
import { EmptyState, ErrorState, Loading } from '../../components/States';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
];

export default function ManageGames() {
  const [status, setStatus] = useState('');
  const { data, loading, error, reload, refresh } = useFetch(() => adminService.listGames(status ? { status } : undefined), [status]);
  const [toDelete, setToDelete] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useSocketEvent(EVENTS.GAMES_CHANGED, () => refresh());

  const togglePublish = async (game) => {
    setBusyId(game.id);
    try {
      await adminService.setPublished(game.id, !game.published);
      toast.success(game.published ? 'Game unpublished' : 'Game published 🎉');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await adminService.deleteGame(toDelete.id);
      toast.success('Game deleted successfully');
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Manage games</h1>
        <Link to="/admin/create" className="btn btn-primary">+ Create Game</Link>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter games">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={status === f.id} className={status === f.id ? 'is-active' : ''} onClick={() => setStatus(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading games..." />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data?.length === 0 && (
        <EmptyState icon="🗂️" title="Nothing here yet" action={<Link to="/admin/create" className="btn btn-primary">Create a game</Link>} />
      )}

      <div className="manage-list">
        {data?.map((game) => {
          const thumb = game.media?.kind === 'image' ? assetUrl(game.media.url) : null;
          return (
            <article className="manage-card" key={game.id}>
              <div className={`manage-thumb${thumb ? '' : ' no-image'}`}>
                {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span aria-hidden="true">{TYPE_META[game.contentType]?.icon}</span>}
              </div>
              <div className="manage-main">
                <h3>{game.title}</h3>
                <div className="row-meta">
                  <TypeChip type={game.contentType} />
                  <ModeChip mode={game.interactionMode} />
                </div>
                <StatusBadges game={game} />
                <div className="row-meta">
                  <span>💬 {game.responseCount} responses</span>
                  <span>{formatDate(game.createdAt)}</span>
                </div>
              </div>
              <div className="manage-actions">
                <Link className="btn btn-ghost btn-sm" to={`/admin/edit/${game.id}`}>Edit</Link>
                <a className="btn btn-ghost btn-sm" href={`/game/${game.id}`} target="_blank" rel="noreferrer">View</a>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === game.id} onClick={() => togglePublish(game)}>
                  {game.published ? 'Unpublish' : 'Publish'}
                </button>
                <Link className="btn btn-ghost btn-sm" to={`/admin/games/${game.id}/results`}>Results</Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQrFor(game)}>QR</button>
                <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => setToDelete(game)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Are you sure?"
          message={`"${toDelete.title}" and its responses will be permanently deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
      {qrFor && <QRModal path={`/game/${qrFor.id}`} title={qrFor.title} onClose={() => setQrFor(null)} />}
    </>
  );
}
