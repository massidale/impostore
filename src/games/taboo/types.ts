export type TabooPhase = 'setup' | 'ready' | 'turn' | 'results';

export type TeamId = 'blue' | 'red';

export type TeamMode = 'auto' | 'manual';

export interface TabooCard {
  word: string;
  /** Forbidden words the describer must not say. */
  taboo: string[];
}

export interface Scores {
  blue: number;
  red: number;
}

export interface TurnStats {
  correct: number;
  taboo: number;
  skipped: number;
}

export interface TabooGameState {
  phase: TabooPhase;

  // Settings
  /** Length of each turn in seconds. */
  turnSeconds: number;
  /** How many turns each team plays before the game ends. */
  turnsPerTeam: number;
  /** Max skips ("Passa") allowed per turn. */
  maxSkips?: number;
  /** Team formation: balanced random split or host-picked rosters. */
  teamMode?: TeamMode;
  /** Host-picked rosters (teamMode 'manual'). Late joiners are auto-balanced. */
  manualTeams?: { [uid: string]: TeamId } | null;

  // Session state (set by startGame)
  /** Shuffled deck for this match. The cursor wraps when exhausted. */
  deck?: TabooCard[];
  /** Index of the current card in the deck. */
  cursor?: number;
  scores?: Scores;
  /** Team assignment per player uid. */
  teams?: { [uid: string]: TeamId };
  /** Describer rotation per team. */
  turnOrder?: { blue: string[]; red: string[] };
  /** Team that opens the match — drawn at random at every start. */
  startTeam?: TeamId;
  /** 0-based global turn counter. Even = startTeam, odd = the other team. */
  turnNumber?: number;
  currentTeam?: TeamId;
  describerUid?: string;
  /** Epoch ms when the running turn expires. Null while phase = 'ready'. */
  turnEndsAt?: number | null;
  /** Live stats of the running turn. */
  turnStats?: TurnStats;
  /** Last card outcome of the running turn — single-level undo target. */
  lastAction?: { outcome: 'correct' | 'taboo' | 'skip'; team: TeamId } | null;
  /** Recap of the last completed turn, shown between turns. */
  lastTurn?: (TurnStats & { team: TeamId; describerUid: string }) | null;
}

/**
 * Taboo data that belongs to the room, not to a single match: it lives under
 * `rooms/{id}/gameData/taboo` so it survives `endTabooGame` and settings
 * changes, and is only wiped when the room itself goes away.
 */
export interface TabooRoomData {
  /** Words already shown in this room, keyed by `wordKey(word)`. */
  usedWords?: { [key: string]: true };
}

export interface TabooSettings {
  turnSeconds: number;
  turnsPerTeam: number;
  maxSkips: number;
  teamMode: TeamMode;
  manualTeams?: { [uid: string]: TeamId } | null;
}
