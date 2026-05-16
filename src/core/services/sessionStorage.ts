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

const webAdapter: StorageAdapter = {
  async getItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  },
};

const rnAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const defaultAdapter: StorageAdapter = Platform.OS === 'web' ? webAdapter : rnAdapter;

export const sessionStore: SessionStore = makeSessionStore(defaultAdapter);
