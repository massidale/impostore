import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from '@firebase/auth';
import { auth } from '../../../config/firebase';

/**
 * Ensures the current device is signed in anonymously with Firebase Auth.
 * Returns the current UID once available, `null` while the sign-in is in flight.
 *
 * The UID acts as the stable identity used both in the app (hostId / playerId)
 * and in the RTDB security rules (`auth.uid`).
 */
export function useAnonymousAuth(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('Anonymous sign-in failed', err);
        });
      }
    });
    return unsubscribe;
  }, []);

  return uid;
}
