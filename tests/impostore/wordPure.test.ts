import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getHintForWord,
  pickWordWithRotation,
} from '../../src/games/impostore/services/impostoreWordPure.ts';

// Deterministic RNG so the test isn't coupled to a particular shuffle.
function rngFrom(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const DICT: Record<string, string> = {
  gatto: 'solitario',
  cane: 'fedele',
  mare: 'sale',
  sole: 'calore',
};

test('getHintForWord: returns the matching hint (case-insensitive)', () => {
  assert.equal(getHintForWord(DICT, 'gatto'), 'solitario');
  assert.equal(getHintForWord(DICT, 'GATTO'), 'solitario');
  assert.equal(getHintForWord(DICT, '  Mare  '), 'sale');
});

test('getHintForWord: returns null when the word is not in the dictionary', () => {
  assert.equal(getHintForWord(DICT, 'topolino'), null);
  assert.equal(getHintForWord(DICT, ''), null);
});

test('pickWordWithRotation: picks a word and tracks it as used', () => {
  const result = pickWordWithRotation(DICT, [], null, rngFrom([0]));
  assert.equal(typeof result.word, 'string');
  assert.equal(result.rotated, false);
  assert.deepEqual(result.newUsed, [result.word]);
  // Hint must match the picked word.
  assert.equal(result.hint, DICT[result.word]);
});

test('pickWordWithRotation: never picks a word already in `used`', () => {
  const used = ['gatto', 'cane', 'sole'];
  // Whatever RNG produces, only "mare" remains fresh.
  for (let i = 0; i < 20; i++) {
    const r = pickWordWithRotation(DICT, used, null);
    assert.equal(r.word, 'mare');
    assert.equal(r.rotated, false);
    assert.deepEqual(r.newUsed, [...used, 'mare']);
  }
});

test('pickWordWithRotation: never picks the excludeWord', () => {
  // Only "mare" and "sole" would be fresh, but we also exclude "mare".
  const r = pickWordWithRotation(DICT, ['gatto', 'cane'], 'mare');
  assert.equal(r.word, 'sole');
  assert.equal(r.rotated, false);
});

test('pickWordWithRotation: respects case-insensitive exclusion', () => {
  const r = pickWordWithRotation(DICT, ['GATTO'], 'CANE');
  assert.ok(r.word === 'mare' || r.word === 'sole', `unexpected pick: ${r.word}`);
});

test('pickWordWithRotation: rotates when every word has been used', () => {
  const used = ['gatto', 'cane', 'mare', 'sole'];
  const r = pickWordWithRotation(DICT, used, null);
  assert.equal(r.rotated, true);
  // After rotation `newUsed` restarts with just the picked word.
  assert.deepEqual(r.newUsed, [r.word]);
  assert.ok(Object.keys(DICT).includes(r.word));
});

test('pickWordWithRotation: excludeWord is honored after rotation too', () => {
  const used = ['gatto', 'cane', 'mare', 'sole'];
  // All used → rotate. excludeWord = "gatto" must still be skipped.
  for (let i = 0; i < 30; i++) {
    const r = pickWordWithRotation(DICT, used, 'gatto');
    assert.equal(r.rotated, true);
    assert.notEqual(r.word, 'gatto');
  }
});

test('pickWordWithRotation: full session walkthrough exhausts dict then rotates', () => {
  const seen: string[] = [];
  let used: string[] = [];
  let previous: string | null = null;
  let rotations = 0;

  // 12 rounds × 4-word dict → forces multiple rotations.
  for (let round = 0; round < 12; round++) {
    const r = pickWordWithRotation(DICT, used, previous);
    if (r.rotated) rotations++;
    seen.push(r.word);
    used = r.newUsed;
    previous = r.word;
    // No back-to-back same word.
    if (round > 0) assert.notEqual(r.word, seen[round - 1]);
  }
  assert.ok(rotations >= 2, `expected ≥2 rotations, got ${rotations}`);
});

test('pickWordWithRotation: throws on empty dictionary', () => {
  assert.throws(() => pickWordWithRotation({}, [], null), /Empty dictionary/);
});
