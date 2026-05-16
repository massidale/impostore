import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRoles,
  selectFirstPlayer,
} from '../../src/games/impostore/services/roleService.ts';

function tally(roles: Map<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of roles.values()) {
    const k = String(r);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

test('assignRoles: empty player list returns an empty map', () => {
  const roles = assignRoles([], 1, 0);
  assert.equal(roles.size, 0);
});

test('assignRoles: assigns exactly N impostors and the rest are civilians', () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const roles = assignRoles(players, 2, 0);
  const counts = tally(roles);
  assert.equal(counts.impostor, 2);
  assert.equal(counts.civilian, 3);
  assert.equal(counts.clown, undefined);
});

test('assignRoles: honors numClowns alongside impostors', () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const roles = assignRoles(players, 1, 2);
  const counts = tally(roles);
  assert.equal(counts.impostor, 1);
  assert.equal(counts.clown, 2);
  assert.equal(counts.civilian, 3);
});

test('assignRoles: every player gets exactly one role', () => {
  const players = ['a', 'b', 'c', 'd'];
  const roles = assignRoles(players, 1, 1);
  for (const p of players) {
    assert.ok(roles.has(p), `player ${p} missing a role`);
  }
  assert.equal(roles.size, players.length);
});

test('assignRoles: when special roles exceed player count, caps assignment to player slots', () => {
  // 3 players but 4 impostors + 1 clown requested → should still assign one role per player.
  const players = ['a', 'b', 'c'];
  const roles = assignRoles(players, 4, 1);
  assert.equal(roles.size, 3);
  // Per the implementation's priority (impostors first), 3 impostors are placed.
  const counts = tally(roles);
  assert.equal(counts.impostor, 3);
});

test('assignRoles: shuffles — each player is picked as impostor across many trials', () => {
  // With 4 players and 1 impostor over 400 trials, each player should appear
  // as impostor at least once (probabilistic but overwhelmingly likely).
  const players = ['p1', 'p2', 'p3', 'p4'];
  const impostorCounts: Record<string, number> = {};
  for (let i = 0; i < 400; i++) {
    const roles = assignRoles(players, 1, 0);
    for (const [uid, role] of roles) {
      if (role === 'impostor') {
        impostorCounts[uid] = (impostorCounts[uid] || 0) + 1;
      }
    }
  }
  for (const p of players) {
    assert.ok(
      (impostorCounts[p] || 0) > 20,
      `player ${p} should have been picked as impostor (got ${impostorCounts[p] || 0})`
    );
  }
});

test('selectFirstPlayer: returns one of the provided players', () => {
  const players = ['x', 'y', 'z'];
  for (let i = 0; i < 50; i++) {
    assert.ok(players.includes(selectFirstPlayer(players)));
  }
});

test('selectFirstPlayer: distributes across players over many trials', () => {
  const players = ['p1', 'p2', 'p3', 'p4'];
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    seen.add(selectFirstPlayer(players));
  }
  assert.equal(seen.size, players.length);
});

test('selectFirstPlayer: throws on empty input', () => {
  assert.throws(() => selectFirstPlayer([]), /Nessun giocatore/);
});
