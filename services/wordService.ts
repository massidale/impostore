import wordsData from '../data/words.json';
import { GeneratedWords } from './geminiService';

// Parole statiche di default
const defaultWords: { [key: string]: string } = wordsData;

// Parole attive (possono essere sostituite da quelle generate)
let activeWords: { [key: string]: string } = defaultWords;

// Parole già usate in questa sessione
let usedWords: Set<string> = new Set();

export function setCustomWords(words: GeneratedWords): void {
  activeWords = words;
  usedWords.clear(); // Reset parole usate quando si cambiano le parole
}

export function resetToDefaultWords(): void {
  activeWords = defaultWords;
  usedWords.clear(); // Reset parole usate
}

export function resetUsedWords(): void {
  usedWords.clear();
}

export function getRandomWord(excludeWord?: string): string {
  const wordList = Object.keys(activeWords);

  // Filtra le parole già usate e quella da escludere
  let availableWords = wordList.filter(w => {
    const isUsed = usedWords.has(w.toLowerCase());
    const isExcluded = excludeWord && w.toLowerCase() === excludeWord.toLowerCase();
    return !isUsed && !isExcluded;
  });

  // Se tutte le parole sono state usate, resetta e riprova
  if (availableWords.length === 0) {
    usedWords.clear();
    availableWords = excludeWord
      ? wordList.filter(w => w.toLowerCase() !== excludeWord.toLowerCase())
      : wordList;
  }

  const randomIndex = Math.floor(Math.random() * availableWords.length);
  const selectedWord = availableWords[randomIndex];

  // Marca la parola come usata
  usedWords.add(selectedWord.toLowerCase());

  return selectedWord;
}

export function getHint(word: string): string | null {
  return activeWords[word.toLowerCase()] || activeWords[word] || null;
}

export function isUsingCustomWords(): boolean {
  return activeWords !== defaultWords;
}

