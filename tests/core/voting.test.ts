import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServer } from '../helpers/serverLoader.ts';
const { tallyVotes, validateVote, hasEveryoneVoted } = loadServer('src/core/voting/voting.ts');
test('shared tally counts changed votes once and reports all tied candidates', () => {
  assert.deepEqual(tallyVotes({a:'b',b:'c',c:'b'}), {counts:{b:2,c:1},leaders:['b']});
  assert.deepEqual(tallyVotes({a:'b',b:'a'}).leaders, ['b','a']);
  assert.deepEqual(tallyVotes({}), {counts:{},leaders:[]});
});
test('shared vote validation rejects self, spectator, eliminated, invalid candidate and deadline', () => {
  const ballot = {voter:'a',target:'b',eligible:['a','b','c'],candidates:['b','c'],endsAt:100,now:99};
  assert.doesNotThrow(() => validateVote(ballot));
  for(const patch of [{target:'a'},{voter:'z'},{target:'z'},{now:100},{eligible:['b','c']}])
    assert.throws(() => validateVote({...ballot,...patch}));
});
test('completion uses eligible voters, not the number of arbitrary keys', () => {
  assert.equal(hasEveryoneVoted({a:'b',b:'a'}, ['a','b']), true);
  assert.equal(hasEveryoneVoted({a:'b',z:'a'}, ['a','b']), false);
  assert.equal(hasEveryoneVoted({}, []), false);
});
