import wordsData from '../data/words.json';

const words: { [key: string]: string } = wordsData;
const wordList: string[] = Object.keys(words);

export function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}

export function getHint(word: string): string | null {
  return words[word.toLowerCase()] || null;
}

