import { CorePlayer } from '../../core/types/room';

export type IndovinaPhase = 'setup' | 'collecting' | 'playing' | 'results';

export type WordSource = 'random' | 'players';

export interface IndovinaPlayerState extends CorePlayer {
  word?: string;
  submittedWord?: string;
}

export interface IndovinaGameState {
  phase: IndovinaPhase;
  wordSource: WordSource;
  /** Words already used by previous rounds in this session (random mode only). */
  usedWords?: string[];
  /** UID of the player who starts the current round. */
  firstPlayerId?: string | null;
}

export interface IndovinaSettings {
  wordSource: WordSource;
}

/** Code thrown by startIndovinaGame when the dictionary doesn't have enough fresh words. */
export const NOT_ENOUGH_WORDS_ERROR = 'INDOVINA_NOT_ENOUGH_WORDS';

export interface NotEnoughWordsErrorPayload {
  code: typeof NOT_ENOUGH_WORDS_ERROR;
  available: number;
  required: number;
}
