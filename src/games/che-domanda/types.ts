export interface CheDomandaSettings {
  numImpostors: number;
  votingSeconds: number;
}
export interface CheDomandaView {
  phase:
    "idle" | "answering" | "discussion" | "voting" | "elimination" | "results";
  roundId: number;
  participantUids: string[];
  ownQuestion?: string;
  ownAnswer?: number | string | null;
  textAnswer?: boolean;
  domain?: { min: number; max: number; decimals: number };
  question?: string;
  alternateQuestion?: string;
  answersByUid?: Record<string, number | string>;
  answeredUids: string[];
  eliminatedUids: string[];
  speakerOrder: string[];
  speakerIndex: number;
  ownVote?: string | null;
  voteCount?: number;
  candidates?: string[];
  runoff?: boolean;
  votingEndsAt?: number;
  elimination?: { uid: string; role: string } | null;
  winner?: string | null;
  roles?: Record<string, string>;
  cancelled?: boolean;
}
