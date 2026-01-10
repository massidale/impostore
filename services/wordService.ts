import wordsData from '../data/words.json';
import { GeneratedWords } from './geminiService';

// Parole statiche di default
const defaultWords: { [key: string]: string } = wordsData;

// Parole attive (possono essere sostituite da quelle generate)
let activeWords: { [key: string]: string } = defaultWords;

export function setCustomWords(words: GeneratedWords): void {
  activeWords = words;
}

export function resetToDefaultWords(): void {
  activeWords = defaultWords;
}

export function getRandomWord(excludeWord?: string): string {
  const wordList = Object.keys(activeWords);
  let availableWords = excludeWord
    ? wordList.filter(w => w.toLowerCase() !== excludeWord.toLowerCase())
    : wordList;

  if (availableWords.length === 0) {
    availableWords = wordList;
  }

  const randomIndex = Math.floor(Math.random() * availableWords.length);
  return availableWords[randomIndex];
}

export function getHint(word: string): string | null {
  return activeWords[word.toLowerCase()] || activeWords[word] || null;
}

export function isUsingCustomWords(): boolean {
  return activeWords !== defaultWords;
}

