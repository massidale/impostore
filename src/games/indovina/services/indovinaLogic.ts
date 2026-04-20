import { touchRoom } from '../../../core/services/roomService';
import { IndovinaGameState } from '../types';

export async function initIndovinaGame(roomId: string): Promise<void> {
  const initialState: IndovinaGameState = { phase: 'setup' };
  await touchRoom(roomId, {
    [`rooms/${roomId}/currentGameId`]: 'indovina',
    [`rooms/${roomId}/gameState`]: initialState,
  });
}

export async function startIndovinaGame(roomId: string): Promise<void> {
  await touchRoom(roomId, {
    [`rooms/${roomId}/status`]: 'active',
    [`rooms/${roomId}/gameState/phase`]: 'playing',
  });
}

export async function endIndovinaGame(roomId: string): Promise<void> {
  await touchRoom(roomId, {
    [`rooms/${roomId}/status`]: 'lobby',
    [`rooms/${roomId}/gameState/phase`]: 'setup',
  });
}
