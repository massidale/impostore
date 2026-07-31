/**
 * Pure helpers for the Taboo game. Kept JSON- and Firebase-free so tests can
 * import them directly under Node's strip-types loader. `random` is injected
 * everywhere so tests can be deterministic.
 */

import type { Scores, TabooCard, TeamId } from '../types';

export type CardOutcome = 'correct' | 'taboo' | 'skip';

export interface TeamAssignment {
  teams: Record<string, TeamId>;
  turnOrder: { blue: string[]; red: string[] };
}

export interface NextTurnResult {
  kind: 'turn';
  team: TeamId;
  describerUid: string;
  turnNumber: number;
}

export interface GameOverResult {
  kind: 'results';
}

/** Fisher–Yates shuffle on a copy. */
export function shuffleArray<T>(arr: T[], random: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffles the players and deals them alternately into the two teams,
 * so rosters never differ by more than one player.
 */
export function splitTeams(
  uids: string[],
  random: () => number = Math.random
): TeamAssignment {
  const shuffled = shuffleArray(uids, random);
  const teams: Record<string, TeamId> = {};
  const turnOrder = { blue: [] as string[], red: [] as string[] };

  shuffled.forEach((uid, i) => {
    const team: TeamId = i % 2 === 0 ? 'blue' : 'red';
    teams[uid] = team;
    turnOrder[team].push(uid);
  });

  return { teams, turnOrder };
}

/**
 * Builds the team assignment from the host's manual choices (if any).
 * Players missing from the manual map — e.g. joined after the host
 * assigned teams — are dealt to the smaller roster; stale entries for
 * players who left are ignored. With no manual map it falls back to
 * the balanced random split.
 */
export function buildTeams(
  uids: string[],
  manual: Partial<Record<string, TeamId>> | null | undefined,
  random: () => number = Math.random
): TeamAssignment {
  if (!manual || Object.keys(manual).length === 0) {
    return splitTeams(uids, random);
  }

  const teams: Record<string, TeamId> = {};
  const turnOrder = { blue: [] as string[], red: [] as string[] };
  const unassigned: string[] = [];

  for (const uid of uids) {
    const t = manual[uid];
    if (t === 'blue' || t === 'red') {
      teams[uid] = t;
      turnOrder[t].push(uid);
    } else {
      unassigned.push(uid);
    }
  }

  for (const uid of shuffleArray(unassigned, random)) {
    const t: TeamId = turnOrder.blue.length <= turnOrder.red.length ? 'blue' : 'red';
    teams[uid] = t;
    turnOrder[t].push(uid);
  }

  // The rosters drive the describer rotation, so shuffle them: the host picks
  // who is on which team, never who describes first.
  return {
    teams,
    turnOrder: {
      blue: shuffleArray(turnOrder.blue, random),
      red: shuffleArray(turnOrder.red, random),
    },
  };
}

/** Coin flip for the team that opens the match. */
export function pickStartTeam(random: () => number = Math.random): TeamId {
  return random() < 0.5 ? 'blue' : 'red';
}

/** The opening team plays even turns, the other one odd turns. */
export function teamForTurn(turnNumber: number, startTeam: TeamId = 'blue'): TeamId {
  const other: TeamId = startTeam === 'blue' ? 'red' : 'blue';
  return turnNumber % 2 === 0 ? startTeam : other;
}

/** Round-robin describer within a team roster (wraps). */
export function describerForTurn(order: string[], teamTurnIndex: number): string {
  return order[teamTurnIndex % order.length];
}

/**
 * Computes the turn that follows the just-completed `turnNumber`,
 * or signals the end of the game once both teams played `turnsPerTeam` turns.
 */
export function nextTurn(params: {
  turnNumber: number;
  turnsPerTeam: number;
  turnOrder: { blue: string[]; red: string[] };
  startTeam?: TeamId;
}): NextTurnResult | GameOverResult {
  const next = params.turnNumber + 1;
  if (next >= params.turnsPerTeam * 2) {
    return { kind: 'results' };
  }
  const team = teamForTurn(next, params.startTeam ?? 'blue');
  const teamTurnIndex = Math.floor(next / 2);
  return {
    kind: 'turn',
    team,
    describerUid: describerForTurn(params.turnOrder[team], teamTurnIndex),
    turnNumber: next,
  };
}

/** Correct guess +1, taboo violation −1, skip 0. Returns a new object. */
export function applyOutcome(scores: Scores, team: TeamId, outcome: CardOutcome): Scores {
  const delta = outcome === 'correct' ? 1 : outcome === 'taboo' ? -1 : 0;
  return { ...scores, [team]: scores[team] + delta };
}

// ── Deck drawing ──
//
// A room remembers every word it has already shown (`gameData/taboo/usedWords`,
// keyed by `wordKey`) so a new match never serves them again. When the pool
// runs dry the whole set comes back, reshuffled.

/**
 * Identity of a word: case- and spacing-insensitive, and safe to use as a
 * Firebase key (which cannot contain `.`, `$`, `#`, `[`, `]` or `/`).
 */
export function wordKey(word: string): string {
  return word.trim().toLowerCase().replace(/[.$#[\]/]/g, '_');
}

export type UsedWords = string[] | Record<string, unknown> | null | undefined;

function usedKeys(used: UsedWords): Set<string> {
  if (!used) return new Set();
  const raw = Array.isArray(used) ? used : Object.keys(used);
  return new Set(raw.map(wordKey));
}

/** Keeps the first card of each word — the source may list a word twice. */
function dedupeByWord(cards: TabooCard[]): TabooCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    const key = wordKey(c.word);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface DrawnDeck {
  deck: TabooCard[];
  /** True when every word had been used and the set was recycled. */
  cycleReset: boolean;
}

/**
 * Builds a shuffled deck out of the words the room hasn't shown yet.
 * `avoidWord` (the card just seen) is always left out, so a recycled set
 * never opens on the word still fresh in everyone's mind.
 */
export function drawDeck(
  allCards: TabooCard[],
  usedWords: UsedWords,
  random: () => number = Math.random,
  avoidWord?: string | null
): DrawnDeck {
  const avoid = avoidWord ? wordKey(avoidWord) : null;
  const pickable = avoid ? allCards.filter((c) => wordKey(c.word) !== avoid) : allCards;
  const pool = pickable.length > 0 ? pickable : allCards;

  const used = usedKeys(usedWords);
  const fresh = pool.filter((c) => !used.has(wordKey(c.word)));
  const cycleReset = fresh.length === 0;

  return {
    deck: dedupeByWord(shuffleArray(cycleReset ? pool : fresh, random)),
    cycleReset,
  };
}

export interface DeckAdvance {
  /** Word of the card just consumed — to be marked as used on the room. */
  consumedWord: string | null;
  cursor: number;
  /** Set only when the deck ran out and a fresh cycle was drawn. */
  deck: TabooCard[] | null;
}

/**
 * Consumes the card under the cursor and moves to the next one. The deck was
 * drawn from the unused pool, so playing it to the end means every word has
 * been shown: a new, reshuffled cycle starts.
 */
export function advanceDeck(params: {
  deck: TabooCard[] | null | undefined;
  cursor: number;
  allCards: TabooCard[];
  random?: () => number;
}): DeckAdvance {
  const deck = params.deck ?? [];
  const cursor = params.cursor ?? 0;
  if (deck.length === 0) return { consumedWord: null, cursor: 0, deck: null };

  const consumedWord = deck[cursor]?.word ?? null;
  const nextCursor = cursor + 1;
  if (nextCursor < deck.length) {
    return { consumedWord, cursor: nextCursor, deck: null };
  }

  const { deck: fresh } = drawDeck(params.allCards, null, params.random, consumedWord);
  return { consumedWord, cursor: 0, deck: fresh };
}

export function winnerFromScores(scores: Scores): TeamId | 'tie' {
  if (scores.blue > scores.red) return 'blue';
  if (scores.red > scores.blue) return 'red';
  return 'tie';
}
