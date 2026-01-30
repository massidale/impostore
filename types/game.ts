export type RoomStatus = 'waiting' | 'active' | 'voting' | 'results' | 'impostor_guess';

export type Winner = 'civilians' | 'impostor' | 'clown' | null;

export type PlayerRole = 'civilian' | 'impostor' | 'clown' | null;

export interface Player {
  role: PlayerRole;
  joinedAt: number;
  isFirst?: boolean;
  revealed?: boolean;
  name?: string;
}

export interface Room {
  word: string;
  hint?: string;
  status: RoomStatus;
  numImpostors: number;
  numClowns: number;
  hostId: string;
  createdAt: number;
  hintEnabled?: boolean;
  hintOnlyFirst?: boolean;
  firstPlayerId?: string;
  lastHeartbeat?: number;
  players?: {
    [uid: string]: Player;
  };
  // Voting system
  votes?: {
    [voterUid: string]: string; // voterUid -> votedUid
  };
  eliminatedPlayer?: string;
  eliminatedRole?: PlayerRole;
  winner?: Winner;
  impostorGuess?: string;
}

