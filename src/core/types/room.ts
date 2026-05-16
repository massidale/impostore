export type CoreRoomStatus = 'lobby' | 'active';

export interface CorePlayer {
  joinedAt: number;
  name?: string;
  isHost?: boolean;
  /** True when the player joined mid-game and is waiting for the next round. */
  waiting?: boolean;
}

export interface CoreRoom<TGameState = unknown> {
  id: string; // The 6-char room code
  status: CoreRoomStatus;
  hostId: string;
  createdAt: number;
  /** Timestamp of last mutation — used by the cleanup job to purge stale rooms */
  updatedAt: number;

  currentGameId: string; // 'impostore', etc.

  players?: {
    [uid: string]: CorePlayer;
  };

  // Polymorphic game payload — typed per-game via generic
  gameState?: TGameState;
}
