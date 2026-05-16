/**
 * Pure helpers used by the Indovina word service. Kept in a JSON-free module
 * so tests can import them directly under Node's ESM loader without import
 * attributes for the dictionary JSON.
 */

/** Lower-case + trim for stable comparison between possibly-differently-cased entries. */
function normalize(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Returns the subset of `pool` whose normalized form is not present in `used`.
 */
export function filterUnusedWords(pool: string[], used: string[]): string[] {
  if (used.length === 0) return pool.slice();
  const usedSet = new Set(used.map(normalize));
  return pool.filter((w) => !usedSet.has(normalize(w)));
}

export interface PickWordsSuccess {
  ok: true;
  picked: string[];
}

export interface PickWordsFailure {
  ok: false;
  available: number;
  required: number;
}

export type PickWordsResult = PickWordsSuccess | PickWordsFailure;

/**
 * Picks `count` random words from `pool`, excluding any whose normalized form
 * appears in `used`. Returns a failure result (NOT a throw) when there aren't
 * enough fresh words left — callers decide how to surface the error.
 *
 * `random` is injected so tests can be deterministic.
 */
export function pickFreshWords(
  pool: string[],
  used: string[],
  count: number,
  random: () => number = Math.random
): PickWordsResult {
  const available = filterUnusedWords(pool, used);
  if (available.length < count) {
    return { ok: false, available: available.length, required: count };
  }

  const shuffled = available.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { ok: true, picked: shuffled.slice(0, count) };
}

/**
 * Picks one element uniformly at random.
 * Throws if the array is empty (programmer error).
 */
export function pickRandom<T>(arr: T[], random: () => number = Math.random): T {
  if (arr.length === 0) throw new Error('Empty array');
  return arr[Math.floor(random() * arr.length)];
}
