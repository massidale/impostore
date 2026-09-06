import { CoreRoom } from '../../src/core/types/room';
import { filterActivePlayerUids } from '../../src/core/services/playerSelection';
import { TabooGameState, TabooRoomData, TabooSettings, TurnStats } from '../../src/games/taboo/types';

import {
  CardOutcome,
  DeckAdvance,
  advanceDeck,
  applyOutcome,
  buildTeams,
  describerForTurn,
  drawDeck,
  nextTurn,
  pickStartTeam,
  wordKey,
} from '../../src/games/taboo/services/tabooPure';
import type { RoomStore } from '../runtime';

/** Rules execute synchronously inside the server's room transaction. */
export function createTabooCommands(store: RoomStore) {


const EMPTY_TURN_STATS: TurnStats = { correct: 0, taboo: 0, skipped: 0 };

/** Words already shown in the room — persists across matches. */
const usedWordsPath = (roomId: string) => `rooms/${roomId}/gameData/taboo/usedWords`;

function readUsedWords(roomData: CoreRoom<TabooGameState>): TabooRoomData['usedWords'] {
  return (roomData.gameData?.taboo as TabooRoomData | undefined)?.usedWords ?? {};
}

/**
 * Firebase paths for a card that has just been consumed: the cursor moves on,
 * the word is marked as used for the whole room, and when the pool ran dry the
 * freshly reshuffled deck replaces the old one.
 */
function cardAdvanceUpdates(
  roomId: string,
  step: DeckAdvance
): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/gameState/cursor`]: step.cursor,
  };
  const key = step.consumedWord ? wordKey(step.consumedWord) : '';

  if (step.deck) {
    // New cycle: the room history restarts from the word just seen.
    updates[`rooms/${roomId}/gameState/deck`] = step.deck;
    updates[usedWordsPath(roomId)] = key ? { [key]: true } : null;
  } else if (key) {
    updates[`${usedWordsPath(roomId)}/${key}`] = true;
  }

  return updates;
}

/** Consumes the card currently on screen. */
function consumeCurrentCard(
  roomId: string,
  gameState: TabooGameState
): Record<string, unknown> {
  return cardAdvanceUpdates(
    roomId,
    advanceDeck({
      deck: gameState.deck,
      cursor: gameState.cursor ?? 0,
      allCards: store.dictionary("taboo"),
    })
  );
}

function initTabooGame(
  roomId: string,
  settings: TabooSettings
): void {
  const initialState: TabooGameState = {
    phase: 'setup',
    turnSeconds: settings?.turnSeconds ?? 60,
    turnsPerTeam: settings?.turnsPerTeam ?? 3,
    maxSkips: settings?.maxSkips ?? 3,
    teamMode: settings?.teamMode ?? 'auto',
    manualTeams: settings?.teamMode === 'manual' ? settings?.manualTeams ?? null : null,
  };

  store.update(roomId, {
    [`rooms/${roomId}/currentGameId`]: 'taboo',
    [`rooms/${roomId}/gameState`]: initialState,
  });
}

function startTabooGame(roomId: string): void {
  const snapshot = store.read(`rooms/${roomId}`);
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<TabooGameState>;

  if (roomData.status !== 'lobby' || roomData.gameState?.phase !== 'setup') {
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

  // Words already seen in this room stay out until the pool is exhausted.
  const { deck, cycleReset } = drawDeck(store.dictionary("taboo"), readUsedWords(roomData));
  if (deck.length === 0) throw new Error('Nessuna carta disponibile');

  // Both the opening team and the describer rotation are drawn at random,
  // so the same player doesn't always start.
  const firstTeam = pickStartTeam();
  const describerUid = describerForTurn(turnOrder[firstTeam], 0);

  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/status`]: 'active',
    [`rooms/${roomId}/gameState/phase`]: 'ready',
    [`rooms/${roomId}/gameState/deck`]: deck,
    [`rooms/${roomId}/gameState/cursor`]: 0,
    [`rooms/${roomId}/gameState/scores`]: { blue: 0, red: 0 },
    [`rooms/${roomId}/gameState/teams`]: teams,
    [`rooms/${roomId}/gameState/turnOrder`]: turnOrder,
    [`rooms/${roomId}/gameState/turnNumber`]: 0,
    [`rooms/${roomId}/gameState/startTeam`]: firstTeam,
    [`rooms/${roomId}/gameState/currentTeam`]: firstTeam,
    [`rooms/${roomId}/gameState/describerUid`]: describerUid,
    [`rooms/${roomId}/gameState/turnEndsAt`]: null,
    [`rooms/${roomId}/gameState/turnStats`]: EMPTY_TURN_STATS,
    [`rooms/${roomId}/gameState/lastTurn`]: null,
  };

  // Every word had been used: the set comes back reshuffled, history cleared.
  if (cycleReset) updates[usedWordsPath(roomId)] = null;

  store.update(roomId, updates);
}

/** Called by the describer to kick off their turn (starts the timer). */
function beginTabooTurn(roomId: string): void {
  const snapshot = store.read(`rooms/${roomId}/gameState`);
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const gameState = snapshot.val() as TabooGameState;
  if (gameState.phase !== 'ready') return; // idempotent

  store.update(roomId, {
    [`rooms/${roomId}/gameState/phase`]: 'turn',
    [`rooms/${roomId}/gameState/turnEndsAt`]: store.now + gameState.turnSeconds * 1000,
    [`rooms/${roomId}/gameState/turnStats`]: EMPTY_TURN_STATS,
    [`rooms/${roomId}/gameState/lastAction`]: null,
  });
}

/**
 * Records the outcome of the current card and advances to the next one.
 * `correct`/`skip` come from the describer, `taboo` from the opposing team's
 * buzzer (or the describer self-reporting).
 */
function resolveTabooCard(
  roomId: string,
  outcome: CardOutcome
): void {
  const snapshot = store.read(`rooms/${roomId}/gameState`);
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

  store.update(roomId, {
    [`rooms/${roomId}/gameState/scores`]: scores,
    [`rooms/${roomId}/gameState/turnStats`]: newStats,
    [`rooms/${roomId}/gameState/lastAction`]: { outcome, team },
    ...consumeCurrentCard(roomId, gameState),
  });
}

/**
 * Single-level undo for the describer: reverts the last card outcome
 * (score, stats and cursor) recorded during the running turn.
 */
function undoTabooCard(roomId: string): void {
  const snapshot = store.read(`rooms/${roomId}/gameState`);
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

  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/gameState/scores`]: scores,
    [`rooms/${roomId}/gameState/turnStats`]: newStats,
    [`rooms/${roomId}/gameState/lastAction`]: null,
  };

  // Put the previous card back and let it be drawn again. At cursor 0 the deck
  // has just been reshuffled, so only the score and the stats can be reverted.
  const cursor = gameState.cursor ?? 0;
  const restored = cursor > 0 ? gameState.deck?.[cursor - 1] : null;
  const restoredKey = restored ? wordKey(restored.word) : '';
  if (restored) {
    updates[`rooms/${roomId}/gameState/cursor`] = cursor - 1;
    if (restoredKey) updates[`${usedWordsPath(roomId)}/${restoredKey}`] = null;
  }

  store.update(roomId, updates);
}

/**
 * Closes the running turn: stores the recap, rotates to the next
 * describer/team or moves to results when both teams played all turns.
 * Idempotent — safe to call from multiple clients when the timer expires.
 */
function endTabooTurn(roomId: string): void {
  const snapshot = store.read(`rooms/${roomId}/gameState`);
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

  // The card still on screen when the time ran out is discarded: the next
  // describer must never inherit it.
  const discarded = consumeCurrentCard(roomId, gameState);

  const next = nextTurn({
    turnNumber,
    turnsPerTeam: gameState.turnsPerTeam,
    turnOrder,
    startTeam: gameState.startTeam ?? 'blue',
  });

  if (next.kind === 'results') {
    store.update(roomId, {
      [`rooms/${roomId}/gameState/phase`]: 'results',
      [`rooms/${roomId}/gameState/turnEndsAt`]: null,
      [`rooms/${roomId}/gameState/lastAction`]: null,
      [`rooms/${roomId}/gameState/lastTurn`]: lastTurn,
      ...discarded,
    });
    return;
  }

  store.update(roomId, {
    [`rooms/${roomId}/gameState/phase`]: 'ready',
    [`rooms/${roomId}/gameState/turnEndsAt`]: null,
    [`rooms/${roomId}/gameState/turnNumber`]: next.turnNumber,
    [`rooms/${roomId}/gameState/currentTeam`]: next.team,
    [`rooms/${roomId}/gameState/describerUid`]: next.describerUid,
    [`rooms/${roomId}/gameState/turnStats`]: EMPTY_TURN_STATS,
    [`rooms/${roomId}/gameState/lastAction`]: null,
    [`rooms/${roomId}/gameState/lastTurn`]: lastTurn,
    ...discarded,
  });
}

function endTabooGame(roomId: string): void {
  const snapshot = store.read(`rooms/${roomId}`);
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
    [`rooms/${roomId}/gameState/startTeam`]: null,
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

  store.update(roomId, updates);
}

return { initTabooGame, startTabooGame, beginTabooTurn, resolveTabooCard, undoTabooCard, endTabooTurn, endTabooGame };
}
