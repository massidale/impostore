import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ABSTAIN,
  assignLupusRoles,
  unanimousLupoTarget,
  applyNightDefenses,
  computeLynchOutcome,
  lupusWinner,
  isNightComplete,
} from '../../src/games/lupus/services/lupusPure.ts';

function rngFrom(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const UIDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

test('assignLupusRoles: right number of each role, everyone assigned', () => {
  const roles = assignLupusRoles(
    UIDS,
    {
      numLupi: 2,
      veggenteEnabled: true,
      guardiaEnabled: true,
      mediumEnabled: true,
      boccaEnabled: true,
    },
    rngFrom([0.3, 0.7, 0.1, 0.9, 0.5, 0.2, 0.8])
  );
  const values = Object.values(roles);
  assert.equal(Object.keys(roles).length, UIDS.length);
  assert.equal(values.filter((r) => r === 'lupo').length, 2);
  assert.equal(values.filter((r) => r === 'veggente').length, 1);
  assert.equal(values.filter((r) => r === 'guardia').length, 1);
  assert.equal(values.filter((r) => r === 'medium').length, 1);
  assert.equal(values.filter((r) => r === 'bocca').length, 1);
  assert.equal(values.filter((r) => r === 'villico').length, 2);
});

test('assignLupusRoles: specials disabled → only lupi e villici', () => {
  const roles = assignLupusRoles(
    UIDS,
    {
      numLupi: 1,
      veggenteEnabled: false,
      guardiaEnabled: false,
      mediumEnabled: false,
      boccaEnabled: false,
    },
    rngFrom([0.2])
  );
  const values = Object.values(roles);
  assert.equal(values.filter((r) => r === 'lupo').length, 1);
  assert.equal(values.filter((r) => r === 'villico').length, 7);
});

test('unanimousLupoTarget: agreement → target', () => {
  assert.equal(unanimousLupoTarget({ l1: 'x', l2: 'x' }, ['l1', 'l2']), 'x');
});

test('unanimousLupoTarget: disagreement → null', () => {
  assert.equal(unanimousLupoTarget({ l1: 'x', l2: 'y' }, ['l1', 'l2']), null);
});

test('unanimousLupoTarget: missing pick → null', () => {
  assert.equal(unanimousLupoTarget({ l1: 'x' }, ['l1', 'l2']), null);
});

test('unanimousLupoTarget: single lupo decides alone', () => {
  assert.equal(unanimousLupoTarget({ l1: 'x' }, ['l1']), 'x');
});

test('applyNightDefenses: plain kill', () => {
  assert.deepEqual(applyNightDefenses('x', null, null, null), ['x']);
});

test('applyNightDefenses: no victim → no deaths', () => {
  assert.deepEqual(applyNightDefenses(null, 'x', 'rosa', 'y'), []);
});

test('applyNightDefenses: protected victim survives', () => {
  assert.deepEqual(applyNightDefenses('x', 'x', null, null), []);
});

test('applyNightDefenses: bocca attacked at home survives (not home)', () => {
  assert.deepEqual(applyNightDefenses('rosa', null, 'rosa', 'x'), []);
});

test('applyNightDefenses: bocca dies with the player she visits', () => {
  assert.deepEqual(applyNightDefenses('x', null, 'rosa', 'x').sort(), ['rosa', 'x']);
});

test('applyNightDefenses: guardia protects the visited player → both safe', () => {
  assert.deepEqual(applyNightDefenses('x', 'x', 'rosa', 'x'), []);
});

test('computeLynchOutcome: clear majority eliminates', () => {
  assert.deepEqual(computeLynchOutcome({ a: 'x', b: 'x', c: 'y' }, false), {
    kind: 'eliminate',
    uid: 'x',
  });
});

test('computeLynchOutcome: abstentions are not counted', () => {
  assert.deepEqual(computeLynchOutcome({ a: 'x', b: ABSTAIN, c: ABSTAIN }, false), {
    kind: 'eliminate',
    uid: 'x',
  });
});

test('computeLynchOutcome: everyone abstains → nolynch', () => {
  assert.deepEqual(computeLynchOutcome({ a: ABSTAIN, b: ABSTAIN }, false), { kind: 'nolynch' });
});

test('computeLynchOutcome: first-round tie → runoff with tied candidates', () => {
  assert.deepEqual(computeLynchOutcome({ a: 'x', b: 'y' }, false), {
    kind: 'runoff',
    candidates: ['x', 'y'],
  });
});

test('computeLynchOutcome: tie in the runoff → nolynch', () => {
  assert.deepEqual(computeLynchOutcome({ a: 'x', b: 'y' }, true), { kind: 'nolynch' });
});

test('computeLynchOutcome: no votes → nolynch', () => {
  assert.deepEqual(computeLynchOutcome({}, false), { kind: 'nolynch' });
});

test('lupusWinner: village wins when no lupi alive', () => {
  const roles = { a: 'lupo', b: 'villico', c: 'villico' } as const;
  const alive = { a: false, b: true, c: true };
  assert.equal(lupusWinner(roles, alive), 'villaggio');
});

test('lupusWinner: lupi win at parity', () => {
  const roles = { a: 'lupo', b: 'villico', c: 'villico' } as const;
  const alive = { a: true, b: true, c: false };
  assert.equal(lupusWinner(roles, alive), 'lupi');
});

test('lupusWinner: game continues otherwise', () => {
  const roles = { a: 'lupo', b: 'villico', c: 'villico' } as const;
  const alive = { a: true, b: true, c: true };
  assert.equal(lupusWinner(roles, alive), null);
});

test('isNightComplete: waits for lupi agreement and every required action', () => {
  assert.equal(
    isNightComplete({
      lupiReady: false,
      needsProtect: true,
      protectDone: true,
      needsSeer: true,
      seerDone: true,
      needsBocca: false,
      boccaDone: false,
    }),
    false
  );
  assert.equal(
    isNightComplete({
      lupiReady: true,
      needsProtect: true,
      protectDone: true,
      needsSeer: true,
      seerDone: true,
      needsBocca: true,
      boccaDone: true,
    }),
    true
  );
  // Specials dead or disabled are not awaited.
  assert.equal(
    isNightComplete({
      lupiReady: true,
      needsProtect: false,
      protectDone: false,
      needsSeer: false,
      seerDone: false,
      needsBocca: false,
      boccaDone: false,
    }),
    true
  );
});
