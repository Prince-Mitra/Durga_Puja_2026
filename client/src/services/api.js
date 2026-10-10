import axios from 'axios';
import { ensurePlayerSession, getPlayerToken, clearPlayerSession } from './playerSession';

export const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // admin session cookie
  timeout: 30000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // CSRF guard expected by the server
});

const isAdminUrl = (url = '') => /^\/(admin|auth)(\/|$)/.test(url);
const isPlayerSessionUrl = (url = '') => url.startsWith('/player/session');

api.interceptors.request.use(async (config) => {
  if (isAdminUrl(config.url) || isPlayerSessionUrl(config.url)) return config;
  if (!getPlayerToken()) await ensurePlayerSession();
  config.headers['X-Player-Token'] = getPlayerToken();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    // Player token expired or tampered with: mint a fresh anonymous identity and retry once.
    if (response?.status === 401 && response.data?.error?.code === 'INVALID_PLAYER_TOKEN' && config && !config._retried) {
      config._retried = true;
      clearPlayerSession();
      await ensurePlayerSession({ force: true });
      config.headers['X-Player-Token'] = getPlayerToken();
      return api(config);
    }
    return Promise.reject(error);
  }
);

/** Turns any axios/network error into a short human message. */
export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.response) {
    const apiError = error.response.data?.error;
    return apiError?.message || fallback;
  }
  if (error?.request) return 'Cannot reach the server. Check your connection.';
  return error?.message || fallback;
}

export const getErrorCode = (error) => error?.response?.data?.error?.code || null;

export default api;
