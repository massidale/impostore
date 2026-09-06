import { roomCommand } from '../../../core/services/roomCommand';
import type { IndovinaSettings } from '../types';

export async function initIndovinaGame(roomId: string, settings: IndovinaSettings): Promise<void> {
  await roomCommand(roomId, 'initIndovinaGame', [settings]);
}

export async function resetIndovinaUsedWords(roomId: string): Promise<void> {
  await roomCommand(roomId, 'resetIndovinaUsedWords', []);
}

export async function startIndovinaGame(roomId: string): Promise<void> {
  await roomCommand(roomId, 'startIndovinaGame', []);
}

export async function submitPlayerWord(roomId: string, playerUid: string, word: string): Promise<void> {
  await roomCommand(roomId, 'submitPlayerWord', [playerUid, word]);
}

export async function finalizeCollecting(roomId: string): Promise<void> {
  await roomCommand(roomId, 'finalizeCollecting', []);
}

export async function endIndovinaGame(roomId: string): Promise<void> {
  await roomCommand(roomId, 'endIndovinaGame', []);
}
