import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import Modal from './Modal';

/** Shows "Playing as X" and lets people pick a nickname (shown to others when they answer first). */
export default function PlayerBadge() {
  const { player, rename } = usePlayer();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (!player) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (value.trim()) await rename(value.trim());
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="player-badge"
        onClick={() => {
          setValue(player.name);
          setOpen(true);
        }}
        aria-label={`Playing as ${player.name}. Change name`}
      >
        <span aria-hidden="true">👤</span> <span className="player-name">{player.name}</span> <span aria-hidden="true">✎</span>
      </button>
      {open && (
        <Modal title="Your name" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <label className="label" htmlFor="nickname">Shown to everyone if you answer first</label>
            <input id="nickname" className="input" value={value} maxLength={20} onChange={(e) => setValue(e.target.value)} autoFocus />
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
