import api from './api';

export const gameService = {
  list: () => api.get('/games').then((r) => r.data.games),
  live: () => api.get('/games/live').then((r) => r.data.game),
  get: (id) => api.get(`/games/${id}`).then((r) => r.data.game),
  answer: (id, optionIndex) => api.post(`/games/${id}/answer`, { optionIndex }).then((r) => r.data),
  results: (id) => api.get(`/games/${id}/results`).then((r) => r.data.results),
  publicResults: () => api.get('/results').then((r) => r.data.items),
};
