/**
 * AuthProvider.tsx — who is logged in, and the actions to change that.
 *
 * On app start it tries to restore the session: the refresh cookie → a new
 * access token → GET /auth/me. Until that finishes, status is 'loading' so
 * protected pages show a loader instead of bouncing you to /login.
 * It also registers the api client's "unauthorized" handler, so an expired
 * session anywhere in the app logs the user out cleanly.
 */
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import type { AuthResponse, LoginInput, SignupInput, User } from '@/lib/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Replace the signed-in user's details (after editing the profile). */
  updateUser: (user: User) => void;
  /** Drop the local session without calling the server (it already ended it). */
  forgetSession: () => void;
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

const GUEST: AuthState = { status: 'guest', user: null };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  // If any API call finds the session dead (refresh failed), drop to guest and forget
  // cached private data, so the next person on this device never sees it.
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      setState(GUEST);
      queryClient.clear();
    });
    return () => api.setUnauthorizedHandler(null);
  }, [queryClient]);

  // Restore an existing session once on startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await api.refreshSession();
        const user = refreshed ? (await authApi.me()).user : null;
        if (!cancelled) setState(user ? { status: 'authenticated', user } : GUEST);
      } catch {
        if (!cancelled) setState(GUEST);
      }
    })();
    // StrictMode mounts twice in dev; ignore the result of the abandoned first run.
    return () => {
      cancelled = true;
    };
  }, []);

  /** Shared tail of login/signup/google: keep the token in memory and mark as logged in. */
  const startSession = useCallback((res: AuthResponse) => {
    api.setAccessToken(res.accessToken);
    setState({ status: 'authenticated', user: res.user });
    return res.user;
  }, []);

  const login = useCallback(async (input: LoginInput) => startSession(await authApi.login(input)), [startSession]);
  const signup = useCallback(async (input: SignupInput) => startSession(await authApi.signup(input)), [startSession]);
  const loginWithGoogle = useCallback(
    async (credential: string) => startSession(await authApi.google(credential)),
    [startSession],
  );

  /** Log out on the server if we can, but ALWAYS clear local state and cached data. */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the server is unreachable, the user expects to be logged out here.
    } finally {
      api.setAccessToken(null);
      setState(GUEST);
      queryClient.clear();
    }
  }, [queryClient]);

  /** Refresh the signed-in user's details after a profile change (name, username, photo). */
  const updateUser = useCallback((user: User) => {
    setState((current) => (current.status === 'authenticated' ? { ...current, user } : current));
  }, []);

  /** After "sign out everywhere" or deleting the account: forget everything locally (the server already ended the session). */
  const forgetSession = useCallback(() => {
    api.setAccessToken(null);
    setState(GUEST);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, signup, loginWithGoogle, logout, updateUser, forgetSession }),
    [state, login, signup, loginWithGoogle, logout, updateUser, forgetSession],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Read the auth state and actions from any component inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
