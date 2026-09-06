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
  history: { round: number; correctOrder: boolean; cancelled?: boolean }[];
  order: string[];
  numbersByUid?: Record<string, number>;
  correctOrder?: boolean;
  cancelled?: boolean;
}
