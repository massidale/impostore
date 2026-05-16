import wordsData from '../data/words.json';
import { GeneratedWords } from '../../../core/services/geminiService';
import {
  pickWordWithRotation,
  getHintForWord,
  type PickWordResult,
} from './impostoreWordPure';

// Default dictionary shipped with the app.
const defaultDict: Record<string, string> = wordsData;

// Active dictionary — swappable when the user generates an AI dictionary.
// Module-level by design: it's user-side, single-tab, and resets fine on reload.
// The session-level "already used" tracking lives in Firebase (gameState.usedWords)
// so it stays consistent across host reconnects and multi-client scenarios.
let activeDict: Record<string, string> = defaultDict;

export function setCustomWords(words: GeneratedWords): void {
  activeDict = words;
}

export function resetToDefaultWords(): void {
  activeDict = defaultDict;
}

export function getActiveDict(): Record<string, string> {
  return activeDict;
}

/**
 * Picks a word for the next round using the persisted `used` list as input
 * and returning the new list to write back to game state.
 */
export function pickWordForSession(
  used: string[],
  excludeWord?: string | null
): PickWordResult {
  return pickWordWithRotation(activeDict, used, excludeWord ?? null);
}

export function getHint(word: string): string | null {
  return getHintForWord(activeDict, word);
}
