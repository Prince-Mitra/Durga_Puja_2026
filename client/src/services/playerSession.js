import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'pp_player_token';
const PLAYER_KEY = 'pp_player';

// localStorage can throw (private mode, blocked storage) - fall back to memory so the game still works.
const memory = {};
const read = (key) => {
  try {
    return localStorage.getItem(key) ?? memory[key] ?? null;
  } catch {
    return memory[key] ?? null;
  }
};
const write = (key, value) => {
  memory[key] = value;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

export const getPlayerToken = () => read(TOKEN_KEY);
export const getStoredPlayer = () => {
  try {
    return JSON.parse(read(PLAYER_KEY));
  } catch {
    return null;
  }
};
export const clearPlayerSession = () => {
  write(TOKEN_KEY, null);
  write(PLAYER_KEY, null);
};

let inflight = null;

/**
 * Asks the server for (or renews) the anonymous identity. The server owns the id; we just keep the signed token.
 * Concurrent callers share one request.
 */
export function ensurePlayerSession({ nickname, force = false } = {}) {
  if (!force && nickname === undefined && getPlayerToken() && getStoredPlayer()) {
    return Promise.resolve({ token: getPlayerToken(), player: getStoredPlayer() });
  }
  if (inflight && nickname === undefined) return inflight;

  inflight = axios
    .post(`${API_URL}/api/player/session`, { token: force ? undefined : getPlayerToken() || undefined, nickname })
    .then(({ data }) => {
      write(TOKEN_KEY, data.token);
      write(PLAYER_KEY, JSON.stringify(data.player));
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
