import { useCallback, useState } from 'react';
/** Keep rejected/stale commands visible instead of leaving an unhandled promise. */
export function useGameAction() {
  const [error, setError] = useState<string | null>(null);
  const runAction = useCallback(async (action: () => Promise<void>) => {
    setError(null);
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Azione non riuscita. Riprova.'); }
  }, []);
  return {error, runAction};
}
