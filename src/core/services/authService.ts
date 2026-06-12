import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth } from '../../../config/firebase';
import { database } from '../../../config/firebase';

/** Maps Firebase Auth error codes to user-facing Italian messages. */
function friendlyAuthError(e: unknown): Error {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'Email non valida.',
    'auth/email-already-in-use': 'Esiste già un account con questa email.',
    'auth/weak-password': 'Password troppo debole: servono almeno 6 caratteri.',
    'auth/missing-password': 'Inserisci la password.',
    'auth/wrong-password': 'Email o password errati.',
    'auth/user-not-found': 'Email o password errati.',
    'auth/invalid-credential': 'Email o password errati.',
    'auth/invalid-login-credentials': 'Email o password errati.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
    'auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
    'auth/operation-not-allowed':
      'La registrazione via email non è attiva sul server. Riprova più tardi.',
  };
  return new Error(map[code] || 'Errore di autenticazione. Riprova.');
}

/**
 * RTDB key for the global nickname registry (`nicknames/{key} = uid`).
 * Lowercased so uniqueness is case-insensitive; characters that are invalid
 * in an RTDB path are stripped.
 */
function nicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/[.#$[\]/]/g, '');
}

/** Registry entry: `nicknames/{key} = { uid, email }` (email enables nickname login). */
interface NicknameRecord {
  uid: string;
  email: string;
}

function parseNicknameRecord(value: unknown): NicknameRecord | null {
  if (typeof value === 'string') return { uid: value, email: '' }; // legacy shape
  if (value && typeof value === 'object' && 'uid' in value) {
    const v = value as { uid?: unknown; email?: unknown };
    if (typeof v.uid === 'string') {
      return { uid: v.uid, email: typeof v.email === 'string' ? v.email : '' };
    }
  }
  return null;
}

async function fetchNicknameRecord(nickname: string): Promise<NicknameRecord | null> {
  const key = nicknameKey(nickname);
  if (!key) return null;
  const snap = await get(ref(database, `nicknames/${key}`));
  return snap.exists() ? parseNicknameRecord(snap.val()) : null;
}

/**
 * True when the nickname is already reserved by ANOTHER account.
 * A read failure (e.g. rules not deployed yet) doesn't block registration —
 * uniqueness simply isn't enforced until the `nicknames` rules are live.
 */
async function isNicknameTaken(nickname: string): Promise<boolean> {
  try {
    const record = await fetchNicknameRecord(nickname);
    return !!record && record.uid !== auth.currentUser?.uid;
  } catch (e) {
    console.warn('[auth] nickname check failed (rules not deployed?)', e);
    return false;
  }
}

async function reserveNickname(nickname: string, uid: string, email: string): Promise<void> {
  const key = nicknameKey(nickname);
  if (!key) return;
  try {
    await set(ref(database, `nicknames/${key}`), { uid, email });
  } catch (e) {
    console.warn('[auth] nickname reservation failed (rules not deployed?)', e);
  }
}

/**
 * Creates the account, sets the (unique) nickname and sends the
 * verification email.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  nickname: string
): Promise<void> {
  const nick = nickname.trim();
  if (await isNicknameTaken(nick)) {
    throw new Error('Questo nickname è già in uso. Scegline un altro.');
  }
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: nick });
    await sendEmailVerification(cred.user);
  } catch (e) {
    throw friendlyAuthError(e);
  }
  await reserveNickname(nick, cred.user.uid, email.trim());
  // updateProfile does NOT fire onAuthStateChanged: reload the profile and
  // force a token refresh so useAuthUser (onIdTokenChanged) picks up the
  // new displayName immediately.
  await cred.user.reload();
  await cred.user.getIdToken(true).catch(() => {});
}

/**
 * Self-heal for accounts created before the nickname registry existed (or
 * while its rules weren't deployed): after a successful login, write the
 * missing `nicknames/{nick} = { uid, email }` record so nickname login
 * works from the next time on.
 */
async function ensureNicknameRecord(): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || !user.displayName || !user.email) return;
  try {
    const existing = await fetchNicknameRecord(user.displayName);
    if (existing && existing.uid !== user.uid) return; // taken by someone else
    if (existing?.uid === user.uid && existing.email) return; // already complete
    await set(ref(database, `nicknames/${nicknameKey(user.displayName)}`), {
      uid: user.uid,
      email: user.email,
    });
  } catch (e) {
    console.warn('[auth] nickname backfill failed (rules not deployed?)', e);
  }
}

/**
 * Email-only login (the nickname-as-identifier path is parked for now).
 * The registry self-heal still runs so the uniqueness check keeps working
 * for accounts created before the registry existed.
 */
export async function loginWithEmail(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    throw friendlyAuthError(e);
  }
  await ensureNicknameRecord();
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Nessun account collegato.');
  try {
    await sendEmailVerification(user);
  } catch (e) {
    throw friendlyAuthError(e);
  }
}

/** Signs out; the auth hook will fall back to a fresh anonymous session. */
export async function logout(): Promise<void> {
  await signOut(auth);
}
