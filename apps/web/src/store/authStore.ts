import { create } from 'zustand';
import type { PublicUser } from '@grovia/shared';

/**
 * The access token lives in memory only — never localStorage, where any XSS
 * can read it. Durability comes from the httpOnly refresh cookie: a page reload
 * calls /auth/refresh and gets a new access token silently.
 */
interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  /** False until the initial silent refresh has settled. */
  ready: boolean;
  setSession: (session: { user: PublicUser; accessToken: string }) => void;
  clearSession: () => void;
  setReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setSession: ({ user, accessToken }) => set({ user, accessToken, ready: true }),
  clearSession: () => set({ user: null, accessToken: null, ready: true }),
  setReady: () => set({ ready: true }),
}));

export const getAccessToken = () => useAuthStore.getState().accessToken;
