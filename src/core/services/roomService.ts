import { ref, onValue, get } from 'firebase/database';
import { auth, database } from '../../../config/firebase';
import { CoreRoom } from '../types/room';
import { roomCommand, rememberRoom } from './roomCommand';

export async function createRoom(_authUid: string, _hostClientId: string, _currentGameId: string, hostName: string): Promise<string> {
  const result = await roomCommand(null, 'createRoom', [hostName.trim()]);
  return result.roomId;
}
export async function fetchRoom(roomId: string): Promise<CoreRoom | null> {
  if (!/^[A-Z0-9]{6}$/.test(roomId) || !auth.currentUser) return null;
  const own = await get(ref(database, `roomsV2/${roomId}/views/${auth.currentUser.uid}`));
  const snapshot = own.exists() ? own : await get(ref(database, `roomsV2/${roomId}/preview`));
  const room = snapshot.exists() ? snapshot.val() as CoreRoom : null;
  rememberRoom(roomId, room);
  return room;
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
export function subscribeToRoom(roomId: string, callback: (room: CoreRoom | null) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid || !/^[A-Z0-9]{6}$/.test(roomId)) {callback(null);return () => {};}
  let preview: CoreRoom | null = null;
  let own: CoreRoom | null = null;
  let previewFetched = false;
  let ownFetched = false;
  const emit = () => {
    if (!previewFetched || !ownFetched) return;
    if (preview?.players?.[uid] && !own) return;
    const room = preview ? (preview.players?.[uid] ? own : preview) : null;
    rememberRoom(roomId, room);callback(room);
  };
  const stopPreview = onValue(ref(database, `roomsV2/${roomId}/preview`), s => {preview=s.val();previewFetched=true;emit();}, () => {preview=null;previewFetched=true;emit();});
  const stopOwn = onValue(ref(database, `roomsV2/${roomId}/views/${uid}`), s => {own=s.val();ownFetched=true;emit();}, () => {own=null;ownFetched=true;emit();});
  return () => {stopPreview();stopOwn();rememberRoom(roomId,null);};
}
