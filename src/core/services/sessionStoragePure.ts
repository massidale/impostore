/**
 * Pure (platform-independent) session-store factory. Kept apart from
 * `sessionStorage.ts` so Node tests can import it without pulling in
 * `react-native` (whose entry uses Flow syntax that Node can't parse).
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const CLIENT_ID_KEY = 'gameshub:clientId';
const ROOM_SESSION_PREFIX = 'gameshub:roomSession:';

export interface RoomSession {
  name: string;
}

export interface SessionStore {
  getClientId(): Promise<string>;
  getRoomSession(roomId: string): Promise<RoomSession | null>;
  setRoomSession(roomId: string, session: RoomSession): Promise<void>;
  clearRoomSession(roomId: string): Promise<void>;
}

function uuidv4(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function makeSessionStore(adapter: StorageAdapter): SessionStore {
  let cachedClientId: string | null = null;

  return {
    async getClientId() {
      if (cachedClientId) return cachedClientId;
      const existing = await adapter.getItem(CLIENT_ID_KEY);
      if (existing && existing.length > 0) {
        cachedClientId = existing;
        return existing;
      }
      const next = uuidv4();
      await adapter.setItem(CLIENT_ID_KEY, next);
      cachedClientId = next;
      return next;
    },

    async getRoomSession(roomId) {
      const raw = await adapter.getItem(ROOM_SESSION_PREFIX + roomId);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as RoomSession;
        if (parsed && typeof parsed.name === 'string') return parsed;
        return null;
      } catch {
        return null;
      }
    },

    async setRoomSession(roomId, session) {
      await adapter.setItem(ROOM_SESSION_PREFIX + roomId, JSON.stringify(session));
    },

    async clearRoomSession(roomId) {
      await adapter.removeItem(ROOM_SESSION_PREFIX + roomId);
    },
  };
}
