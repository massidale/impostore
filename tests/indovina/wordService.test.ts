import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterUnusedWords,
  pickFreshWords,
  pickRandom,
} from '../../src/games/indovina/services/indovinaWordPure.ts';

// Deterministic RNG: cycles through the given values, used to make tests
// reproducible without coupling them to a specific shuffle ordering.
function rngFrom(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

test('filterUnusedWords: empty used list returns the full pool', () => {
  const pool = ['a', 'b', 'c'];
  assert.deepEqual(filterUnusedWords(pool, []), ['a', 'b', 'c']);
});

test('filterUnusedWords: removes case-insensitive matches', () => {
  const pool = ['Topolino', 'Pluto', 'Pippo'];
  assert.deepEqual(filterUnusedWords(pool, ['topolino', 'PIPPO']), ['Pluto']);
});

test('filterUnusedWords: trims whitespace before comparison', () => {
  const pool = ['Cat', 'Dog'];
  assert.deepEqual(filterUnusedWords(pool, ['  cat  ']), ['Dog']);
});

test('filterUnusedWords: returns a fresh array (no mutation of input)', () => {
  const pool = ['a', 'b'];
  const result = filterUnusedWords(pool, []);
  result.push('c');
  assert.deepEqual(pool, ['a', 'b']);
});

test('pickFreshWords: success when pool has enough fresh words', () => {
  const pool = ['a', 'b', 'c', 'd'];
  const result = pickFreshWords(pool, ['a'], 2, rngFrom([0, 0, 0, 0]));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.picked.length, 2);
    // None of the picked words should be in the used list
    for (const w of result.picked) {
      assert.notEqual(w.toLowerCase(), 'a');
    }
  }
});

test('pickFreshWords: failure when pool is exhausted', () => {
  const pool = ['a', 'b', 'c'];
  const result = pickFreshWords(pool, ['a', 'b'], 2);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.available, 1);
    assert.equal(result.required, 2);
  }
});

test('pickFreshWords: failure surfaces zero when nothing remains', () => {
  const pool = ['a', 'b'];
  const result = pickFreshWords(pool, ['a', 'b'], 1);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.available, 0);
  }
});

test('pickFreshWords: never returns a used word across many trials', () => {
  // Stress test: tracks used words round after round and must keep returning
  // fresh ones until exhaustion.
  const pool = Array.from({ length: 30 }, (_, i) => `w${i}`);
  const used: string[] = [];
  for (let round = 0; round < 6; round++) {
    const result = pickFreshWords(pool, used, 5);
    assert.equal(result.ok, true);
    if (result.ok) {
      // None overlap with already-used
      for (const w of result.picked) {
        assert.equal(used.includes(w), false);
      }
      // No duplicates inside the picked batch itself
      assert.equal(new Set(result.picked).size, result.picked.length);
      used.push(...result.picked);
    }
  }
  // After 6 × 5 picks the 30-word pool is fully consumed.
  const exhausted = pickFreshWords(pool, used, 1);
  assert.equal(exhausted.ok, false);
});

test('pickFreshWords: requesting all available works', () => {
  const pool = ['a', 'b', 'c'];
  const result = pickFreshWords(pool, [], 3);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(new Set(result.picked), new Set(pool));
  }
});

test('pickRandom: distributes across all elements over many trials', () => {
  const arr = ['a', 'b', 'c', 'd'];
  const counts = new Map<string, number>();
  for (let i = 0; i < 4000; i++) {
    const v = pickRandom(arr);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  // Every element must be hit; with 1000 trials per bucket on average a
  // uniform RNG won't leave any zeros (probability vanishingly small).
  for (const x of arr) {
    assert.ok((counts.get(x) ?? 0) > 100, `expected '${x}' to be picked, got ${counts.get(x) ?? 0}`);
  }
});

test('pickRandom: throws on empty array', () => {
  assert.throws(() => pickRandom([]), /Empty array/);
});
