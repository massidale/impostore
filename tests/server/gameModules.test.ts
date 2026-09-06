import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
const { dispatchModule } = loadServer("server/gameDispatch.ts");
const fake = {
  id: "test",
  minPlayers: 3,
  maxPlayers: 10,
  validateSettings: (s: any) => s,
  validateContent: (c: any) => c,
  init: (r: any, s: any) => ({
    ...r,
    gameState: { phase: "setup", roundId: 0, phaseVersion: 0 },
  }),
  start: (r: any) => ({
    ...r,
    gameState: {
      ...r.gameState,
      phase: "answering",
      roundId: 1,
      phaseVersion: 1,
      answers: {},
    },
  }),
  end: (r: any) => ({ ...r, status: "lobby" }),
  apply: (r: any, actor: string, action: string, payload: any) => {
    if (action !== "answer") throw Error("unknown action");
    r.gameState.answers[actor] = payload.value;
    if (Object.keys(r.gameState.answers).length === 3) {
      r.gameState.phase = "results";
      r.gameState.phaseVersion++;
    }
    return r;
  },
  project: (r: any) => r,
};
function room() {
  return {
    id: "ABC123",
    hostId: "a",
    status: "lobby",
    currentGameId: "none",
    matchId: 0,
    createdAt: 1,
    updatedAt: 1,
    players: {
      a: { name: "A", joinedAt: 1, isHost: true },
      b: { name: "B", joinedAt: 2 },
      c: { name: "C", joinedAt: 3 },
    },
  };
}
const expected = (r: any) => ({
  matchId: r.matchId,
  phase: r.gameState.phase,
  roundId: r.gameState.roundId,
  phaseVersion: r.gameState.phaseVersion,
});
function call(
  r: any,
  actor: string,
  action: string,
  payload: any = {},
  token?: any,
) {
  return dispatchModule(r, actor, action, payload, token, 100, fake);
}
test("module lifecycle is restricted to host and selected game", () => {
  assert.throws(() => call(room(), "b", "init", {}), /host/);
  const initialized = call(room(), "a", "init", {});
  assert.equal(initialized.currentGameId, "test");
  assert.throws(
    () => call(initialized, "b", "start", {}, expected(initialized)),
    /host/,
  );
  assert.throws(
    () =>
      call(
        { ...initialized, currentGameId: "impostore" },
        "b",
        "answer",
        { value: 1 },
        expected(initialized),
      ),
    /gioco/i,
  );
});
test("same phase generation admits all simultaneous participant submissions", () => {
  let r = call(room(), "a", "init", {});
  r = call(r, "a", "start", {}, expected(r));
  const token = expected(r);
  assert.deepEqual(r.gameState.participantUids, ["a", "b", "c"]);
  for (const actor of ["a", "b", "c"])
    r = call(r, actor, "answer", { value: 1 }, token);
  assert.equal(r.gameState.phase, "results");
  assert.equal(Object.keys(r.gameState.answers).length, 3);
  assert.throws(
    () => call(r, "a", "answer", { value: 1 }, token),
    /aggiornat/i,
  );
});
test("late joiner and unknown actors cannot submit or configure content", () => {
  let r = call(room(), "a", "init", {});
  r = call(r, "a", "start", {}, expected(r));
  r.players.late = { name: "L", waiting: true };
  assert.throws(
    () => call(r, "late", "answer", { value: 1 }, expected(r)),
    /partecip/i,
  );
  assert.throws(
    () => call(r, "intruder", "answer", { value: 1 }, expected(r)),
    /stanza/,
  );
  assert.throws(() => call(r, "b", "setContent", [], expected(r)), /host/);
});
