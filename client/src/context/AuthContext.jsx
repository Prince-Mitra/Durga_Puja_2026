import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService';

const AuthContext = createContext(null);

/** Admin session (HTTP-only cookie). The cookie is invisible to JS, so we ask the server who we are. */
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminService
      .me()
      .then((a) => active && setAdmin(a))
      .catch(() => active && setAdmin(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const a = await adminService.login(identifier, password);
    setAdmin(a);
    return a;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminService.logout();
    } finally {
      setAdmin(null);
    }
  }, []);

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
