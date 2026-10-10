import { io } from 'socket.io-client';
import { API_URL } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
let socket = null;
let currentGameId = null;

/** One shared connection for the whole app (created lazily). */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL || API_URL || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionDelayMax: 4000,
    });
    // After a network blip the server forgets our room - rejoin automatically.
    socket.on('connect', () => {
      if (currentGameId) socket.emit('game:join', currentGameId);
    });
  }
  return socket;
}

export function joinGameRoom(gameId) {
  currentGameId = gameId;
  const s = getSocket();
  if (s.connected) s.emit('game:join', gameId);
}

export function leaveGameRoom(gameId) {
  if (currentGameId === gameId) {
    currentGameId = null;
    if (socket?.connected) socket.emit('game:leave');
  }
}
