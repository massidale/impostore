export type RoomStatus = 'waiting' | 'active';

export type PlayerRole = 'civilian' | 'impostor' | null;

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

