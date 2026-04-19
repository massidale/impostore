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
  apiKey: 'AIzaSyA6vCGiQmXvynNGVwqf7jVvEemCBWHPUNM',
  authDomain: 'impostore-c0ef1.firebaseapp.com',
  databaseURL: 'https://impostore-c0ef1-default-rtdb.europe-west1.firebasedatabase.app/',
  projectId: 'impostore-c0ef1',
  storageBucket: 'impostore-c0ef1.firebasestorage.app',
  messagingSenderId: '346509804532',
  appId: '1:346509804532:web:893a26f3e25f86426fefa1',
  measurementId: 'G-ED7VYPWEF1',
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
