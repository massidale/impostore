import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
const get = () => loadServer("server/games/herd-mentality.ts");
const room = () => ({
  id: "room",
  hostId: "a",
  status: "playing",
  matchId: 1,
  settings: {},
  players: Object.fromEntries(
    ["a", "b", "c", "d", "e"].map((u) => [u, { name: u }]),
  ),
  gameState: { participantUids: ["a", "b", "c", "d", "e"] },
});
test("unique plurality wins; tied largest groups and all different score zero", () => {
  const { majorityWinners, normalizeAnswer } = get();
  assert.deepEqual(majorityWinners([["a", "b"], ["c"], ["d"], ["e"]]), [
    "a",
    "b",
  ]);
  assert.deepEqual(
    majorityWinners([
      ["a", "b"],
      ["c", "d"],
    ]),
    [],
  );
  assert.deepEqual(majorityWinners([["a"], ["b"], ["c"]]), []);
  assert.equal(normalizeAnswer("  Caffè!! "), "caffe");
  assert.notEqual(normalizeAnswer("l'ago"), normalizeAnswer("lago"));
});
test("five complete rounds preserve private answers and score once", () => {
  const m = get().herdMentalityModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  for (let n = 0; n < 5; n++) {
    for (const [i, u] of ["a", "b", "c", "d", "e"].entries()) {
      m.apply(
        r,
        u,
        "submitAnswer",
        { text: ["caffè", "CAFFE", "tè", "succo", "acqua"][i] },
        0,
      );
      if (i === 0) {
        assert.equal(m.project(r, "b").gameState.answersByUid, undefined);
        assert.equal(m.project(r, "a").gameState.myAnswer, "caffè");
        assert.throws(() =>
          m.apply(r, u, "submitAnswer", { text: "altro" }, 0),
        );
      }
    }
    assert.equal(r.gameState.phase, "review");
    assert.equal(m.project(r, "a").gameState.answersByUid.a, "caffè");
    assert.throws(() => m.apply(r, "b", "confirmResults", {}, 0));
    m.apply(r, "a", "confirmResults", {}, 0);
    assert.equal(r.gameState.scores.a, n + 1);
    assert.throws(() => m.apply(r, "a", "confirmResults", {}, 0));
    m.apply(r, "a", "nextRound", {}, 0);
  }
  assert.equal(r.gameState.phase, "results");
  assert.deepEqual(r.gameState.winners, ["a", "b"]);
});
test("host merge and undo preserve originals and partition", () => {
  const m = get().herdMentalityModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  for (const u of ["a", "b", "c", "d", "e"])
    m.apply(r, u, "submitAnswer", { text: u }, 0);
  const before = structuredClone(r.gameState.groups);
  assert.throws(() =>
    m.apply(r, "b", "mergeGroups", { groupIds: ["g0", "g1"] }, 0),
  );
  assert.throws(() =>
    m.apply(r, "a", "mergeGroups", { groupIds: ["g0", "g0"] }, 0),
  );
  m.apply(r, "a", "mergeGroups", { groupIds: ["g0", "g1"] }, 0);
  assert.equal(r.gameState.groups.length, 4);
  m.apply(r, "a", "undoMerge", {}, 0);
  assert.deepEqual(r.gameState.groups, before);
  m.apply(r, "a", "confirmResults", {}, 0);
  assert.deepEqual(Object.values(r.gameState.scores), [0, 0, 0, 0, 0]);
  assert.throws(() =>
    m.apply(r, "a", "mergeGroups", { groupIds: ["g0", "g1"] }, 0),
  );
});
test("content validation, lengths, normalization and cancellation", () => {
  const { herdMentalityModule: m, normalizeAnswer } = get();
  assert.equal(normalizeAnswer("… CÀFFÈ   freddo!!!"), "caffe freddo");
  assert.notEqual(normalizeAnswer("coca-cola"), normalizeAnswer("coca cola"));
  assert.throws(() => m.validateSettings({ rounds: 20.5 }, []));
  assert.throws(() => m.validateContent([{ question: "x".repeat(121) }]));
  assert.throws(() =>
    m.validateContent([{ question: "x" }, { question: "X" }]),
  );
  assert.throws(() => m.validateContent([]));
  const defaults = loadServer("server/data/herd-mentality.json");
  assert.ok(defaults.length >= 30);
  assert.equal(new Set(defaults.map((v: any) => v.id)).size, defaults.length);
  assert.equal(m.validateContent(defaults).length, defaults.length);
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  for (const answer of ["", " ", "!!!", "x".repeat(61)])
    assert.throws(() => m.apply(r, "a", "submitAnswer", { text: answer }, 0));
  assert.throws(() => m.apply(r, "late", "submitAnswer", { text: "ciao" }, 0));
  m.apply(r, "a", "submitAnswer", { text: "Segreto" }, 0);
  assert.equal(m.project(r, "late").gameState.myAnswer, undefined);
  assert.equal(m.project(r, "late").gameState.answersByUid, undefined);
  assert.equal(m.project(r, "a").gameData, undefined);
  assert.throws(() => m.apply(r, "a", "confirmResults", {}, 0));
  m.apply(r, "a", "cancelRound", {}, 0);
  assert.deepEqual(Object.values(r.gameState.scores), [0, 0, 0, 0, 0]);
  m.apply(r, "a", "nextRound", {}, 0);
  assert.equal(r.gameState.roundId, 2);
  assert.equal(m.project(r, "a").gameState.myAnswer, undefined);
  m.end(r, 10);
  assert.equal(r.status, "lobby");
  assert.deepEqual(r.gameState, {});
});
test("identical answer retry is idempotent; every merge and undo changes generation", () => {
  const m = get().herdMentalityModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  m.apply(r, "a", "submitAnswer", { text: "a" }, 0);
  const before = structuredClone(r);
  assert.doesNotThrow(() => m.apply(r, "a", "submitAnswer", { text: "a" }, 0));
  assert.deepEqual(r, before);
  for (const u of ["b", "c", "d", "e"])
    m.apply(r, u, "submitAnswer", { text: u }, 0);
  const v = r.gameState.phaseVersion;
  m.apply(r, "a", "mergeGroups", { groupIds: ["g0", "g1"] }, 0);
  assert.equal(r.gameState.phaseVersion, v + 1);
  m.apply(r, "a", "mergeGroups", { groupIds: ["g2", "g3"] }, 0);
  assert.equal(r.gameState.phaseVersion, v + 2);
  m.apply(r, "a", "undoMerge", {}, 0);
  assert.equal(r.gameState.phaseVersion, v + 3);
});
test("host dashboard is a compact footer, not a second player screen", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(
    "src/games/herd-mentality/components/HostDashboard.tsx",
    "utf8",
  );
  assert.equal(source.includes("<PlayerGamepad"), false);
  assert.ok(source.includes("HostDashboardShell"));
});
