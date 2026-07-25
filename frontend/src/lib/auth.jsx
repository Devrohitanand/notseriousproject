import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_user') || 'null'); } catch { return null; }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) { setReady(true); return; }
    api.get('/auth/me').then((r) => { setUser(r.data); localStorage.setItem('sb_user', JSON.stringify(r.data)); }).catch(() => { setUser(null); }).finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('sb_token', r.data.token);
    localStorage.setItem('sb_user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };
  const register = async (payload) => {
    const r = await api.post('/auth/register', payload);
    localStorage.setItem('sb_token', r.data.token);
    localStorage.setItem('sb_user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };
  const setTokenAndFetch = async (token) => {
    localStorage.setItem('sb_token', token);
    const r = await api.get('/auth/me');
    localStorage.setItem('sb_user', JSON.stringify(r.data));
    setUser(r.data);
    return r.data;
  };
  const logout = () => { localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); setUser(null); };

  return <AuthCtx.Provider value={{ user, login, register, setTokenAndFetch, logout, ready }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
