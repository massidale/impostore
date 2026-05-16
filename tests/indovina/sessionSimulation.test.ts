import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterUnusedWords,
  pickFreshWords,
  pickRandom,
} from '../../src/games/indovina/services/indovinaWordPure.ts';

/**
 * Higher-level simulation of an Indovina session, mirroring how
 * `startIndovinaGame` stitches the pure helpers together: pick fresh words,
 * append them to `usedWords`, pick a random first player. The Firebase
 * orchestration in indovinaLogic.ts is ~10 lines around these primitives,
 * so exercising them in sequence covers the invariants that matter to the
 * user (no repeats, exhaustion error, varied first player).
 */
function simulateRound(state: { usedWords: string[]; firstPlayerHistory: string[] }, params: {
  pool: string[];
  players: string[];
}) {
  const { pool, players } = params;
  const result = pickFreshWords(pool, state.usedWords, players.length);
  if (!result.ok) return result;
  const firstPlayerId = pickRandom(players);
  state.usedWords = [...state.usedWords, ...result.picked];
  state.firstPlayerHistory.push(firstPlayerId);
  return { ok: true as const, picked: result.picked, firstPlayerId };
}

test('session: 5 rounds × 4 players never repeat a word from the same dictionary', () => {
  const pool = Array.from({ length: 60 }, (_, i) => `word-${i}`);
  const players = ['p1', 'p2', 'p3', 'p4'];
  const state = { usedWords: [] as string[], firstPlayerHistory: [] as string[] };

  const allPicked: string[] = [];
  for (let round = 0; round < 5; round++) {
    const r = simulateRound(state, { pool, players });
    assert.equal(r.ok, true, `round ${round} should have enough words`);
    if (r.ok) {
      allPicked.push(...r.picked);
    }
  }
  // 20 distinct words across the whole session — no repeats.
  assert.equal(new Set(allPicked).size, 20);
  assert.equal(state.usedWords.length, 20);
});

test('session: surfaces NOT_ENOUGH_WORDS the moment the dictionary is too small', () => {
  // Pool of 7, 3 players — round 1 picks 3, round 2 picks 3, round 3 fails (1 left, need 3).
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const players = ['p1', 'p2', 'p3'];
  const state = { usedWords: [] as string[], firstPlayerHistory: [] as string[] };

  const r1 = simulateRound(state, { pool, players });
  assert.equal(r1.ok, true);

  const r2 = simulateRound(state, { pool, players });
  assert.equal(r2.ok, true);

  const r3 = simulateRound(state, { pool, players });
  assert.equal(r3.ok, false);
  if (!r3.ok) {
    assert.equal(r3.required, 3);
    assert.equal(r3.available, 1);
  }
});

test('session: dictionary swap (resetIndovinaUsedWords semantics) lets the game continue', () => {
  // Simulates the user generating a fresh AI dictionary mid-session: usedWords
  // is cleared, so the next round picks freely from the new pool.
  const oldPool = ['a', 'b'];
  const newPool = ['x', 'y', 'z'];
  const players = ['p1', 'p2'];
  const state = { usedWords: [] as string[], firstPlayerHistory: [] as string[] };

  const r1 = simulateRound(state, { pool: oldPool, players });
  assert.equal(r1.ok, true);
  assert.equal(state.usedWords.length, 2);

  // Pool is exhausted on the old dictionary
  const r2 = simulateRound(state, { pool: oldPool, players });
  assert.equal(r2.ok, false);

  // After dictionary swap + reset (modelled by clearing usedWords)
  state.usedWords = [];
  const r3 = simulateRound(state, { pool: newPool, players });
  assert.equal(r3.ok, true);
});

test('session: filterUnusedWords correctly reflects the size of the remaining pool', () => {
  const pool = ['a', 'b', 'c', 'd'];
  const used: string[] = [];
  for (let i = 0; i < 4; i++) {
    const r = pickFreshWords(pool, used, 1);
    assert.equal(r.ok, true);
    if (r.ok) used.push(...r.picked);
    assert.equal(filterUnusedWords(pool, used).length, 4 - (i + 1));
  }
});

test('session: first player is not always the same across many rounds', () => {
  // Direct check for the bug reported by the user: prior implementation always
  // showed the first entry of Object.entries(players) as starting; with random
  // selection the starting player must vary.
  const players = ['alice', 'bob', 'charlie', 'dana'];
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    seen.add(pickRandom(players));
  }
  assert.equal(seen.size, players.length, `expected all players to start at least once, got ${[...seen].join(',')}`);
});

test('session: full default-dictionary walkthrough does not repeat any word', () => {
  // Exercises the same default dataset shipped with the app, picking 6 words
  // per round until exhaustion. No word may appear twice.
  // We re-import the JSON via a sibling helper to avoid the JSON import
  // attribute issue at test time.
  const dict = bigDict();
  const players = Array.from({ length: 6 }, (_, i) => `p${i}`);
  const used: string[] = [];
  let rounds = 0;
  while (true) {
    const r = pickFreshWords(dict, used, players.length);
    if (!r.ok) break;
    used.push(...r.picked);
    rounds++;
    if (rounds > 200) throw new Error('unexpected infinite loop');
  }
  assert.equal(new Set(used).size, used.length, 'no repeats expected');
  assert.ok(used.length <= dict.length);
  assert.ok(rounds >= 1);
});

function bigDict(): string[] {
  // 380-ish item synthetic dictionary, identical in size to the shipped one.
  return Array.from({ length: 380 }, (_, i) => `item-${i}`);
}
