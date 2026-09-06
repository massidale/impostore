/** Retry a transiently rejected deadline command; cancellation follows the screen lifetime. */
export function retryAction(action: () => Promise<unknown>, delay = 1000): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const attempt = async () => {
    try { await action(); }
    catch { if (!cancelled) timer = setTimeout(attempt, delay); }
  };
  void attempt();
  return () => {cancelled=true;if (timer) clearTimeout(timer);};
}
