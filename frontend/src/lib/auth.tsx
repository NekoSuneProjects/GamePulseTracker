'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, clearTokens, getAccess, setTokens } from './api';
import { disconnectSocket } from './socket';
import type { AuthSession, AuthUser } from '@gpt/shared';

interface AuthContext {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getAccess()) { setLoading(false); return; }
      try {
        const me = await api<AuthUser>('/auth/me', { auth: true });
        setUser(me);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier: string, password: string) {
    const session = await api<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setTokens(session.accessToken, session.refreshToken);
    setUser(session.user);
  }

  async function register(username: string, email: string, password: string) {
    const session = await api<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    setTokens(session.accessToken, session.refreshToken);
    setUser(session.user);
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', auth: true, body: JSON.stringify({ refreshToken: localStorage.getItem('gpt:refresh') ?? '' }) });
    } catch (e) {
      // The session was probably already revoked or expired — still log it
      // so we notice if the logout endpoint regresses, but don't block the
      // local cleanup since the user wants to be signed out anyway.
      // eslint-disable-next-line no-console
      console.warn('[GamePulseTracker] /auth/logout failed:', e);
    }
    clearTokens();
    disconnectSocket();
    setUser(null);
  }

  async function refresh() {
    const me = await api<AuthUser>('/auth/me', { auth: true });
    setUser(me);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
