export interface JustOneSettings {
  rounds: number;
}
export interface JustOneView {
  phase: string;
  roundId: number;
  phaseVersion: number;
  participantUids: string[];
  guesserUid: string;
  roundIndex: number;
  score: number;
  submittedUids: string[];
  readyUids: string[];
  target?: string;
  myClue?: string;
  validClues?: string[];
  myFlaggedUids?: string[];
  reviewClues?: {
    authorUid: string;
    text: string;
    invalid: boolean;
    flagCount: number;
  }[];
  roundResult?: {
    word: string;
    guess: string;
    correct: boolean;
    reason: string;
    points: number;
  };
  history?: { round: number; word: string; correct: boolean; points: number }[];
}
