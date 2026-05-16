import { ref, get } from 'firebase/database';
import { database } from '../../../../config/firebase';
import { CoreRoom } from '../../../core/types/room';
import { touchRoom } from '../../../core/services/roomService';
import { filterActivePlayerUids } from '../../../core/services/playerSelection';
import {
  IndovinaGameState,
  IndovinaPlayerState,
  IndovinaSettings,
  WordSource,
  NOT_ENOUGH_WORDS_ERROR,
} from '../types';
import { getActiveWords, pickFreshWords, pickRandom } from './indovinaWordService';

export class NotEnoughWordsError extends Error {
  available: number;
  required: number;
  code = NOT_ENOUGH_WORDS_ERROR;
  constructor(available: number, required: number) {
    super(
      `Parole esaurite: ne servono ${required}, ne restano ${available}. ` +
        'Genera nuove parole con l\'AI o passa alla modalità "Scelte dai giocatori".'
    );
    this.name = 'NotEnoughWordsError';
    this.available = available;
    this.required = required;
  }
}

export async function initIndovinaGame(
  roomId: string,
  settings: IndovinaSettings
): Promise<void> {
  const wordSource: WordSource = settings?.wordSource === 'players' ? 'players' : 'random';

  // Preserve session-level used-words tracking when the user just tweaks
  // settings (e.g. toggles wordSource): the dictionary hasn't changed, so the
  // exclusion list should still apply. It only resets on dictionary swap
  // (handled by resetIndovinaUsedWords) or game switch.
  const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
  const existing = snapshot.exists() ? (snapshot.val() as Partial<IndovinaGameState>) : null;
  const preservedUsedWords = Array.isArray(existing?.usedWords) ? existing!.usedWords! : [];

  const initialState: IndovinaGameState = {
    phase: 'setup',
    wordSource,
    usedWords: preservedUsedWords,
    firstPlayerId: null,
  };
  await touchRoom(roomId, {
    [`rooms/${roomId}/currentGameId`]: 'indovina',
    [`rooms/${roomId}/gameState`]: initialState,
  });
}

/**
 * Clears the used-words tracker. Called by the settings panel after the
 * dictionary changes (AI generation / reset to default), so a brand-new pool
 * starts unused even mid-session.
 */
export async function resetIndovinaUsedWords(roomId: string): Promise<void> {
  await touchRoom(roomId, {
    [`rooms/${roomId}/gameState/usedWords`]: [],
  });
}

export async function startIndovinaGame(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<IndovinaGameState>;

  if (roomData.status !== 'lobby' && roomData.gameState?.phase !== 'setup') {
    throw new Error('La partita è già iniziata');
  }

  // Skip players flagged `waiting` — they joined mid-game.
  const playerUids = filterActivePlayerUids(roomData);
  if (playerUids.length === 0) throw new Error('Nessun giocatore');

  const wordSource = roomData.gameState?.wordSource ?? 'random';

  if (wordSource === 'players') {
    // Players will submit their own words. Move to collecting phase.
    const updates: { [key: string]: unknown } = {
      [`rooms/${roomId}/status`]: 'active',
      [`rooms/${roomId}/gameState/phase`]: 'collecting',
      [`rooms/${roomId}/gameState/firstPlayerId`]: null,
    };
    // Clear any leftover submissions/words from a prior round
    playerUids.forEach((uid) => {
      updates[`rooms/${roomId}/players/${uid}/submittedWord`] = null;
      updates[`rooms/${roomId}/players/${uid}/word`] = null;
    });
    await touchRoom(roomId, updates);
    return;
  }

  // Random mode: assign words from the dictionary right away, skipping any
  // already used during this session.
  const usedWords = roomData.gameState?.usedWords ?? [];
  const result = pickFreshWords(getActiveWords(), usedWords, playerUids.length);
  if (!result.ok) {
    throw new NotEnoughWordsError(result.available, result.required);
  }

  const firstPlayerId = pickRandom(playerUids);

  const updates: { [key: string]: unknown } = {
    [`rooms/${roomId}/status`]: 'active',
    [`rooms/${roomId}/gameState/phase`]: 'playing',
    [`rooms/${roomId}/gameState/firstPlayerId`]: firstPlayerId,
    [`rooms/${roomId}/gameState/usedWords`]: [...usedWords, ...result.picked],
  };

  playerUids.forEach((uid, idx) => {
    updates[`rooms/${roomId}/players/${uid}/word`] = result.picked[idx];
  });

  await touchRoom(roomId, updates);
}

export async function submitPlayerWord(
  roomId: string,
  playerUid: string,
  word: string
): Promise<void> {
  const trimmed = word.trim();
  if (!trimmed) throw new Error('Parola vuota');
  if (trimmed.length > 60) throw new Error('Parola troppo lunga (max 60 caratteri)');

  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<IndovinaGameState>;
  if (roomData.gameState?.phase !== 'collecting') {
    throw new Error('Non è il momento di inviare la parola');
  }

  await touchRoom(roomId, {
    [`rooms/${roomId}/players/${playerUid}/submittedWord`]: trimmed,
  });

  // Auto-finalize when everyone has submitted. The check below is best-effort:
  // if two clients race here finalizeCollecting itself is idempotent (no-op when
  // phase is no longer 'collecting').
  const updatedSnapshot = await get(ref(database, `rooms/${roomId}`));
  const updatedData = updatedSnapshot.val() as CoreRoom<IndovinaGameState>;
  if (updatedData?.gameState?.phase !== 'collecting') return;

  const playerUids = Object.keys(updatedData.players || {});
  const submittedCount = playerUids.filter((uid) => {
    const p = updatedData.players?.[uid] as IndovinaPlayerState | undefined;
    return !!p?.submittedWord?.trim();
  }).length;

  if (playerUids.length >= 2 && submittedCount >= playerUids.length) {
    await finalizeCollecting(roomId);
  }
}

/**
 * Distributes submitted words via Sattolo's algorithm — a single-cycle
 * permutation guaranteeing nobody receives their own submission.
 * Called by the host once everyone has submitted.
 */
export async function finalizeCollecting(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) return;
  const roomData = snapshot.val() as CoreRoom<IndovinaGameState>;
  // Idempotent: silently no-op if another client already finalized.
  if (roomData.gameState?.phase !== 'collecting') return;

  const playerUids = Object.keys(roomData.players || {});
  if (playerUids.length < 2) return;

  const submissions: string[] = [];
  for (const uid of playerUids) {
    const player = roomData.players?.[uid] as IndovinaPlayerState | undefined;
    const submitted = player?.submittedWord?.trim();
    if (!submitted) return; // not everyone submitted yet
    submissions.push(submitted);
  }

  // Sattolo: produces a derangement (no fixed points).
  const shuffled = submissions.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const firstPlayerId = pickRandom(playerUids);

  const updates: { [key: string]: unknown } = {
    [`rooms/${roomId}/gameState/phase`]: 'playing',
    [`rooms/${roomId}/gameState/firstPlayerId`]: firstPlayerId,
  };
  playerUids.forEach((uid, idx) => {
    updates[`rooms/${roomId}/players/${uid}/word`] = shuffled[idx];
    updates[`rooms/${roomId}/players/${uid}/submittedWord`] = null;
  });

  await touchRoom(roomId, updates);
}

export async function endIndovinaGame(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<IndovinaGameState>;
  const playerUids = Object.keys(roomData.players || {});

  const updates: { [key: string]: unknown } = {
    [`rooms/${roomId}/status`]: 'lobby',
    [`rooms/${roomId}/gameState/phase`]: 'setup',
    [`rooms/${roomId}/gameState/firstPlayerId`]: null,
  };

  playerUids.forEach((uid) => {
    updates[`rooms/${roomId}/players/${uid}/word`] = null;
    updates[`rooms/${roomId}/players/${uid}/submittedWord`] = null;
    // Promote waiting spectators to full players for the next round.
    updates[`rooms/${roomId}/players/${uid}/waiting`] = null;
  });

  await touchRoom(roomId, updates);
}
