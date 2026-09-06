import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServer } from '../helpers/serverLoader.ts';
const {nextGuesser} = loadServer('src/core/utils/guesserRotation.ts');
test('guesser rotation is circular across unlimited matches', () => {
  let selected = 'b';
  const sequence = [];
  for (let i = 0; i < 8; i++) {sequence.push(selected); selected = nextGuesser(['a','b','c'], selected);}
  assert.deepEqual(sequence, ['b','c','a','b','c','a','b','c']);
});
test('rotation skips departed players while retaining the previous order', () => {
  assert.equal(nextGuesser(['a','c','d'], 'b', ['a','b','c']), 'c');
  assert.equal(nextGuesser(['a','d'], 'b', ['a','b','c']), 'a');
  assert.equal(nextGuesser(['d','e'], 'b', ['a','b','c']), 'd');
});
test('new players enter the circle and empty or single-player rosters are safe', () => {
  assert.equal(nextGuesser(['a','b','c','d'], 'c', ['a','b','c']), 'd');
  assert.equal(nextGuesser(['a'], 'a'), 'a');
  assert.equal(nextGuesser([], 'a'), null);
});
