import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Imperative acquire/release controls for the Screen Wake Lock API (web only).
 *
 * The `request()` call must run synchronously inside the same user-activation
 * tick as the originating tap, otherwise Safari/iOS rejects it silently. So we
 * expose `acquire` instead of driving the lock from a React state + effect.
 */
export function useKeepScreenAwake() {
  const lockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const wantedRef = useRef(false);

  const tryRequest = () => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined') return;
    const nav = navigator as unknown as {
      wakeLock?: {
        request: (type: 'screen') => Promise<{ release: () => Promise<void> }>;
      };
    };
    if (!nav.wakeLock) {
      console.warn('[wakeLock] navigator.wakeLock is not available');
      return;
    }
    // Kick the promise off WITHOUT awaiting so the underlying browser call
    // happens in the current user-activation tick.
    nav.wakeLock
      .request('screen')
      .then((lock) => {
        if (!wantedRef.current) {
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
      })
      .catch((err) => {
        console.warn('[wakeLock] request failed', err);
      });
  };

  const acquire = () => {
    wantedRef.current = true;
    if (lockRef.current) return;
    tryRequest();
  };

  const release = () => {
    wantedRef.current = false;
    const lock = lockRef.current;
    lockRef.current = null;
    if (lock) lock.release().catch(() => {});
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    // When the tab returns to the foreground the browser auto-releases the
    // lock — re-request if the caller still wants it. (Best-effort; may fail
    // if the user-activation has expired.)
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        wantedRef.current &&
        !lockRef.current
      ) {
        tryRequest();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { acquire, release };
}
