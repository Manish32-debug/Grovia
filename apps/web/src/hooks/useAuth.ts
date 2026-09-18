import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints/auth';
import { refreshAccessToken } from '@/api/client';

/**
 * Restores the session on first load. The access token was never persisted, so
 * this trades the refresh cookie for a fresh one. A 401 here is the normal
 * signed-out case, not an error worth surfacing.
 */
export function useSessionBootstrap(): boolean {
  const ready = useAuthStore((s) => s.ready);

  useEffect(() => {
    if (ready) return;
    void refreshAccessToken().finally(() => useAuthStore.getState().setReady());
  }, [ready]);

  return ready;
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  return {
    user,
    isSignedIn: user !== null,
    signOut: async () => {
      try {
        await authApi.logout();
      } finally {
        clearSession();
      }
    },
  };
}
