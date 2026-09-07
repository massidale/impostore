import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
const { wavelengthModule: m } = loadServer("server/games/wavelength.ts");
function room() {
  const r: any = {
    id: "TEST",
    hostId: "a",
    status: "active",
    currentGameId: "wavelength",
    matchId: 1,
    players: { a: { name: "A" }, b: { name: "B" }, c: { name: "C" } },
    gameState: { participantUids: ["a", "b", "c"] },
  };
  m.init(r, m.validateSettings({}, ["a", "b", "c"]), 0);
  m.start(r, 0);
  return r;
}
test("One shared secret, host guesser and late spectator cannot read it", () => {
  const r = room();
  r.gameState.target = 8;
  r.players.z = { name: "Z", waiting: true };
  assert.equal(m.project(r, "b").gameState.target, 8);
  assert.equal(m.project(r, "c").gameState.target, 8);
  assert.ok(!("target" in m.project(r, "a").gameState));
  assert.ok(!("target" in m.project(r, "z").gameState));
  assert.ok(!JSON.stringify(m.project(r, "a")).includes("gameData"));
});
test("Separate matches rotate everyone and record a single guess without scores", () => {
  const r = room();
  r.players.z = { name: "Z", waiting: true };
  for (const id of ["a", "b", "c"]) {
    assert.equal(r.gameState.guesserUid, id);
    assert.throws(() => m.apply(r, id, "submitGuess", { value: 1 }, 0));
    for (const other of r.gameState.turnOrder) {
      m.apply(r, id, "markHeard", { targetUid: other }, 1);
    }
    m.apply(r, id, "beginGuess", {}, 2);
    for (const value of [0, 11, 2.5, "8"])
      assert.throws(() => m.apply(r, id, "submitGuess", { value }, 3));
    const other = r.gameState.turnOrder[0];
    assert.throws(() => m.apply(r, other, "submitGuess", { value: 8 }, 3));
    m.apply(r, id, "submitGuess", { value: r.gameState.target }, 3);
    assert.throws(() => m.apply(r, id, "submitGuess", { value: 8 }, 3));
    assert.equal(r.gameState.scores, undefined);
    assert.equal(m.project(r, "z").gameState.target, r.gameState.target);
    if (id !== "c") {m.end(r, 4); m.init(r, r.settings, 4); m.start(r, 4);}
  }
  assert.equal(r.gameState.phase, "results");
  assert.equal(r.gameState.winners, undefined);
});
test("Guesser can proceed after oral discussion; cancellation and content validation", () => {
  const r = room();
  assert.throws(() => m.apply(r, "b", "markHeard", { targetUid: "c" }, 1));
  assert.throws(() => m.apply(r, "a", "markHeard", { targetUid: r.gameState.turnOrder[1] }, 1));
  m.apply(r, "a", "beginGuess", {}, 1);
  assert.equal(r.gameState.phase, "guessing");
  m.apply(r, "a", "cancelRound", {}, 1);
  assert.equal(r.gameState.roundPoints, undefined);
  assert.equal(r.gameState.scores, undefined);
  assert.throws(() => m.apply(r, "a", "cancelRound", {}, 1));
  assert.equal(
    m.validateContent(loadServer("server/data/wavelength.json")).length,
    20,
  );
  assert.throws(() => m.validateSettings({ guesserUid: 4 }, []));
});
test("Heard retry is idempotent and no future hint is serialized", () => {
  const r = room();
  const first = r.gameState.turnOrder[0];
  m.apply(r, "a", "markHeard", { targetUid: first }, 1);
  m.apply(r, "a", "markHeard", { targetUid: first }, 1);
  assert.deepEqual(r.gameState.heardUids, [first]);
  assert.ok(!JSON.stringify(m.project(r, "a")).includes("piccantezza"));
});
test("Engine rejects stale tokens and spectators without mutating input", () => {
  const { applyCommand, createRoom } = loadServer("server/engine.ts");
  let r = createRoom("ABC123", "a", "A", 0);
  r = applyCommand(r, "b", { method: "join", args: ["B"] }, 0);
  r = applyCommand(r, "c", { method: "join", args: ["C"] }, 0);
  r = applyCommand(
    r,
    "a",
    { method: "wavelength.init", args: [{ cycles: 1 }] },
    0,
  );
  const expected = (x: any) => ({
    matchId: x.matchId,
    phase: x.gameState.phase,
    roundId: x.gameState.roundId,
    phaseVersion: x.gameState.phaseVersion,
  });
  r = applyCommand(
    r,
    "a",
    { method: "wavelength.start", expected: expected(r) },
    1,
  );
  r = applyCommand(r, "z", { method: "join", args: ["Z"] }, 1);
  const before = structuredClone(r);
  assert.throws(() =>
    applyCommand(
      r,
      "z",
      {
        method: "wavelength.markHeard",
        args: [{ targetUid: "b" }],
        expected: expected(r),
      },
      2,
    ),
  );
  assert.throws(() =>
    applyCommand(
      r,
      "b",
      {
        method: "wavelength.markHeard",
        args: [{ targetUid: "c", actor: "a" }],
        expected: expected(r),
      },
      2,
    ),
  );
  assert.deepEqual(r, before);
  const stale = expected(r);
  for (const targetUid of r.gameState.turnOrder)
    r = applyCommand(
      r,
      "a",
      {
        method: "wavelength.markHeard",
        args: [{ targetUid }],
        expected: expected(r),
      },
      2,
    );
  r = applyCommand(
    r,
    "a",
    { method: "wavelength.beginGuess", expected: expected(r) },
    3,
  );
  assert.throws(() =>
    applyCommand(
      r,
      "a",
      {
        method: "wavelength.submitGuess",
        args: [{ value: 5 }],
        expected: stale,
      },
      4,
    ),
  );
  const active = structuredClone(r);
  r = applyCommand(
    r,
    "a",
    {
      method: "wavelength.submitGuess",
      args: [{ value: r.gameState.target }],
      expected: expected(r),
    },
    4,
  );
  assert.equal(active.gameState.phase, "guessing");
  assert.equal(active.gameState.scores, undefined);
  assert.equal(r.gameState.scores, undefined);
});
test("Completed-round history persists without future secrets and end clears it", () => {
  const r = room();
  r.gameState.target = 8;
  assert.deepEqual(m.project(r, "a").gameState.history, []);
  for (const targetUid of r.gameState.turnOrder)
    m.apply(r, "a", "markHeard", { targetUid }, 1);
  m.apply(r, "a", "beginGuess", {}, 1);
  m.apply(r, "a", "submitGuess", { value: 7 }, 2);
  assert.deepEqual(r.gameState.history, [
    {
      roundId: 1,
      guesserUid: "a",
      target: 8,
      guess: 7,
      distance: 1,
      cancelled: false,
    },
  ]);
  m.end(r, 3); m.init(r, r.settings, 3); m.start(r, 3);
  const view = m.project(r, "b").gameState;
  assert.ok(!("target" in view));
  assert.equal(view.history.length, 0);
  m.apply(r, "a", "cancelRound", {}, 4);
  assert.equal(r.gameState.history.length, 1);
  assert.equal(r.gameState.history[0].cancelled, true);
  m.end(r, 5);
  assert.ok(!("history" in r.gameState));
});
