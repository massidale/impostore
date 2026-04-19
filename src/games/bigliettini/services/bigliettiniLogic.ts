import { touchRoom } from '../../../core/services/roomService';
import { BigliettiniGameState } from '../types';

export async function initBigliettiniGame(roomId: string): Promise<void> {
  const initialState: BigliettiniGameState = { phase: 'setup' };
  await touchRoom(roomId, {
    [`rooms/${roomId}/currentGameId`]: 'bigliettini',
    [`rooms/${roomId}/gameState`]: initialState,
  });
}

export async function startBigliettiniGame(roomId: string): Promise<void> {
  await touchRoom(roomId, {
    [`rooms/${roomId}/status`]: 'active',
    [`rooms/${roomId}/gameState/phase`]: 'playing',
  });
}

export async function endBigliettiniGame(roomId: string): Promise<void> {
  await touchRoom(roomId, {
    [`rooms/${roomId}/status`]: 'lobby',
    [`rooms/${roomId}/gameState/phase`]: 'setup',
  });
}
