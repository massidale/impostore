import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import {
  getAuth,
  connectAuthEmulator,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
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

if (emulatorHost) {
  firebaseConfig.projectId = 'demo-gameshub';
  firebaseConfig.databaseURL = 'https://demo-gameshub-default-rtdb.firebaseio.com';
  firebaseConfig.authDomain = 'demo-gameshub.firebaseapp.com';
}

const devClient = Platform.OS === 'web' && process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('cid')?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)
  : null;
const app = initializeApp(firebaseConfig, devClient ? `dev-${devClient}` : '[DEFAULT]');

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
if (emulatorHost) {
  connectDatabaseEmulator(database, emulatorHost, 9000);
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}
export default app;
