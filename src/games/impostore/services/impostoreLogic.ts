import { ref, get } from 'firebase/database';
import { database } from '../../../../config/firebase';
import { CoreRoom } from '../../../core/types/room';
import { touchRoom } from '../../../core/services/roomService';
import { ImpostoreGameState, ImpostorePlayerState, Winner } from '../types';
import { assignRoles, selectFirstPlayer } from './roleService';
import { pickWordForSession } from './wordService';
import { computeVoteOutcome } from './impostoreVotePure';
import { filterActivePlayerUids } from '../../../core/services/playerSelection';

const DEFAULT_VOTING_SECONDS = 60;

export async function initImpostoreGame(
    roomId: string,
    numImpostors: number,
    numClowns: number,
    hintEnabled: boolean,
    hintOnlyFirst: boolean,
    votingSeconds: number = DEFAULT_VOTING_SECONDS
  ): Promise<void> {
    // Preserve session-level usedWords across settings tweaks (same pattern
    // as initIndovinaGame): the dictionary hasn't changed just because the
    // user toggled an option in the lobby. The list is cleared explicitly
    // on dictionary swap via resetImpostoreUsedWords.
    const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
    const existing = snapshot.exists() ? (snapshot.val() as Partial<ImpostoreGameState>) : null;
    const preservedUsedWords = Array.isArray(existing?.usedWords) ? existing!.usedWords! : [];

    const initialState: ImpostoreGameState = {
        phase: 'setup',
        word: '',
        numImpostors,
        numClowns,
        hintEnabled,
        hintOnlyFirst,
        votingSeconds,
        usedWords: preservedUsedWords,
    };

    await touchRoom(roomId, {
        [`rooms/${roomId}/currentGameId`]: 'impostore',
        [`rooms/${roomId}/gameState`]: initialState,
    });
}

/**
 * Clears the session's used-words tracker. Called by the settings panel
 * after the dictionary changes (AI generation / reset to default).
 */
export async function resetImpostoreUsedWords(roomId: string): Promise<void> {
    await touchRoom(roomId, {
        [`rooms/${roomId}/gameState/usedWords`]: [],
    });
}

export async function startImpostoreGame(roomId: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}`));
    if (!snapshot.exists()) throw new Error('Stanza non trovata');
    const roomData = snapshot.val() as CoreRoom<ImpostoreGameState>;

    if (roomData.status !== 'lobby' && roomData.gameState?.phase !== 'setup') {
        throw new Error('La partita è già iniziata');
    }

    // Skip players flagged `waiting` — they joined mid-game and will only
    // participate in the next round.
    const playerUids = filterActivePlayerUids(roomData);
    if (playerUids.length === 0) throw new Error('Nessun giocatore');

    const gameState = roomData.gameState!;
    const roles = assignRoles(playerUids, gameState.numImpostors, gameState.numClowns || 0);
    const firstPlayerId = selectFirstPlayer(playerUids);

    const previousWord = gameState.word || null;
    const usedWords = gameState.usedWords ?? [];
    const pick = pickWordForSession(usedWords, previousWord);
    const hint = gameState.hintEnabled ? pick.hint : null;

    const updates: { [key: string]: any } = {
      [`rooms/${roomId}/status`]: 'active',
      [`rooms/${roomId}/gameState/phase`]: 'playing',
      [`rooms/${roomId}/gameState/word`]: pick.word,
      [`rooms/${roomId}/gameState/firstPlayerId`]: firstPlayerId,
      [`rooms/${roomId}/gameState/hint`]: hint || null,
      [`rooms/${roomId}/gameState/usedWords`]: pick.newUsed,
    };

    roles.forEach((role, uid) => {
      updates[`rooms/${roomId}/players/${uid}/role`] = role;
      updates[`rooms/${roomId}/players/${uid}/isFirst`] = uid === firstPlayerId;
      updates[`rooms/${roomId}/players/${uid}/revealed`] = false;
      updates[`rooms/${roomId}/players/${uid}/eliminated`] = false;
    });

    await touchRoom(roomId, updates);
}

export async function endImpostoreGame(roomId: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}`));
    if (!snapshot.exists()) throw new Error('Stanza non trovata');
    const roomData = snapshot.val() as CoreRoom<ImpostoreGameState>;
    const playerUids = Object.keys(roomData.players || {});

    const updates: { [key: string]: any } = {
        [`rooms/${roomId}/status`]: 'lobby',
        [`rooms/${roomId}/gameState/phase`]: 'setup',
        [`rooms/${roomId}/gameState/firstPlayerId`]: null,
        [`rooms/${roomId}/gameState/word`]: '',
        [`rooms/${roomId}/gameState/hint`]: null,
        [`rooms/${roomId}/gameState/votes`]: null,
        [`rooms/${roomId}/gameState/runoffCandidates`]: null,
        [`rooms/${roomId}/gameState/votingEndsAt`]: null,
        [`rooms/${roomId}/gameState/eliminatedPlayer`]: null,
        [`rooms/${roomId}/gameState/eliminatedRole`]: null,
        [`rooms/${roomId}/gameState/winner`]: null,
        [`rooms/${roomId}/gameState/impostorGuess`]: null,
    };

    playerUids.forEach((uid) => {
        updates[`rooms/${roomId}/players/${uid}/role`] = null;
        updates[`rooms/${roomId}/players/${uid}/isFirst`] = false;
        updates[`rooms/${roomId}/players/${uid}/revealed`] = false;
        updates[`rooms/${roomId}/players/${uid}/eliminated`] = false;
        // Promote waiting spectators to full players for the next round.
        updates[`rooms/${roomId}/players/${uid}/waiting`] = null;
    });

    await touchRoom(roomId, updates);
}

export async function markPlayerAsRevealed(roomId: string, playerUid: string): Promise<void> {
    await touchRoom(roomId, {
      [`rooms/${roomId}/players/${playerUid}/revealed`]: true,
    });
}

export async function startVoting(roomId: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
    const gameState = snapshot.exists() ? (snapshot.val() as ImpostoreGameState) : null;
    const votingSeconds = gameState?.votingSeconds ?? DEFAULT_VOTING_SECONDS;

    await touchRoom(roomId, {
      [`rooms/${roomId}/gameState/phase`]: 'voting',
      [`rooms/${roomId}/gameState/votes`]: null,
      [`rooms/${roomId}/gameState/runoffCandidates`]: null,
      [`rooms/${roomId}/gameState/winner`]: null,
      [`rooms/${roomId}/gameState/impostorGuess`]: null,
      [`rooms/${roomId}/gameState/votingEndsAt`]: Date.now() + votingSeconds * 1000,
    });
}

export async function castVote(roomId: string, voterUid: string, votedUid: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}`));
    if (!snapshot.exists()) throw new Error('Stanza non trovata');

    const roomData = snapshot.val() as CoreRoom<ImpostoreGameState>;
    if (roomData.gameState?.phase !== 'voting') throw new Error('Non è il momento di votare');

    const voter = roomData.players?.[voterUid] as ImpostorePlayerState | undefined;
    if (voter?.eliminated) throw new Error('I giocatori eliminati non possono votare');

    const voted = roomData.players?.[votedUid] as ImpostorePlayerState | undefined;
    if (voted?.eliminated) throw new Error('Non puoi votare un giocatore eliminato');

    const runoff = roomData.gameState.runoffCandidates;
    if (runoff && runoff.length > 0 && !runoff.includes(votedUid)) {
      throw new Error('Voto non valido in ballottaggio');
    }

    await touchRoom(roomId, {
      [`rooms/${roomId}/gameState/votes/${voterUid}`]: votedUid,
    });

    const updatedSnapshot = await get(ref(database, `rooms/${roomId}`));
    const updatedData = updatedSnapshot.val() as CoreRoom<ImpostoreGameState>;

    const alivePlayers = Object.values(updatedData.players || {}).filter(
      (p) => !(p as ImpostorePlayerState).eliminated
    );
    const playerCount = alivePlayers.length;
    const voteCount = updatedData.gameState?.votes ? Object.keys(updatedData.gameState.votes).length : 0;

    if (voteCount >= playerCount) {
      await evaluateVotingRound(roomId);
    }
}

async function evaluateVotingRound(roomId: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}`));
    const roomData = snapshot.val() as CoreRoom<ImpostoreGameState>;

    if (!roomData || !roomData.gameState?.votes || !roomData.players) throw new Error('Dati mancanti');

    const gameState = roomData.gameState;
    const outcome = computeVoteOutcome({
      votes: gameState.votes!,
      runoffCandidates: gameState.runoffCandidates ?? null,
      firstPlayerId: gameState.firstPlayerId ?? null,
    });

    if (outcome.kind === 'eliminate') {
      return finalizeElimination(roomId, outcome.uid);
    }

    // Tied first round → start runoff with the tied candidates (fresh timer).
    const votingSeconds = gameState.votingSeconds ?? DEFAULT_VOTING_SECONDS;
    await touchRoom(roomId, {
      [`rooms/${roomId}/gameState/votes`]: null,
      [`rooms/${roomId}/gameState/runoffCandidates`]: outcome.candidates,
      [`rooms/${roomId}/gameState/votingEndsAt`]: Date.now() + votingSeconds * 1000,
    });
}

/**
 * Closes the voting round when the timer expires: late voters simply aren't
 * counted. With zero votes cast the round is cancelled and play resumes.
 * Idempotent — safe to call from multiple clients (no-op unless still voting).
 */
export async function closeVotingByTimeout(roomId: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
    if (!snapshot.exists()) return;
    const gameState = snapshot.val() as ImpostoreGameState;
    if (gameState.phase !== 'voting') return;
    if (!gameState.votingEndsAt || Date.now() < gameState.votingEndsAt) return;

    const votes = gameState.votes ?? {};
    if (Object.keys(votes).length === 0) {
      // Nobody voted: cancel the round and go back to playing.
      await touchRoom(roomId, {
        [`rooms/${roomId}/gameState/phase`]: 'playing',
        [`rooms/${roomId}/gameState/votes`]: null,
        [`rooms/${roomId}/gameState/runoffCandidates`]: null,
        [`rooms/${roomId}/gameState/votingEndsAt`]: null,
      });
      return;
    }

    await evaluateVotingRound(roomId);
}

async function finalizeElimination(roomId: string, eliminatedUid: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}`));
    const roomData = snapshot.val() as CoreRoom<ImpostoreGameState>;
    const eliminatedPlayer = roomData.players?.[eliminatedUid] as ImpostorePlayerState | undefined;
    const eliminatedRole = eliminatedPlayer?.role || null;

    let nextPhase: ImpostoreGameState['phase'];
    let winner: Winner = null;

    if (eliminatedRole === 'clown') {
      nextPhase = 'results';
      winner = 'clown';
    } else if (eliminatedRole === 'impostor') {
      nextPhase = 'impostor_guess';
      winner = null;
    } else {
      nextPhase = 'results';
      winner = 'impostor';
    }

    await touchRoom(roomId, {
      [`rooms/${roomId}/gameState/phase`]: nextPhase,
      [`rooms/${roomId}/gameState/eliminatedPlayer`]: eliminatedUid,
      [`rooms/${roomId}/gameState/eliminatedRole`]: eliminatedRole,
      [`rooms/${roomId}/gameState/winner`]: winner,
      [`rooms/${roomId}/gameState/runoffCandidates`]: null,
      [`rooms/${roomId}/gameState/votingEndsAt`]: null,
      [`rooms/${roomId}/players/${eliminatedUid}/eliminated`]: true,
    });
}

export async function submitImpostorGuess(roomId: string, guess: string): Promise<void> {
    const snapshot = await get(ref(database, `rooms/${roomId}`));
    const roomData = snapshot.val() as CoreRoom<ImpostoreGameState>;

    if (roomData.gameState?.phase !== 'impostor_guess') throw new Error('Non è il momento di indovinare');

    const isCorrect = guess.toLowerCase().trim() === roomData.gameState.word.toLowerCase().trim();

    if (isCorrect) {
      await touchRoom(roomId, {
        [`rooms/${roomId}/gameState/phase`]: 'results',
        [`rooms/${roomId}/gameState/impostorGuess`]: guess,
        [`rooms/${roomId}/gameState/winner`]: 'impostor',
      });
      return;
    }

    const aliveImpostors = Object.values(roomData.players || {}).filter(
      (p) => {
        const ps = p as ImpostorePlayerState;
        return ps.role === 'impostor' && !ps.eliminated;
      }
    ).length;

    if (aliveImpostors === 0) {
      await touchRoom(roomId, {
        [`rooms/${roomId}/gameState/phase`]: 'results',
        [`rooms/${roomId}/gameState/impostorGuess`]: guess,
        [`rooms/${roomId}/gameState/winner`]: 'civilians',
      });
      return;
    }

    await touchRoom(roomId, {
      [`rooms/${roomId}/gameState/phase`]: 'playing',
      [`rooms/${roomId}/gameState/impostorGuess`]: guess,
      [`rooms/${roomId}/gameState/votes`]: null,
      [`rooms/${roomId}/gameState/runoffCandidates`]: null,
      [`rooms/${roomId}/gameState/winner`]: null,
    });
}

export async function updateImpostoreSettings(
    roomId: string,
    settings: {
        numImpostors?: number;
        numClowns?: number;
        hintEnabled?: boolean;
        hintOnlyFirst?: boolean;
        votingSeconds?: number;
    }
) {
    const updates: Record<string, unknown> = {};
    if (settings.numImpostors !== undefined) updates[`rooms/${roomId}/gameState/numImpostors`] = settings.numImpostors;
    if (settings.numClowns !== undefined) updates[`rooms/${roomId}/gameState/numClowns`] = settings.numClowns;
    if (settings.hintEnabled !== undefined) updates[`rooms/${roomId}/gameState/hintEnabled`] = settings.hintEnabled;
    if (settings.hintOnlyFirst !== undefined) updates[`rooms/${roomId}/gameState/hintOnlyFirst`] = settings.hintOnlyFirst;
    if (settings.votingSeconds !== undefined) updates[`rooms/${roomId}/gameState/votingSeconds`] = settings.votingSeconds;

    await touchRoom(roomId, updates);
}
