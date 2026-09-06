export interface WavelengthSettings {
  cycles: number;
}
export interface WavelengthRoundResult {
  roundId: number;
  guesserUid: string;
  target: number;
  guess: number | null;
  distance: number | null;
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
  suggestion?: string;
  target?: number;
  guess?: number | null;
  distance?: number | null;
  cancelled?: boolean;
}
