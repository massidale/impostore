/** Callable fallback for deployments whose RTDB rules do not expose room views.
 * Only one read is in flight. Errors preserve the last snapshot; stop discards
 * pending results, so switching rooms cannot leak a stale private view. */
export function startRoomPolling<T>(
  read: () => Promise<T>,
  emit: (value: T) => void,
  onError: (error: unknown) => void,
  interval = 1500,
) {
  let stopped = false;
  let busy = false;
  let queued = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    if (stopped) return;
    clearTimeout(timer);
    if (busy) { queued = true; return; }
    void run();
  };
  async function run() {
    busy = true;
    try {
      const value = await read();
      if (!stopped) { failures = 0; emit(value); }
    } catch (error) {
      if (!stopped) { failures++; onError(error); }
    } finally {
      busy = false;
      if (!stopped) {
        if (queued) { queued = false; refresh(); }
        else timer = setTimeout(refresh, Math.min(15000, interval * 2 ** Math.min(failures, 4)));
      }
    }
  }
  refresh();
  return {refresh, stop() { stopped = true; clearTimeout(timer); }};
}
