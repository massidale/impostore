import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeSessionStore, type StorageAdapter, type SessionStore } from './sessionStoragePure';

export type { StorageAdapter, SessionStore, RoomSession } from './sessionStoragePure';
export { makeSessionStore } from './sessionStoragePure';

/**
 * Default cross-platform session store. We can't rely on Firebase Auth's UID
 * surviving tab-close on iOS Safari (IndexedDB gets evicted in several
 * configurations), so player identity is keyed on a stable `clientId`
 * generated once and persisted locally. Firebase Auth still runs for the
 * RTDB rule check (`auth != null`); it just isn't the source of identity.
 */

/**
 * Test hook: opening the app with `?cid=<name>` (web only) namespaces every
 * storage key with that value, giving the tab its own player identity and
 * room-session. Lets one browser simulate N players via N tabs:
 *   http://localhost:8081?room=ABC123&cid=p2
 * Reopening the same cid restores the same player. Without the param the
 * behavior is unchanged (one identity per browser profile).
 */
function storageNamespace(): string {
  if (typeof window === 'undefined') return '';
  const cid = new URLSearchParams(window.location.search).get('cid');
  if (!cid) return '';
  // Keep the suffix key-safe and bounded.
  return ':' + cid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

const webAdapter: StorageAdapter = {
  async getItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key + storageNamespace());
  },
  async setItem(key, value) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key + storageNamespace(), value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key + storageNamespace());
  },
};

const rnAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const defaultAdapter: StorageAdapter = Platform.OS === 'web' ? webAdapter : rnAdapter;

export const sessionStore: SessionStore = makeSessionStore(defaultAdapter);
