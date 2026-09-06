import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
test("ascending pairs", () => {
  const { countAscendingPairs: f } = loadServer("server/games/top-ten.ts");
  assert.equal(f([2, 5, 8, 10]), 3);
  assert.equal(f([2, 8, 5, 10]), 2);
  assert.equal(f([10, 8, 5, 2]), 0);
});
const room = () => ({
  id: "ROOM01",
  hostId: "a",
  status: "active",
  settings: { rounds: 5 },
  players: Object.fromEntries(
    ["a", "b", "c", "d"].map((uid) => [uid, { name: uid }]),
  ),
  gameState: {
    participantUids: ["a", "b", "c", "d"],
    roundId: 0,
    phaseVersion: 0,
  },
});
test("five complete themes; role, permutation and private projection", () => {
  const m = loadServer("server/games/top-ten.ts").topTenModule,
    r: any = room();
  m.start(r, 0);
  for (let round = 1; round <= 5; round++) {
    const s = r.gameState,
      nums = s.private.numbersByUid;
    assert.equal(new Set(Object.values(nums)).size, 4);
    assert.ok(Object.values(nums).every((n: any) => n >= 1 && n <= 10));
    for (const uid of ["a", "b", "c", "d"]) {
      const v = m.project(r, uid);
      assert.equal(v.gameState.ownNumber, nums[uid]);
      assert.equal(v.gameState.numbersByUid, undefined);
      assert.equal(v.gameState.private, undefined);
    }
    assert.equal(m.project(r, "late").gameState.ownNumber, undefined);
    for (const uid of s.performanceOrder)
      m.apply(r, uid, "markPerformed", { playerUid: uid }, 0);
    m.apply(r, "a", "beginOrdering", {}, 0);
    assert.throws(() =>
      m.apply(r, "late", "submitOrder", { uids: ["a", "b", "c", "d"] }, 0),
    );
    assert.throws(() =>
      m.apply(
        r,
        s.captainUid,
        "submitOrder",
        { uids: ["a", "a", "b", "c"] },
        0,
      ),
    );
    const order = Object.keys(nums).sort((a, b) => nums[a] - nums[b]);
    m.apply(r, s.captainUid, "submitOrder", { uids: order }, 0);
    assert.equal(s.roundScore, 3);
    assert.deepEqual(m.project(r, "late").gameState.numbersByUid, nums);
    assert.throws(() =>
      m.apply(r, s.captainUid, "submitOrder", { uids: order }, 0),
    );
    m.apply(r, "a", "nextRound", {}, 0);
  }
  assert.equal(r.gameState.phase, "results");
  assert.equal(r.gameState.score, 15);
  assert.equal(r.gameState.history.length, 5);
});
test("editorial content and validation", () => {
  const m = loadServer("server/games/top-ten.ts").topTenModule;
  const data = loadServer("server/data/top-ten.json");
  assert.ok(data.length >= 30);
  assert.equal(m.validateContent(data).length, data.length);
  assert.throws(() => m.validateSettings({ rounds: 2 }));
  assert.throws(() =>
    m.validateContent([{ prompt: "x", lowLabel: "", highLabel: "y" }]),
  );
  const r: any = room();
  r.gameData = { "top-ten": { content: data.slice(0, 3) } };
  assert.throws(() => m.start(r, 0));
});
