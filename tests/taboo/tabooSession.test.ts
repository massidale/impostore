import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceDeck,
  buildTeams,
  describerForTurn,
  drawDeck,
  nextTurn,
  pickStartTeam,
  wordKey,
} from '../../src/games/taboo/services/tabooPure.ts';
import type { TabooCard, TeamId } from '../../src/games/taboo/types.ts';

/**
 * Higher-level simulation of a Taboo room, mirroring how `tabooLogic.ts`
 * stitches the pure helpers together: `startTabooGame` draws a deck out of the
 * words the room hasn't seen yet, every resolved card (and the one still on
 * screen when the turn ends) is consumed, and `usedWords` lives on the room —
 * not on the match — so it survives from one game to the next.
 *
 * The Firebase orchestration around these primitives is a handful of
 * multi-path writes, so exercising them in sequence covers the invariants that
 * matter to players: no repeated words, no card handed over to the next
 * describer, no fixed opener.
 */

interface Room {
  usedWords: Record<string, true>;
}

interface Match {
  deck: TabooCard[];
  cursor: number;
  turnOrder: { blue: string[]; red: string[] };
  startTeam: TeamId;
  turnNumber: number;
  currentTeam: TeamId;
  describerUid: string;
  turnsPerTeam: number;
}

function card(word: string): TabooCard {
  return { word, taboo: [`${word}-1`, `${word}-2`] };
}

function startMatch(
  room: Room,
  params: {
    allCards: TabooCard[];
    uids: string[];
    manual?: Record<string, TeamId> | null;
    turnsPerTeam: number;
    random?: () => number;
  }
): Match {
  const random = params.random ?? Math.random;
  const { turnOrder } = buildTeams(params.uids, params.manual ?? null, random);
  const startTeam = pickStartTeam(random);
  const { deck, cycleReset } = drawDeck(params.allCards, room.usedWords, random);
  if (cycleReset) room.usedWords = {};

  return {
    deck,
    cursor: 0,
    turnOrder,
    startTeam,
    turnNumber: 0,
    currentTeam: startTeam,
    describerUid: describerForTurn(turnOrder[startTeam], 0),
    turnsPerTeam: params.turnsPerTeam,
  };
}

function currentWord(match: Match): string {
  return match.deck[match.cursor].word;
}

/** Mirrors the card consumption shared by resolveTabooCard and endTabooTurn. */
function consumeCard(room: Room, match: Match, allCards: TabooCard[]): string | null {
  const step = advanceDeck({ deck: match.deck, cursor: match.cursor, allCards });
  if (step.deck) {
    match.deck = step.deck;
    // A new cycle wipes the room history: only the word just seen stays out.
    room.usedWords = step.consumedWord ? { [wordKey(step.consumedWord)]: true } : {};
  } else if (step.consumedWord) {
    room.usedWords[wordKey(step.consumedWord)] = true;
  }
  match.cursor = step.cursor;
  return step.consumedWord;
}

/**
 * Mirrors endTabooTurn: the card still on screen is discarded, then the
 * describer/team rotate (or the match ends).
 */
function endTurn(room: Room, match: Match, allCards: TabooCard[]): boolean {
  consumeCard(room, match, allCards);

  const next = nextTurn({
    turnNumber: match.turnNumber,
    turnsPerTeam: match.turnsPerTeam,
    turnOrder: match.turnOrder,
    startTeam: match.startTeam,
  });
  if (next.kind === 'results') return true;

  match.turnNumber = next.turnNumber;
  match.currentTeam = next.team;
  match.describerUid = next.describerUid;
  return false;
}

/** Plays one turn: `cards` resolved by the describer, then the timer runs out. */
function playTurn(
  room: Room,
  match: Match,
  allCards: TabooCard[],
  cards: number
): { shown: string[]; over: boolean } {
  const shown: string[] = [];
  for (let i = 0; i < cards; i++) {
    shown.push(currentWord(match));
    consumeCard(room, match, allCards);
  }
  shown.push(currentWord(match));
  return { shown, over: endTurn(room, match, allCards) };
}

function deckOf(size: number): TabooCard[] {
  return Array.from({ length: size }, (_, i) => card(`word-${i}`));
}

const UIDS = ['p1', 'p2', 'p3', 'p4'];
const MANUAL: Record<string, TeamId> = { p1: 'blue', p2: 'blue', p3: 'red', p4: 'red' };

test('session: the card left on screen when time runs out is not handed to the next describer', () => {
  const allCards = deckOf(40);
  const room: Room = { usedWords: {} };
  const match = startMatch(room, { allCards, uids: UIDS, turnsPerTeam: 3 });

  for (let i = 0; i < 4; i++) {
    currentWord(match);
    consumeCard(room, match, allCards);
  }
  const leftOnScreen = currentWord(match);

  endTurn(room, match, allCards);

  assert.notEqual(currentWord(match), leftOnScreen);
  assert.equal(room.usedWords[wordKey(leftOnScreen)], true);
});

test('session: a whole match never shows the same word twice', () => {
  const allCards = deckOf(120);
  const room: Room = { usedWords: {} };
  const match = startMatch(room, { allCards, uids: UIDS, turnsPerTeam: 3 });

  const shown: string[] = [];
  for (let over = false; !over; ) {
    const turn = playTurn(room, match, allCards, 8);
    shown.push(...turn.shown);
    over = turn.over;
  }

  assert.equal(shown.length, 6 * 9); // 6 turns × (8 resolved + 1 discarded)
  assert.equal(new Set(shown).size, shown.length);
});

test('session: words used in a match stay out for the next match of the same room', () => {
  const allCards = deckOf(120);
  const room: Room = { usedWords: {} };

  const shown: string[] = [];
  for (let game = 0; game < 2; game++) {
    const match = startMatch(room, { allCards, uids: UIDS, turnsPerTeam: 3 });
    for (let over = false; !over; ) {
      const turn = playTurn(room, match, allCards, 8);
      shown.push(...turn.shown);
      over = turn.over;
    }
  }

  assert.equal(shown.length, 108);
  assert.equal(new Set(shown).size, 108, 'no word repeats across matches in the same room');
});

test('session: once the words run out they come back, reshuffled', () => {
  // 20 cards, 2 turns per team → 4 turns × (5 resolved + 1 discarded) = 24 cards:
  // the pool is exhausted mid-match and has to recycle.
  const allCards = deckOf(20);
  const room: Room = { usedWords: {} };
  const match = startMatch(room, { allCards, uids: UIDS, turnsPerTeam: 2 });

  const shown: string[] = [];
  for (let over = false; !over; ) {
    const turn = playTurn(room, match, allCards, 5);
    shown.push(...turn.shown);
    over = turn.over;
  }

  assert.equal(shown.length, 24);
  // The first 20 are the full set, no repeats — then the recycled ones start.
  assert.equal(new Set(shown.slice(0, 20)).size, 20);
  // A recycled word never lands right after itself.
  for (let i = 1; i < shown.length; i++) {
    assert.notEqual(shown[i], shown[i - 1]);
  }
});

test('session: the opening describer changes from one match to the next', () => {
  const allCards = deckOf(400);
  const room: Room = { usedWords: {} };

  const openers = new Set<string>();
  const openingTeams = new Set<TeamId>();
  for (let game = 0; game < 30; game++) {
    const match = startMatch(room, {
      allCards,
      uids: UIDS,
      manual: MANUAL,
      turnsPerTeam: 3,
    });
    openers.add(match.describerUid);
    openingTeams.add(match.startTeam);
  }

  assert.equal(openingTeams.size, 2, 'both teams get to open a match');
  assert.equal(openers.size > 2, true, 'every player can be the first describer');
});
