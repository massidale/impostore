import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitTeams,
  buildTeams,
  teamForTurn,
  describerForTurn,
  nextTurn,
  applyOutcome,
  winnerFromScores,
  shuffleArray,
  wordKey,
  drawDeck,
  advanceDeck,
  pickStartTeam,
} from '../../src/games/taboo/services/tabooPure.ts';
import type { TabooCard } from '../../src/games/taboo/types.ts';

// Deterministic RNG so tests aren't coupled to a particular shuffle.
function rngFrom(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const UIDS = ['a', 'b', 'c', 'd', 'e'];

function card(word: string): TabooCard {
  return { word, taboo: [`${word}-1`, `${word}-2`] };
}

const words = (cards: TabooCard[]) => cards.map((c) => c.word).sort();

test('shuffleArray: returns a permutation without mutating the input', () => {
  const input = [1, 2, 3, 4, 5];
  const copy = input.slice();
  const out = shuffleArray(input, rngFrom([0.1, 0.5, 0.9, 0.3]));
  assert.deepEqual(input, copy);
  assert.deepEqual([...out].sort(), [...input].sort());
});

test('splitTeams: every player assigned exactly once, teams balanced', () => {
  const { teams, turnOrder } = splitTeams(UIDS, rngFrom([0.2, 0.7, 0.4, 0.9]));
  const assigned = Object.keys(teams);
  assert.deepEqual(assigned.sort(), [...UIDS].sort());

  const blue = turnOrder.blue;
  const red = turnOrder.red;
  // 5 players → 3 vs 2
  assert.equal(Math.abs(blue.length - red.length), 1);
  assert.equal(blue.length + red.length, UIDS.length);

  // turnOrder must agree with the team map.
  for (const uid of blue) assert.equal(teams[uid], 'blue');
  for (const uid of red) assert.equal(teams[uid], 'red');
});

test('splitTeams: even count → perfectly balanced', () => {
  const { turnOrder } = splitTeams(['a', 'b', 'c', 'd'], rngFrom([0.5]));
  assert.equal(turnOrder.blue.length, 2);
  assert.equal(turnOrder.red.length, 2);
});

test('buildTeams: without manual assignments falls back to a balanced split', () => {
  const { turnOrder } = buildTeams(UIDS, null, rngFrom([0.3, 0.8, 0.1]));
  assert.equal(turnOrder.blue.length + turnOrder.red.length, UIDS.length);
  assert.equal(Math.abs(turnOrder.blue.length - turnOrder.red.length), 1);
});

test('buildTeams: honors the manual assignment exactly', () => {
  const manual = { a: 'blue', b: 'blue', c: 'red', d: 'red' } as const;
  const { teams, turnOrder } = buildTeams(['a', 'b', 'c', 'd'], manual, rngFrom([0.5]));
  assert.deepEqual(teams, manual);
  assert.deepEqual([...turnOrder.blue].sort(), ['a', 'b']);
  assert.deepEqual([...turnOrder.red].sort(), ['c', 'd']);
});

test('buildTeams: players missing from the manual map go to the smaller roster', () => {
  const manual = { a: 'blue', b: 'blue', c: 'red' } as const;
  // d and e joined after the host assigned teams.
  const { teams, turnOrder } = buildTeams(['a', 'b', 'c', 'd', 'e'], manual, rngFrom([0.2, 0.6]));
  assert.equal(teams.a, 'blue');
  assert.equal(teams.b, 'blue');
  assert.equal(teams.c, 'red');
  // Balance: 5 players → 3 vs 2, with red (smaller) filled first.
  assert.equal(turnOrder.red.length >= 2, true);
  assert.equal(turnOrder.blue.length + turnOrder.red.length, 5);
  assert.equal(Math.abs(turnOrder.blue.length - turnOrder.red.length), 1);
});

test('buildTeams: ignores stale manual entries for players no longer in the room', () => {
  const manual = { a: 'blue', gone: 'red' } as const;
  const { teams } = buildTeams(['a', 'b', 'c', 'd'], manual, rngFrom([0.4]));
  assert.equal('gone' in teams, false);
  assert.equal(Object.keys(teams).length, 4);
});

test('teamForTurn: alternates starting from blue', () => {
  assert.equal(teamForTurn(0), 'blue');
  assert.equal(teamForTurn(1), 'red');
  assert.equal(teamForTurn(2), 'blue');
  assert.equal(teamForTurn(3), 'red');
});

test('teamForTurn: alternates from the team that opened the match', () => {
  assert.equal(teamForTurn(0, 'red'), 'red');
  assert.equal(teamForTurn(1, 'red'), 'blue');
  assert.equal(teamForTurn(2, 'red'), 'red');
  assert.equal(teamForTurn(3, 'red'), 'blue');
});

test('pickStartTeam: both teams can open the match', () => {
  assert.equal(pickStartTeam(rngFrom([0.1])), 'blue');
  assert.equal(pickStartTeam(rngFrom([0.9])), 'red');
});

test('describerForTurn: rotates round-robin within the team', () => {
  const order = ['x', 'y', 'z'];
  // Turn numbers for blue: 0, 2, 4, 6 → team turn index 0,1,2,3
  assert.equal(describerForTurn(order, 0), 'x');
  assert.equal(describerForTurn(order, 1), 'y');
  assert.equal(describerForTurn(order, 2), 'z');
  assert.equal(describerForTurn(order, 3), 'x'); // wraps
});

test('nextTurn: produces alternating turns then results', () => {
  const turnOrder = { blue: ['a', 'b'], red: ['c', 'd'] };
  const turnsPerTeam = 2; // 4 total turns: 0..3

  // After turn 0 (blue) → turn 1 is red, described by c.
  const t1 = nextTurn({ turnNumber: 0, turnsPerTeam, turnOrder });
  assert.deepEqual(t1, { kind: 'turn', team: 'red', describerUid: 'c', turnNumber: 1 });

  // After turn 1 → turn 2 blue, second blue player.
  const t2 = nextTurn({ turnNumber: 1, turnsPerTeam, turnOrder });
  assert.deepEqual(t2, { kind: 'turn', team: 'blue', describerUid: 'b', turnNumber: 2 });

  // After turn 2 → turn 3 red, second red player.
  const t3 = nextTurn({ turnNumber: 2, turnsPerTeam, turnOrder });
  assert.deepEqual(t3, { kind: 'turn', team: 'red', describerUid: 'd', turnNumber: 3 });

  // After the last turn → game over.
  const done = nextTurn({ turnNumber: 3, turnsPerTeam, turnOrder });
  assert.deepEqual(done, { kind: 'results' });
});

test('nextTurn: uneven teams wrap the smaller roster', () => {
  const turnOrder = { blue: ['a', 'b'], red: ['c'] };
  // Turn 1 and turn 3 are red — both described by c.
  const t1 = nextTurn({ turnNumber: 0, turnsPerTeam: 2, turnOrder });
  const t3 = nextTurn({ turnNumber: 2, turnsPerTeam: 2, turnOrder });
  assert.equal(t1.kind, 'turn');
  assert.equal(t3.kind, 'turn');
  if (t1.kind === 'turn' && t3.kind === 'turn') {
    assert.equal(t1.describerUid, 'c');
    assert.equal(t3.describerUid, 'c');
  }
});

test('nextTurn: keeps alternating from the team that opened the match', () => {
  const turnOrder = { blue: ['a', 'b'], red: ['c', 'd'] };
  // Red opened, so turn 1 belongs to blue and its first describer.
  const t1 = nextTurn({ turnNumber: 0, turnsPerTeam: 2, turnOrder, startTeam: 'red' });
  assert.deepEqual(t1, { kind: 'turn', team: 'blue', describerUid: 'a', turnNumber: 1 });

  const t2 = nextTurn({ turnNumber: 1, turnsPerTeam: 2, turnOrder, startTeam: 'red' });
  assert.deepEqual(t2, { kind: 'turn', team: 'red', describerUid: 'd', turnNumber: 2 });
});

test('buildTeams: manual rosters are shuffled so the opener is not always the same player', () => {
  const manual = { a: 'blue', b: 'blue', c: 'red', d: 'red' } as const;
  const uids = ['a', 'b', 'c', 'd'];
  // random() === 0 makes Fisher–Yates swap each element with index 0.
  const { turnOrder } = buildTeams(uids, manual, rngFrom([0]));
  assert.deepEqual(turnOrder.blue, ['b', 'a']);
  assert.deepEqual(turnOrder.red, ['d', 'c']);
});

test('applyOutcome: correct +1, taboo −1, skip 0', () => {
  const start = { blue: 0, red: 0 };
  assert.deepEqual(applyOutcome(start, 'blue', 'correct'), { blue: 1, red: 0 });
  assert.deepEqual(applyOutcome(start, 'red', 'taboo'), { blue: 0, red: -1 });
  assert.deepEqual(applyOutcome(start, 'blue', 'skip'), { blue: 0, red: 0 });
  // Input is not mutated.
  assert.deepEqual(start, { blue: 0, red: 0 });
});

test('winnerFromScores: picks the higher score or tie', () => {
  assert.equal(winnerFromScores({ blue: 3, red: 1 }), 'blue');
  assert.equal(winnerFromScores({ blue: -1, red: 0 }), 'red');
  assert.equal(winnerFromScores({ blue: 2, red: 2 }), 'tie');
});

// ── Deck: words already shown in the room never come back ──

test('wordKey: case- and spacing-insensitive, safe as a Firebase key', () => {
  assert.equal(wordKey('Pizza'), wordKey(' pizza '));
  assert.equal(/[.$#[\]/]/.test(wordKey('E.T. #1 [$]/x')), false);
});

test('drawDeck: leaves out the words already used in the room', () => {
  const all = [card('Pizza'), card('Mare'), card('Sole')];
  const { deck, cycleReset } = drawDeck(all, { pizza: true }, rngFrom([0.5]));
  assert.deepEqual(words(deck), ['Mare', 'Sole']);
  assert.equal(cycleReset, false);
});

test('drawDeck: recycles the whole set once every word has been used', () => {
  const all = [card('Pizza'), card('Mare'), card('Sole')];
  const used = { pizza: true, mare: true, sole: true } as const;
  const { deck, cycleReset } = drawDeck(all, used, rngFrom([0.5]));
  assert.deepEqual(words(deck), ['Mare', 'Pizza', 'Sole']);
  assert.equal(cycleReset, true);
});

test('drawDeck: the recycled set never opens on the word just seen', () => {
  const all = [card('Pizza'), card('Mare'), card('Sole')];
  const used = { pizza: true, mare: true, sole: true } as const;
  const { deck } = drawDeck(all, used, rngFrom([0.5]), 'Sole');
  assert.deepEqual(words(deck), ['Mare', 'Pizza']);
});

test('drawDeck: keeps a single card per word when the source repeats one', () => {
  const all = [card('Pizza'), card('Pizza'), card('Mare')];
  const { deck } = drawDeck(all, null, rngFrom([0.5]));
  assert.deepEqual(words(deck), ['Mare', 'Pizza']);
});

test('advanceDeck: consumes the current card and moves on to the next', () => {
  const deck = [card('A'), card('B'), card('C')];
  const step = advanceDeck({ deck, cursor: 0, allCards: deck, random: rngFrom([0.5]) });
  assert.equal(step.consumedWord, 'A');
  assert.equal(step.cursor, 1);
  assert.equal(step.deck, null); // deck untouched
});

test('advanceDeck: opens a fresh reshuffled cycle when the deck runs out', () => {
  const all = [card('A'), card('B'), card('C'), card('D')];
  const deck = [card('A'), card('B')];
  const step = advanceDeck({ deck, cursor: 1, allCards: all, random: rngFrom([0.5]) });
  assert.equal(step.consumedWord, 'B');
  assert.equal(step.cursor, 0);
  assert.notEqual(step.deck, null);
  // Every card comes back except the one just seen.
  assert.deepEqual(words(step.deck ?? []), ['A', 'C', 'D']);
});
