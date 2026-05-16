import wordsData from '../data/words.json';

export {
  filterUnusedWords,
  pickFreshWords,
  pickRandom,
} from './indovinaWordPure';
export type {
  PickWordsResult,
  PickWordsSuccess,
  PickWordsFailure,
} from './indovinaWordPure';

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

export function getActiveWords(): string[] {
  return activeWords.slice();
}
