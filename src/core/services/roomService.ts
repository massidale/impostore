import { ref, set, onValue, off, update, remove, get } from 'firebase/database';
import { database } from '../../../config/firebase';
import { CoreRoom, CorePlayer } from '../types/room';

export function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return roomId;
}

/**
 * Multi-path update that always bumps `rooms/{roomId}/updatedAt`.
 * Use this for every mutation on a room so the cleanup job can
 * detect stale rooms via last-modification time.
 */
export async function touchRoom(
  roomId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await update(ref(database), {
    ...updates,
    [`rooms/${roomId}/updatedAt`]: Date.now(),
  });
}

/**
 * Creates a new room.
 *
 * `authUid` is the Firebase Auth UID, used as `hostId` so the RTDB rule that
 * gates room deletion (`auth.uid === hostId`) keeps working. `hostClientId`
 * is the stable per-device identifier used as the key of the host's player
 * record — decoupling identity from auth so a host who loses their tab can
 * still find their record back (the room delete permission may be lost, but
 * the game continues).
 */
export async function createRoom(
  authUid: string,
  hostClientId: string,
  currentGameId: string,
  hostName: string
): Promise<string> {
  const roomId = generateRoomId();
  const now = Date.now();

  const roomData: CoreRoom = {
    id: roomId,
    status: 'lobby',
    hostId: authUid,
    createdAt: now,
    updatedAt: now,
    currentGameId,
    players: {
      [hostClientId]: {
        joinedAt: now,
        name: hostName.trim(),
        isHost: true,
      },
    },
  };

  await set(ref(database, `rooms/${roomId}`), roomData);

  return roomId;
}

export class NameTakenError extends Error {
  constructor() {
    super('Questo nome è già usato nella stanza');
    this.name = 'NameTakenError';
  }
}

/**
 * Adds a player keyed by `clientId`. If the room status is `active` (game in
 * progress) the player is flagged `waiting:true` so the active game ignores
 * them and the UI shows a "waiting for next round" screen. The flag is
 * cleared by each plugin's `endGame` so they join automatically on the
 * next round.
 */
export async function addPlayerToRoom(
  roomId: string,
  clientId: string,
  playerName?: string
): Promise<void> {
  const trimmed = (playerName ?? '').trim();

  const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
  if (!roomSnapshot.exists()) throw new Error('Stanza non trovata');
  const room = roomSnapshot.val() as CoreRoom;
  const players = (room.players ?? {}) as Record<string, CorePlayer>;

  // Already in this room — silent no-op (the rejoin path).
  if (players[clientId]) return;

  if (trimmed.length > 0) {
    const wanted = trimmed.toLowerCase();
    for (const [uid, p] of Object.entries(players)) {
      if (uid === clientId) continue;
      if ((p.name ?? '').trim().toLowerCase() === wanted) {
        throw new NameTakenError();
      }
    }
  }

  const isActive = room.status === 'active';
  const record: CorePlayer = {
    joinedAt: Date.now(),
    name: trimmed,
    isHost: false,
  };
  if (isActive) record.waiting = true;

  await touchRoom(roomId, {
    [`rooms/${roomId}/players/${clientId}`]: record,
  });
}

export async function removePlayerFromRoom(
  roomId: string,
  playerUid: string
): Promise<void> {
  await touchRoom(roomId, {
    [`rooms/${roomId}/players/${playerUid}`]: null,
  });
}

export async function deleteRoom(roomId: string): Promise<void> {
  await remove(ref(database, `rooms/${roomId}`));
}

/**
 * Strip all per-player game-specific fields, keeping only the CorePlayer shape.
 * Used when switching game inside a room so that leftover plugin-specific
 * fields (role, score, …) don't leak into the next game.
 */
export async function resetPlayersToCore(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}/players`));
  if (!snapshot.exists()) return;

  const players = snapshot.val() as Record<string, CorePlayer & Record<string, unknown>>;
  const updates: Record<string, CorePlayer> = {};

  for (const [uid, p] of Object.entries(players)) {
    updates[`rooms/${roomId}/players/${uid}`] = {
      joinedAt: p.joinedAt,
      name: p.name ?? '',
      isHost: p.isHost ?? false,
    };
  }

  await touchRoom(roomId, updates);
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: CoreRoom | null) => void
): () => void {
  const roomRef = ref(database, `rooms/${roomId}`);

  onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as CoreRoom);
    } else {
      callback(null);
    }
  });

  return () => {
    off(roomRef);
  };
}
