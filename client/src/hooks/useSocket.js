import { useEffect, useRef, useState } from 'react';
import { getSocket, joinGameRoom, leaveGameRoom } from '../services/socket';

/** Subscribe to a global socket event (games:changed, live:changed). */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const socket = getSocket();
    const listener = (payload) => ref.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
}

/**
 * Joins the room of one game and subscribes to its events.
 * handlers = { 'question:locked': fn, 'poll:updated': fn, ... }
 * Returns whether the socket is currently connected (for a "live" indicator).
 */
export function useGameSocket(gameId, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  const [connected, setConnected] = useState(() => getSocket().connected);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!gameId) return undefined;
    const socket = getSocket();
    joinGameRoom(gameId);
    const bound = Object.keys(ref.current).map((event) => {
      const listener = (payload) => ref.current[event]?.(payload);
      socket.on(event, listener);
      return [event, listener];
    });
    return () => {
      bound.forEach(([event, listener]) => socket.off(event, listener));
      leaveGameRoom(gameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  return connected;
}
