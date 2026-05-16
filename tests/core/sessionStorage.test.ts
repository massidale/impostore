import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSessionStore,
  type StorageAdapter,
} from '../../src/core/services/sessionStoragePure.ts';

function memoryAdapter(): StorageAdapter & { dump(): Record<string, string> } {
  const store = new Map<string, string>();
  return {
    async getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
    dump() {
      return Object.fromEntries(store);
    },
  };
}

test('sessionStore.getClientId: generates a UUID on first call and persists it', async () => {
  const adapter = memoryAdapter();
  const store = makeSessionStore(adapter);

  const id1 = await store.getClientId();
  assert.ok(id1.length >= 32, `expected UUID-ish id, got ${id1}`);

  // Persisted to the adapter
  assert.equal(adapter.dump()['gameshub:clientId'], id1);
});

test('sessionStore.getClientId: returns the same value across calls (cached)', async () => {
  const adapter = memoryAdapter();
  const store = makeSessionStore(adapter);

  const a = await store.getClientId();
  const b = await store.getClientId();
  assert.equal(a, b);
});

test('sessionStore.getClientId: a new store instance reads back the existing id', async () => {
  // Simulates a fresh page load — same adapter, brand-new store wrapper.
  const adapter = memoryAdapter();
  const first = makeSessionStore(adapter);
  const id = await first.getClientId();

  const second = makeSessionStore(adapter);
  const id2 = await second.getClientId();
  assert.equal(id, id2);
});

test('sessionStore.getRoomSession: returns null when nothing has been saved', async () => {
  const store = makeSessionStore(memoryAdapter());
  assert.equal(await store.getRoomSession('ABCDEF'), null);
});

test('sessionStore.setRoomSession + getRoomSession: round-trip', async () => {
  const store = makeSessionStore(memoryAdapter());
  await store.setRoomSession('ABCDEF', { name: 'Mario' });
  const restored = await store.getRoomSession('ABCDEF');
  assert.deepEqual(restored, { name: 'Mario' });
});

test('sessionStore: room sessions are isolated by roomId', async () => {
  const store = makeSessionStore(memoryAdapter());
  await store.setRoomSession('ROOM1', { name: 'Alice' });
  await store.setRoomSession('ROOM2', { name: 'Bob' });

  assert.deepEqual(await store.getRoomSession('ROOM1'), { name: 'Alice' });
  assert.deepEqual(await store.getRoomSession('ROOM2'), { name: 'Bob' });
});

test('sessionStore.clearRoomSession: removes only the targeted room', async () => {
  const store = makeSessionStore(memoryAdapter());
  await store.setRoomSession('ROOM1', { name: 'Alice' });
  await store.setRoomSession('ROOM2', { name: 'Bob' });

  await store.clearRoomSession('ROOM1');

  assert.equal(await store.getRoomSession('ROOM1'), null);
  assert.deepEqual(await store.getRoomSession('ROOM2'), { name: 'Bob' });
});

test('sessionStore.getRoomSession: malformed JSON in storage returns null (not a throw)', async () => {
  const adapter = memoryAdapter();
  await adapter.setItem('gameshub:roomSession:ROOMX', '{not json');
  const store = makeSessionStore(adapter);
  assert.equal(await store.getRoomSession('ROOMX'), null);
});

test('sessionStore.getClientId: ignores empty string in storage and regenerates', async () => {
  const adapter = memoryAdapter();
  await adapter.setItem('gameshub:clientId', '');
  const store = makeSessionStore(adapter);
  const id = await store.getClientId();
  assert.ok(id.length > 0);
  assert.notEqual(id, '');
});
