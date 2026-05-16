import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterActivePlayerUids,
  getWaitingPlayerUids,
} from '../../src/core/services/playerSelection.ts';
import type { CoreRoom } from '../../src/core/types/room.ts';

function makeRoom(players: CoreRoom['players']): CoreRoom {
  return {
    id: 'ABC123',
    status: 'active',
    hostId: 'host-uid',
    createdAt: 0,
    updatedAt: 0,
    currentGameId: 'impostore',
    players,
  };
}

test('filterActivePlayerUids: includes players without the waiting flag', () => {
  const room = makeRoom({
    a: { joinedAt: 1, name: 'Alice' },
    b: { joinedAt: 2, name: 'Bob' },
  });
  assert.deepEqual(filterActivePlayerUids(room).sort(), ['a', 'b']);
});

test('filterActivePlayerUids: includes players with waiting:false (explicit)', () => {
  const room = makeRoom({
    a: { joinedAt: 1, name: 'Alice', waiting: false },
    b: { joinedAt: 2, name: 'Bob' },
  });
  assert.deepEqual(filterActivePlayerUids(room).sort(), ['a', 'b']);
});

test('filterActivePlayerUids: excludes players with waiting:true', () => {
  const room = makeRoom({
    a: { joinedAt: 1, name: 'Alice' },
    spectator: { joinedAt: 5, name: 'Eve', waiting: true },
    b: { joinedAt: 2, name: 'Bob' },
  });
  assert.deepEqual(filterActivePlayerUids(room).sort(), ['a', 'b']);
});

test('filterActivePlayerUids: empty / missing players returns []', () => {
  assert.deepEqual(filterActivePlayerUids(makeRoom({})), []);
  assert.deepEqual(
    filterActivePlayerUids({ ...makeRoom({}), players: undefined }),
    []
  );
});

test('filterActivePlayerUids: all waiting yields []', () => {
  const room = makeRoom({
    s1: { joinedAt: 10, name: 'S1', waiting: true },
    s2: { joinedAt: 11, name: 'S2', waiting: true },
  });
  assert.deepEqual(filterActivePlayerUids(room), []);
});

test('getWaitingPlayerUids: returns only the waiting ones', () => {
  const room = makeRoom({
    a: { joinedAt: 1, name: 'Alice' },
    spectator: { joinedAt: 5, name: 'Eve', waiting: true },
    b: { joinedAt: 2, name: 'Bob', waiting: false },
  });
  assert.deepEqual(getWaitingPlayerUids(room), ['spectator']);
});

test('getWaitingPlayerUids: empty when no spectators', () => {
  const room = makeRoom({
    a: { joinedAt: 1, name: 'Alice' },
  });
  assert.deepEqual(getWaitingPlayerUids(room), []);
});
