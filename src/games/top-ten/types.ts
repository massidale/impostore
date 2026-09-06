export interface TopTenSettings {
  rounds: number;
}
export interface TopTenView {
  phase: string;
  roundId: number;
  participantUids: string[];
  theme?: { prompt: string; lowLabel: string; highLabel: string };
  captainUid: string;
  ownNumber?: number;
  performanceOrder: string[];
  performed: string[];
  score: number;
  roundScore?: number;
  order: string[];
  numbersByUid?: Record<string, number>;
  history: { round: number; score: number; cancelled?: boolean }[];
  cancelled?: boolean;
}
