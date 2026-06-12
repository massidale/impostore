import { useEffect, useState } from 'react';

function secondsLeft(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

/**
 * Counts down to an epoch-ms deadline shared via the realtime DB, so every
 * client shows the same timer without clock coordination beyond Date.now().
 * Returns the remaining whole seconds (>= 0), or null when no deadline is set.
 */
export function useCountdown(endsAt: number | null | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(
    endsAt ? secondsLeft(endsAt) : null
  );

  useEffect(() => {
    if (!endsAt) {
      setRemaining(null);
      return;
    }
    const tick = () => setRemaining(secondsLeft(endsAt));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}
