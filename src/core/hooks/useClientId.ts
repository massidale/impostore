import { useEffect, useState } from 'react';
import { sessionStore } from '../services/sessionStorage';

/**
 * Loads (and lazily creates) the stable client-id used as player identity.
 * Returns `null` while the storage round-trip is in flight; once resolved
 * the value never changes for the lifetime of the app instance.
 */
export function useClientId(): string | null {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    sessionStore.getClientId().then((id) => {
      if (!cancelled) setClientId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return clientId;
}
