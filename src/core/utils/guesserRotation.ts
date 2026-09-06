/** Advance in lobby order, retaining a useful successor if the last guesser left. */
export function nextGuesser(currentUids: readonly string[], previousUid: string | null, previousOrder: readonly string[] = currentUids): string | null {
  if (!currentUids.length) return null;
  const currentIndex = previousUid === null ? -1 : currentUids.indexOf(previousUid);
  if (currentIndex >= 0) return currentUids[(currentIndex + 1) % currentUids.length];
  const oldIndex = previousUid === null ? -1 : previousOrder.indexOf(previousUid);
  if (oldIndex >= 0) {
    for (let step = 1; step <= previousOrder.length; step++) {
      const candidate = previousOrder[(oldIndex + step) % previousOrder.length];
      if (currentUids.includes(candidate)) return candidate;
    }
  }
  return currentUids[0];
}
