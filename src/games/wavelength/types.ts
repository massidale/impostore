export interface WavelengthSettings {
  cycles: number;
}
export interface WavelengthRoundResult {
  roundId: number;
  guesserUid: string;
  target: number;
  guess: number | null;
  distance: number | null;
  points: number;
  cancelled: boolean;
}
export interface WavelengthView {
  history: WavelengthRoundResult[];
  phase: "idle" | "clues" | "guessing" | "roundResults" | "results";
  roundId: number;
  participantUids: string[];
  guesserUid: string;
  turnIndex: number;
  turnOrder: string[];
  heardUids: string[];
  scores: Record<string, number>;
  suggestion?: string;
  target?: number;
  guess?: number | null;
  distance?: number | null;
  roundPoints?: number;
  cancelled?: boolean;
  winners?: string[];
}
