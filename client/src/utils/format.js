import { API_URL } from '../services/api';

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** Relative media URLs ("/uploads/x.png") need the API origin when client and API are on different hosts. */
export const assetUrl = (url) => (url && url.startsWith('/') ? `${API_URL}${url}` : url);

/** <input type="datetime-local"> wants local time without a zone. */
export const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const playLabel = (game) => {
  if (game.interactionMode === 'none') return 'VIEW NOW →';
  if (game.contentType === 'poll') return 'VOTE NOW →';
  return 'PLAY NOW →';
};

export const shareUrl = (path) => `${window.location.origin}${path}`;
