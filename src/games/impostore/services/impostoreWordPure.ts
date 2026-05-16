/**
 * Pure helpers used by the Impostore word service. Kept JSON-free so tests
 * can import them directly under Node's strip-types loader, and so the
 * session-level "used words" tracker can be persisted in Firebase rather
 * than living in module-level mutable state.
 */

function normalize(word: string): string {
  return word.trim().toLowerCase();
}

export function getHintForWord(
  dict: Record<string, string>,
  word: string
): string | null {
  if (!word) return null;
  return dict[normalize(word)] ?? dict[word] ?? null;
}

export interface PickWordResult {
  word: string;
  hint: string | null;
  /** Updated used-words list to persist back to game state. */
  newUsed: string[];
  /** True when the pool was exhausted and the rotation restarted. */
  rotated: boolean;
}

/**
 * Picks one word from `dict`, excluding any whose normalized form appears in
 * `used` and optionally a specific word to skip (typically the previous
 * round's word). When every fresh word has already been used the rotation
 * restarts: `newUsed` becomes `[picked]` and `rotated` is `true`.
 *
 * `random` is injected so tests can be deterministic.
 */
export function pickWordWithRotation(
  dict: Record<string, string>,
  used: string[],
  excludeWord: string | null = null,
  random: () => number = Math.random
): PickWordResult {
  const wordList = Object.keys(dict);
  if (wordList.length === 0) {
    throw new Error('Empty dictionary');
  }

  const usedSet = new Set(used.map(normalize));
  const excludeKey = excludeWord ? normalize(excludeWord) : null;

  let available = wordList.filter((w) => {
    const k = normalize(w);
    if (usedSet.has(k)) return false;
    if (excludeKey && k === excludeKey) return false;
    return true;
  });

  let rotated = false;
  if (available.length === 0) {
    rotated = true;
    available = excludeKey
      ? wordList.filter((w) => normalize(w) !== excludeKey)
      : wordList.slice();
    // Pathological: dict of size 1 containing the excluded word.
    if (available.length === 0) available = wordList.slice();
  }

  const word = available[Math.floor(random() * available.length)];
  const hint = getHintForWord(dict, word);
  const newUsed = rotated ? [word] : [...used, word];
  return { word, hint, newUsed, rotated };
}
