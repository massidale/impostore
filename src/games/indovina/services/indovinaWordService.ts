import wordsData from '../data/words.json';

const defaultWords: string[] = wordsData;
let activeWords: string[] = defaultWords;

export function setCustomWords(words: string[]): void {
  activeWords = words.slice();
}

export function resetToDefaultWords(): void {
  activeWords = defaultWords;
}

export function isUsingCustomWords(): boolean {
  return activeWords !== defaultWords;
}

export function getShuffledWords(count: number): string[] {
  if (activeWords.length === 0) {
    throw new Error('Nessuna parola disponibile');
  }

  const pool = activeWords.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (count <= pool.length) {
    return pool.slice(0, count);
  }

  // Più giocatori che parole disponibili: cicla con shuffle ripetuti.
  const result: string[] = pool.slice();
  while (result.length < count) {
    const extra = activeWords.slice();
    for (let i = extra.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [extra[i], extra[j]] = [extra[j], extra[i]];
    }
    result.push(...extra.slice(0, count - result.length));
  }
  return result;
}
