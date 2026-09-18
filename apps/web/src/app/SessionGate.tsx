import type { PropsWithChildren } from 'react';
import { useSessionBootstrap } from '@/hooks/useAuth';

/**
 * Runs the silent refresh once before the router mounts, so a reload on a
 * protected route does not flash the sign-in screen before the session is
 * restored.
 */
export function SessionGate({ children }: PropsWithChildren) {
  const ready = useSessionBootstrap();

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <p className="text-text-3">Loading Grovia…</p>
      </div>
    );
  }

  return <>{children}</>;
}
