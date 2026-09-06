import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import app from '../../../config/firebase';
import type { CoreRoom } from '../types/room';
const functions = getFunctions(app, 'europe-west1');
if (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) connectFunctionsEmulator(functions, process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST, 5001);
const invoke = httpsCallable(functions, 'gameCommand');
const snapshots = new Map<string, CoreRoom<any>>();
export function rememberRoom(roomId: string, room: CoreRoom | null) {
  if (room) snapshots.set(roomId, room); else snapshots.delete(roomId);
}
export async function roomCommand(roomId: string | null, method: string, args: unknown[] = []): Promise<any> {
  const room = roomId ? snapshots.get(roomId) : undefined;
  const expected = room ? {
    matchId: room.matchId ?? 0,
    phase: room.gameState?.phase ?? null,
    votingEndsAt: room.gameState?.votingEndsAt ?? null,
    cardVersion: room.cardVersion ?? 0,
    ...(room.gameState?.roundId !== undefined ? {roundId: room.gameState.roundId, phaseVersion: room.gameState.phaseVersion ?? 0} : {}),
    ...(room.gameState?.actionVersion !== undefined ? {actionVersion: room.gameState.actionVersion} : {}),
  } : undefined;
  try {
    const result = await invoke({roomId, method, args: args.map(v => v === undefined ? null : v), ...(expected ? {expected} : {})});
    return result.data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Impossibile aggiornare la stanza');
  }
}
export async function setRoomDictionary(roomId: string, gameId: string, dictionary: unknown): Promise<void> {
  await roomCommand(roomId, 'setDictionary', [gameId, dictionary]);
}
