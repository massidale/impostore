export interface HerdMentalitySettings {
  rounds: number;
}
export interface HerdMentalityView {
  phase: string;
  roundId: number;
  phaseVersion: number;
  participantUids: string[];
  roundIndex: number;
  question: string;
  submittedUids: string[];
  myAnswer?: string;
  answersByUid?: Record<string, string>;
  groups?: { id: string; memberUids: string[] }[];
  scores: Record<string, number>;
  canUndo?: boolean;
  winners?: string[];
  roundResult?: { winners: string[]; cancelled: boolean };
  history?: {
    round: number;
    question: string;
    winners: string[];
    cancelled: boolean;
  }[];
}
