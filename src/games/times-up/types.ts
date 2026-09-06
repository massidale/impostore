export interface TimesUpSettings {
  turnSeconds: number;
  deckSize: number;
  teamMode: "auto" | "manual";
  manualTeams: Record<string, "blue" | "red"> | null;
  contentSource: "default" | "custom" | "players";
}
export interface TimesUpView {
  phase: string;
  roundId: number;
  roundNumber: number;
  participantUids: string[];
  teams: Record<"blue" | "red", string[]>;
  team: "blue" | "red";
  describerUid: string;
  scores: Record<"blue" | "red", number>;
  roundScores: Record<"blue" | "red", number>;
  deadline: number | null;
  actionVersion: number;
  remaining: number;
  collectedCount: number;
  submittedCount: number;
  submitted: boolean;
  ownNames?: string[];
  currentCard?: { id: string; name: string; aliases: string[] };
  canUndo?: boolean;
  history: {
    round: number;
    scores: Record<"blue" | "red", number>;
    cancelled?: boolean;
  }[];
}
