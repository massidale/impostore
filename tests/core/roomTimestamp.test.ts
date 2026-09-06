import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { roomTimestamp } = createRequire(import.meta.url)(
  "../../scripts/room-timestamp.cjs",
);
test("cleanup reads both encoded and legacy timestamps and ignores unreadable state", () => {
  const r = { createdAt: 1, updatedAt: 20 };
  assert.equal(roomTimestamp(r, false), 20);
  assert.equal(roomTimestamp({ data: r }, true), 20);
  assert.equal(roomTimestamp({ data: JSON.stringify(r) }, true), 20);
  assert.equal(roomTimestamp({ data: "broken" }, true), null);
  assert.equal(roomTimestamp({ data: {} }, true), null);
});
