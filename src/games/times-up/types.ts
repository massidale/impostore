export interface TimesUpSettings {
  turnSeconds: number;
  deckSize: number;
  teamMode: "auto" | "manual";
  manualTeams: Record<string, "blue" | "red"> | null;
  contentSource: "default" | "players";
}
export interface TimesUpView {
  phase: string;
  collectedCount?: number;
  myWords?: string[];
  roundId: number;
  roundNumber: number;
  participantUids: string[];
  teams: Record<"blue" | "red", string[]>;
  team: "blue" | "red";
  describerUid: string;
  deadline: number | null;
  actionVersion: number;
  remaining: number;
  currentCard?: { id: string; name: string; aliases: string[] };
  canUndo?: boolean;
  history: {
    round: number;
    cancelled?: boolean;
  }[];
}
