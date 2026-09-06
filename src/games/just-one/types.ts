export interface JustOneSettings {
  rounds: number;
  teamMode?: "auto" | "manual";
  manualTeams?: Record<string, "blue" | "red"> | null;
  guesserUid?: string | null;
  mode?: "cooperative" | "teams";
}
export interface JustOneView {
  phase: string;
  roundId: number;
  phaseVersion: number;
  participantUids: string[];
  guesserUid: string;
  roundIndex: number;
  id?: string;
  name?: string;
  wordsGuessed?: number;
  myTeam?: JustOneView;
  teams?: JustOneTeamSummary[];
  winnerTeamIds?: string[];
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
  };
  history?: { round: number; word: string; correct: boolean }[];
}

export interface JustOneTeamSummary {
  id: string;
  name: string;
  participantUids: string[];
  phase: string;
  roundId: number;
  phaseVersion: number;
  roundIndex: number;
  guesserUid: string;
  wordsGuessed: number;
}
