import { useEffect, useState } from 'react';
import { onIdTokenChanged, signInAnonymously, type User } from '@firebase/auth';
import { auth } from '../../../config/firebase';

export interface AuthUser {
  /** Firebase Auth UID (anonymous or registered), null while signing in. */
  uid: string | null;
  /** True for Google / email+password accounts, false for anonymous. */
  isRegistered: boolean;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
}

function fromUser(user: User | null): AuthUser {
  return {
    uid: user?.uid ?? null,
    isRegistered: !!user && !user.isAnonymous,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
    emailVerified: user?.emailVerified ?? false,
  };
}

/**
 * Current auth state. Falls back to an anonymous session when nobody is
 * signed in, so the RTDB rules (`auth != null`) always hold. Registered
 * accounts (Google / email) take over identity persistence: their UID is
 * stable across devices, unlike the per-device clientId.
 */
export function useAuthUser(): AuthUser {
  const [state, setState] = useState<AuthUser>(() => fromUser(auth.currentUser));

  useEffect(() => {
    // onIdTokenChanged ⊇ onAuthStateChanged: it also fires on the forced
    // token refresh after registration, picking up the fresh displayName.
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (user) {
        setState(fromUser(user));
      } else {
        setState(fromUser(null));
        signInAnonymously(auth).catch((err) => {
          console.error('Anonymous sign-in failed', err);
        });
      }
    });
    return unsubscribe;
  }, []);

  return state;
}
