export type IndovinaPhase = 'setup' | 'playing' | 'results';

export interface IndovinaGameState {
  phase: IndovinaPhase;
}

// Placeholder — will be filled in once the game mechanics are designed.
export type IndovinaSettings = Record<string, never>;
