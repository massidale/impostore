import wordsData from '../data/words.json';
import hintsData from '../data/hints.json';

export function getRandomWord(): string {
  const words: string[] = wordsData;
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

export function getHint(word: string): string | null {
  const hints: { [key: string]: string } = hintsData;
  return hints[word.toLowerCase()] || null;
}

