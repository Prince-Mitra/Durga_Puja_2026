import api from './api';

export const adminService = {
  login: (identifier, password) => api.post('/admin/login', { identifier, password }).then((r) => r.data.admin),
  logout: () => api.post('/admin/logout'),
  me: () => api.get('/admin/me').then((r) => r.data.admin),

  stats: () => api.get('/admin/stats').then((r) => r.data),

  listGames: (params) => api.get('/admin/games', { params }).then((r) => r.data.games),
  getGame: (id) => api.get(`/admin/games/${id}`).then((r) => r.data.game),
  createGame: (payload) => api.post('/admin/games', payload).then((r) => r.data.game),
  updateGame: (id, payload) => api.put(`/admin/games/${id}`, payload).then((r) => r.data.game),
  deleteGame: (id) => api.delete(`/admin/games/${id}`),
  setPublished: (id, published) => api.patch(`/admin/games/${id}/publish`, { published }).then((r) => r.data.game),
  results: (id) => api.get(`/admin/games/${id}/results`).then((r) => r.data),
  resetGame: (id) => api.post(`/admin/games/${id}/reset`).then((r) => r.data.game),
  lockGame: (id) => api.post(`/admin/games/${id}/lock`).then((r) => r.data.game),
  openGame: (id) => api.post(`/admin/games/${id}/open`).then((r) => r.data.game),

  live: () => api.get('/admin/live').then((r) => r.data),
  nextQuestion: () => api.post('/admin/live/next').then((r) => r.data),
  setLive: (gameId) => api.post('/admin/live/set', { gameId }).then((r) => r.data),
  clearLive: () => api.post('/admin/live/clear').then((r) => r.data),

  /** Uploads with progress (0-100). Resolves with the media descriptor to attach to a game. */
  uploadMedia: (file, onProgress, signal) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post('/admin/upload', form, {
        timeout: 0, // big videos on slow wifi
        signal,
        onUploadProgress: (event) => {
          if (event.total && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((r) => r.data.media);
  },
  deleteMedia: (key) => api.delete(`/admin/upload/${key}`),
};
