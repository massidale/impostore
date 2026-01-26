export type RoomStatus = 'waiting' | 'active';

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
}

