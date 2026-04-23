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
}

export interface IndovinaSettings {
  wordSource: WordSource;
}
