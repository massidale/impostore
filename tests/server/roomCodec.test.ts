import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
const { encodeRoom, decodeRoom } = loadServer("server/roomCodec.ts");
test("authoritative state round-trips empty collections and nulls through an RTDB scalar", () => {
  const room = {
    id: "ABC123",
    hostId: "a",
    status: "active",
    currentGameId: "just-one",
    createdAt: 1,
    updatedAt: 1,
    gameState: {
      clues: {},
      heard: [],
      private: { deck: [{ word: "sole", aliases: [] }], target: null },
    },
  };
  const stored = encodeRoom(room);
  assert.equal(typeof stored, "string");
  assert.deepEqual(decodeRoom(stored), room);
});
test("existing structured rooms remain readable during the storage cutover", () => {
  const old = {
    id: "ABC123",
    hostId: "a",
    status: "active",
    gameState: { phase: "playing" },
  };
  assert.deepEqual(decodeRoom(old), old);
  assert.throws(() => decodeRoom("not json"));
  assert.throws(() => decodeRoom("[]"));
});
