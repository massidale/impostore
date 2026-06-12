import { ref, get } from 'firebase/database';
import { database } from '../../../../config/firebase';
import { CoreRoom } from '../../../core/types/room';
import { touchRoom } from '../../../core/services/roomService';
import { filterActivePlayerUids } from '../../../core/services/playerSelection';
import { TabooGameState, TabooSettings, TurnStats } from '../types';
import { getActiveCards } from './tabooCardService';
import {
  CardOutcome,
  applyOutcome,
  buildTeams,
  describerForTurn,
  nextTurn,
  shuffleArray,
  teamForTurn,
} from './tabooPure';

const EMPTY_TURN_STATS: TurnStats = { correct: 0, taboo: 0, skipped: 0 };

export async function initTabooGame(
  roomId: string,
  settings: TabooSettings
): Promise<void> {
  const initialState: TabooGameState = {
    phase: 'setup',
    turnSeconds: settings?.turnSeconds ?? 60,
    turnsPerTeam: settings?.turnsPerTeam ?? 3,
    maxSkips: settings?.maxSkips ?? 3,
    teamMode: settings?.teamMode ?? 'auto',
    manualTeams: settings?.teamMode === 'manual' ? settings?.manualTeams ?? null : null,
  };

  await touchRoom(roomId, {
    [`rooms/${roomId}/currentGameId`]: 'taboo',
    [`rooms/${roomId}/gameState`]: initialState,
  });
}

export async function startTabooGame(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<TabooGameState>;

  if (roomData.status !== 'lobby' && roomData.gameState?.phase !== 'setup') {
    throw new Error('La partita è già iniziata');
  }

  // Skip players flagged `waiting` — they joined mid-game.
  const playerUids = filterActivePlayerUids(roomData);
  if (playerUids.length < 4) {
    throw new Error('Servono almeno 4 giocatori (2 per squadra)');
  }

  const manual =
    roomData.gameState?.teamMode === 'manual' ? roomData.gameState?.manualTeams : null;
  const { teams, turnOrder } = buildTeams(playerUids, manual);
  if (turnOrder.blue.length < 2 || turnOrder.red.length < 2) {
    throw new Error(
      'Ogni squadra deve avere almeno 2 giocatori. Sistema le squadre nelle impostazioni.'
    );
  }

  const deck = shuffleArray(getActiveCards());
  if (deck.length === 0) throw new Error('Nessuna carta disponibile');

  const firstTeam = teamForTurn(0);
  const describerUid = describerForTurn(turnOrder[firstTeam], 0);

  await touchRoom(roomId, {
    [`rooms/${roomId}/status`]: 'active',
    [`rooms/${roomId}/gameState/phase`]: 'ready',
    [`rooms/${roomId}/gameState/deck`]: deck,
    [`rooms/${roomId}/gameState/cursor`]: 0,
    [`rooms/${roomId}/gameState/scores`]: { blue: 0, red: 0 },
    [`rooms/${roomId}/gameState/teams`]: teams,
    [`rooms/${roomId}/gameState/turnOrder`]: turnOrder,
    [`rooms/${roomId}/gameState/turnNumber`]: 0,
    [`rooms/${roomId}/gameState/currentTeam`]: firstTeam,
    [`rooms/${roomId}/gameState/describerUid`]: describerUid,
    [`rooms/${roomId}/gameState/turnEndsAt`]: null,
    [`rooms/${roomId}/gameState/turnStats`]: EMPTY_TURN_STATS,
    [`rooms/${roomId}/gameState/lastTurn`]: null,
  });
}

/** Called by the describer to kick off their turn (starts the timer). */
export async function beginTabooTurn(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const gameState = snapshot.val() as TabooGameState;
  if (gameState.phase !== 'ready') return; // idempotent

  await touchRoom(roomId, {
    [`rooms/${roomId}/gameState/phase`]: 'turn',
    [`rooms/${roomId}/gameState/turnEndsAt`]: Date.now() + gameState.turnSeconds * 1000,
    [`rooms/${roomId}/gameState/turnStats`]: EMPTY_TURN_STATS,
    [`rooms/${roomId}/gameState/lastAction`]: null,
  });
}

/**
 * Records the outcome of the current card and advances to the next one.
 * `correct`/`skip` come from the describer, `taboo` from the opposing team's
 * buzzer (or the describer self-reporting).
 */
export async function resolveTabooCard(
  roomId: string,
  outcome: CardOutcome
): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const gameState = snapshot.val() as TabooGameState;
  if (gameState.phase !== 'turn') return; // turn already over — ignore late taps

  const stats = gameState.turnStats ?? EMPTY_TURN_STATS;

  // Skips are limited per turn — ignore taps past the budget.
  if (outcome === 'skip' && stats.skipped >= (gameState.maxSkips ?? 3)) return;

  const team = gameState.currentTeam ?? 'blue';
  const scores = applyOutcome(gameState.scores ?? { blue: 0, red: 0 }, team, outcome);

  const newStats: TurnStats = {
    correct: stats.correct + (outcome === 'correct' ? 1 : 0),
    taboo: stats.taboo + (outcome === 'taboo' ? 1 : 0),
    skipped: stats.skipped + (outcome === 'skip' ? 1 : 0),
  };

  // Wrap around when the deck is exhausted: cards may repeat, the game
  // never blocks mid-turn.
  const deckSize = gameState.deck?.length ?? 0;
  const nextCursor = deckSize > 0 ? ((gameState.cursor ?? 0) + 1) % deckSize : 0;

  await touchRoom(roomId, {
    [`rooms/${roomId}/gameState/scores`]: scores,
    [`rooms/${roomId}/gameState/turnStats`]: newStats,
    [`rooms/${roomId}/gameState/cursor`]: nextCursor,
    [`rooms/${roomId}/gameState/lastAction`]: { outcome, team },
  });
}

/**
 * Single-level undo for the describer: reverts the last card outcome
 * (score, stats and cursor) recorded during the running turn.
 */
export async function undoTabooCard(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const gameState = snapshot.val() as TabooGameState;
  if (gameState.phase !== 'turn') return;
  const last = gameState.lastAction;
  if (!last) return;

  const scores = { ...(gameState.scores ?? { blue: 0, red: 0 }) };
  if (last.outcome === 'correct') scores[last.team] -= 1;
  if (last.outcome === 'taboo') scores[last.team] += 1;

  const stats = gameState.turnStats ?? EMPTY_TURN_STATS;
  const newStats: TurnStats = {
    correct: Math.max(0, stats.correct - (last.outcome === 'correct' ? 1 : 0)),
    taboo: Math.max(0, stats.taboo - (last.outcome === 'taboo' ? 1 : 0)),
    skipped: Math.max(0, stats.skipped - (last.outcome === 'skip' ? 1 : 0)),
  };

  const deckSize = gameState.deck?.length ?? 0;
  const prevCursor =
    deckSize > 0 ? ((gameState.cursor ?? 0) - 1 + deckSize) % deckSize : 0;

  await touchRoom(roomId, {
    [`rooms/${roomId}/gameState/scores`]: scores,
    [`rooms/${roomId}/gameState/turnStats`]: newStats,
    [`rooms/${roomId}/gameState/cursor`]: prevCursor,
    [`rooms/${roomId}/gameState/lastAction`]: null,
  });
}

/**
 * Closes the running turn: stores the recap, rotates to the next
 * describer/team or moves to results when both teams played all turns.
 * Idempotent — safe to call from multiple clients when the timer expires.
 */
export async function endTabooTurn(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}/gameState`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const gameState = snapshot.val() as TabooGameState;
  if (gameState.phase !== 'turn') return; // someone already ended it

  const turnNumber = gameState.turnNumber ?? 0;
  const turnOrder = gameState.turnOrder ?? { blue: [], red: [] };
  const stats = gameState.turnStats ?? EMPTY_TURN_STATS;

  const lastTurn = {
    ...stats,
    team: gameState.currentTeam ?? 'blue',
    describerUid: gameState.describerUid ?? '',
  };

  const next = nextTurn({
    turnNumber,
    turnsPerTeam: gameState.turnsPerTeam,
    turnOrder,
  });

  if (next.kind === 'results') {
    await touchRoom(roomId, {
      [`rooms/${roomId}/gameState/phase`]: 'results',
      [`rooms/${roomId}/gameState/turnEndsAt`]: null,
      [`rooms/${roomId}/gameState/lastAction`]: null,
      [`rooms/${roomId}/gameState/lastTurn`]: lastTurn,
    });
    return;
  }

  await touchRoom(roomId, {
    [`rooms/${roomId}/gameState/phase`]: 'ready',
    [`rooms/${roomId}/gameState/turnEndsAt`]: null,
    [`rooms/${roomId}/gameState/turnNumber`]: next.turnNumber,
    [`rooms/${roomId}/gameState/currentTeam`]: next.team,
    [`rooms/${roomId}/gameState/describerUid`]: next.describerUid,
    [`rooms/${roomId}/gameState/turnStats`]: EMPTY_TURN_STATS,
    [`rooms/${roomId}/gameState/lastAction`]: null,
    [`rooms/${roomId}/gameState/lastTurn`]: lastTurn,
  });
}

export async function endTabooGame(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<TabooGameState>;
  const playerUids = Object.keys(roomData.players || {});

  const updates: { [key: string]: unknown } = {
    [`rooms/${roomId}/status`]: 'lobby',
    [`rooms/${roomId}/gameState/phase`]: 'setup',
    [`rooms/${roomId}/gameState/deck`]: null,
    [`rooms/${roomId}/gameState/cursor`]: null,
    [`rooms/${roomId}/gameState/scores`]: null,
    [`rooms/${roomId}/gameState/teams`]: null,
    [`rooms/${roomId}/gameState/turnOrder`]: null,
    [`rooms/${roomId}/gameState/turnNumber`]: null,
    [`rooms/${roomId}/gameState/currentTeam`]: null,
    [`rooms/${roomId}/gameState/describerUid`]: null,
    [`rooms/${roomId}/gameState/turnEndsAt`]: null,
    [`rooms/${roomId}/gameState/turnStats`]: null,
    [`rooms/${roomId}/gameState/lastAction`]: null,
    [`rooms/${roomId}/gameState/lastTurn`]: null,
  };

  playerUids.forEach((uid) => {
    // Promote waiting spectators to full players for the next round.
    updates[`rooms/${roomId}/players/${uid}/waiting`] = null;
  });

  await touchRoom(roomId, updates);
}
