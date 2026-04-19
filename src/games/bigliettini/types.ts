export type BigliettiniPhase = 'setup' | 'playing' | 'results';

export interface BigliettiniGameState {
  phase: BigliettiniPhase;
}

// Placeholder — will be filled in once the game mechanics are designed.
export type BigliettiniSettings = Record<string, never>;
