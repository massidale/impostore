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

export async function createRoom(
  hostId: string,
  currentGameId: string,
  hostName: string
): Promise<string> {
  const roomId = generateRoomId();
  const now = Date.now();

  const roomData: CoreRoom = {
    id: roomId,
    status: 'lobby',
    hostId,
    createdAt: now,
    updatedAt: now,
    currentGameId,
    players: {
      [hostId]: {
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

export async function addPlayerToRoom(
  roomId: string,
  playerUid: string,
  playerName?: string
): Promise<void> {
  const trimmed = (playerName ?? '').trim();

  if (trimmed.length > 0) {
    const snapshot = await get(ref(database, `rooms/${roomId}/players`));
    if (snapshot.exists()) {
      const players = snapshot.val() as Record<string, CorePlayer>;
      const wanted = trimmed.toLowerCase();
      for (const [uid, p] of Object.entries(players)) {
        if (uid === playerUid) continue;
        if ((p.name ?? '').trim().toLowerCase() === wanted) {
          throw new NameTakenError();
        }
      }
    }
  }

  await touchRoom(roomId, {
    [`rooms/${roomId}/players/${playerUid}`]: {
      joinedAt: Date.now(),
      name: trimmed,
      isHost: false,
    },
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
