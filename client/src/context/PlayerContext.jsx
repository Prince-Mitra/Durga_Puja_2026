import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ensurePlayerSession, getStoredPlayer } from '../services/playerSession';
import { getErrorMessage } from '../services/api';

const PlayerContext = createContext(null);

/** Anonymous player identity. No login: the server hands out a signed id on first visit. */
export function PlayerProvider({ children }) {
  const [player, setPlayer] = useState(getStoredPlayer());

  useEffect(() => {
    let active = true;
    ensurePlayerSession()
      .then((session) => active && setPlayer(session.player))
      .catch(() => {
        /* requests retry the session themselves; nothing to show yet */
      });
    return () => {
      active = false;
    };
  }, []);

  const rename = useCallback(async (nickname) => {
    try {
      const session = await ensurePlayerSession({ nickname });
      setPlayer(session.player);
      toast.success(`You are now ${session.player.name}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not change your name'));
    }
  }, []);

  const value = useMemo(() => ({ player, rename }), [player, rename]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
};
