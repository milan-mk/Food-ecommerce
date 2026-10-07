import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we know whether a session cookie is valid

  useEffect(() => {
    let alive = true;
    authService.me().then((r) => alive && setUser(r.data.user)).catch(() => alive && setUser(null)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // The API layer fires this when any call returns 401 (session expired or account disabled).
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:unauthorized', onExpired);
    return () => window.removeEventListener('auth:unauthorized', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await authService.login({ email, password });
    setUser(r.data.user);
    return r.data.user;
  }, []);
  const register = useCallback(async (payload) => {
    const r = await authService.register(payload);
    setUser(r.data.user);
    return r.data.user;
  }, []);
  const logout = useCallback(async () => {
    try { await authService.logout(); } finally { setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading, isAdmin: user?.role === 'admin', login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
