import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('[fb-debug] getReactNativePersistence is:', typeof getReactNativePersistence);

const firebaseConfig = {
  apiKey: 'AIzaSyBvMwcuua_w44Ylouf0s_jNzu_j7YgJktc',
  authDomain: 'gameshub-6b1ce.firebaseapp.com',
  databaseURL: 'https://gameshub-6b1ce-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'gameshub-6b1ce',
  storageBucket: 'gameshub-6b1ce.firebasestorage.app',
  messagingSenderId: '901289726448',
  appId: '1:901289726448:web:f86d13049b9d132e4c0d35',
  measurementId: 'G-RN2WF80N2Q',
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

// On React Native we must register the Auth component via initializeAuth with
// an explicit persistence. `getReactNativePersistence` lives in firebase/auth's
// RN bundle (resolved by Metro's react-native condition); types are augmented
// in src/types/firebase-auth.d.ts.
function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    // Fast Refresh re-evaluates this module; second call throws 'already-initialized'.
    const code = (e as { code?: string })?.code;
    if (code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw e;
  }
}

export const auth = createAuth();
export default app;
