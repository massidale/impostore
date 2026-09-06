import {CoreRoom} from '../types/room';
import {roomCommand, rememberRoom} from './roomCommand';
import {roomConnection} from './roomConnection';
export async function createRoom(_authUid: string, _hostClientId: string, _currentGameId: string, hostName: string): Promise<string> {
  return (await roomCommand(null, 'createRoom', [hostName.trim()])).roomId;
}
export async function fetchRoom(roomId: string): Promise<CoreRoom | null> {
  if (!/^[A-Z0-9]{6}$/.test(roomId)) return null;
  const room=await roomConnection.read(roomId);rememberRoom(roomId,room);return room;
}
export class NameTakenError extends Error {
  constructor() {super('Questo nome è già usato nella stanza');this.name='NameTakenError';}
}
export async function addPlayerToRoom(roomId: string, _clientId: string, playerName?: string): Promise<void> {
  try {await roomCommand(roomId, 'join', [playerName ?? '']);}
  catch (error) {if (error instanceof Error && error.message.includes('nome è già usato')) throw new NameTakenError();throw error;}
}
export async function removePlayerFromRoom(roomId: string, playerUid: string): Promise<void> {
  await roomCommand(roomId, 'removePlayer', [playerUid]);
}
export async function deleteRoom(roomId: string): Promise<void> {await roomCommand(roomId, 'deleteRoom');}
/** Compatibility for the lobby: the actual reset and game switch are one server transaction. */
export async function resetPlayersToCore(_roomId: string): Promise<void> {}
/** Disabled legacy transport: retained only for the archived Lupus source. */
export async function touchRoom(_roomId: string, _updates: Record<string, unknown>): Promise<void> {
  throw new Error('Questo gioco non è disponibile');
}
export function subscribeToRoom(roomId: string, callback: (room: CoreRoom | null) => void, onError: (error: unknown) => void = () => {}): () => void {
  const stop=roomConnection.subscribe(roomId,room=>{rememberRoom(roomId,room);callback(room);},onError);
  return ()=>{stop();rememberRoom(roomId,null);};
}
