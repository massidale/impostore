import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
test("Che domanda dominio numerico", () => {
  const { parseNumericAnswer } = loadServer("server/games/che-domanda.ts");
  const d = { min: 0, max: 100, decimals: 1 };
  assert.equal(parseNumericAnswer("0", d), 0);
  assert.equal(parseNumericAnswer("1,5", d), 1.5);
  for (const bad of ["", "Infinity", "1e2", "101", "1,25"])
    assert.throws(() => parseNumericAnswer(bad, d));
});
const { cheDomandaModule: m } = loadServer("server/games/che-domanda.ts");
function room(n = 3, imps = 1) {
  const ids = ["a", "b", "c", "d", "e"].slice(0, n);
  const r: any = {
    id: "TEST",
    hostId: "a",
    status: "active",
    currentGameId: "che-domanda",
    matchId: 1,
    players: Object.fromEntries(ids.map((id) => [id, { name: id }])),
    gameState: {},
  };
  m.init(r, { numImpostors: imps, votingSeconds: 60 }, 0);
  m.start(r, 0);
  r.gameState.impostorUids = ids.slice(-imps);
  return r;
}
function answer(r: any) {
  for (const id of r.gameState.participantUids)
    m.apply(r, id, "submitAnswer", { value: 0 }, 1);
}
function voting(r: any) {
  for (const _ of r.gameState.speakerOrder)
    m.apply(
      r,
      "a",
      "nextSpeaker",
      { expectedSpeakerIndex: r.gameState.speakerIndex },
      2,
    );
  m.apply(r, "a", "startVoting", {}, 3);
}
test("Secrets allowlists and simultaneous answer phase version, zero accepted", () => {
  const r = room();
  r.players.z = { waiting: true };
  const phaseVersion = r.gameState.phaseVersion;
  for (const id of ["a", "b"]) {
    const p = m.project(r, id).gameState;
    assert.equal(p.ownQuestion, r.gameState.questionPair.question);
    assert.ok(!("roles" in p));
    assert.ok(!("questionPair" in p));
    m.apply(r, id, "submitAnswer", { value: 0 }, 1);
    assert.equal(r.gameState.phaseVersion, phaseVersion);
  }
  assert.equal(
    m.project(r, "c").gameState.ownQuestion,
    r.gameState.questionPair.alternateQuestion,
  );
  assert.ok(!("ownQuestion" in m.project(r, "z").gameState));
  assert.ok(!("answersByUid" in m.project(r, "a").gameState));
  assert.throws(() => m.apply(r, "a", "submitAnswer", { value: 1 }, 1));
  m.apply(r, "c", "submitAnswer", { value: 0 }, 1);
  assert.equal(r.gameState.phase, "discussion");
  assert.equal(r.gameState.phaseVersion, phaseVersion + 1);
  assert.deepEqual(m.project(r, "a").gameState.answersByUid, {
    a: 0,
    b: 0,
    c: 0,
  });
  assert.ok(!JSON.stringify(m.project(r, "a")).includes("alternateQuestion"));
});
test("Full game civilians win after expelling last impostor", () => {
  const r = room();
  answer(r);
  voting(r);
  m.apply(r, "a", "castVote", { targetUid: "c" }, 4);
  m.apply(r, "b", "castVote", { targetUid: "c" }, 4);
  assert.equal(m.project(r, "a").gameState.ownVote, "c");
  assert.ok(!("votesByUid" in m.project(r, "a").gameState));
  m.apply(r, "c", "castVote", { targetUid: "a" }, 4);
  assert.equal(r.gameState.phase, "elimination");
  assert.equal(r.gameState.winner, "civili");
  m.apply(r, "a", "continueRound", {}, 5);
  assert.equal(r.gameState.phase, "results");
  assert.equal(m.project(r, "b").gameState.roles.c, "impostore");
  assert.equal(
    m.project(r, "b").gameState.alternateQuestion,
    r.gameState.questionPair.alternateQuestion,
  );
});
test("Civilian elimination at parity produces impostor win", () => {
  const r = room(5, 2);
  answer(r);
  voting(r);
  for (const id of ["b", "c", "d", "e"])
    m.apply(r, id, "castVote", { targetUid: "a" }, 4);
  m.apply(r, "a", "castVote", { targetUid: "b" }, 4);
  assert.equal(r.gameState.winner, "impostori");
});
test("Single runoff, second tie expels nobody; timeout abstains and role checks", () => {
  const r = room();
  answer(r);
  assert.throws(() => m.apply(r, "b", "startVoting", {}, 2));
  voting(r);
  assert.throws(() => m.apply(r, "a", "castVote", { targetUid: "a" }, 4));
  for (const [id, target] of [
    ["a", "b"],
    ["b", "c"],
    ["c", "a"],
  ])
    m.apply(r, id, "castVote", { targetUid: target }, 4);
  assert.equal(r.gameState.runoff, true);
  assert.equal(r.gameState.votingEndsAt, 30004);
  for (const [id, target] of [
    ["a", "b"],
    ["b", "c"],
    ["c", "a"],
  ])
    m.apply(r, id, "castVote", { targetUid: target }, 5);
  assert.equal(r.gameState.phase, "elimination");
  assert.equal(r.gameState.elimination, null);
  m.apply(r, "a", "continueRound", {}, 6);
  voting(r);
  assert.throws(() => m.apply(r, "a", "closeVoting", {}, 60002));
  m.apply(r, "a", "closeVoting", {}, 60003);
  assert.equal(r.gameState.elimination, null);
  assert.equal(r.gameState.winner, null);
});
test("Content domain precision and settings validated", () => {
  assert.equal(
    m.validateContent(loadServer("server/data/che-domanda.json")).length,
    30,
  );
  assert.throws(() => m.validateSettings({ numImpostors: 2 }, ["a", "b", "c"]));
  assert.throws(() =>
    m.validateContent([
      {
        id: "x",
        question: "q",
        alternateQuestion: "a",
        min: 0,
        max: Infinity,
        decimals: 0,
      },
    ]),
  );
  const r = room();
  for (const value of [NaN, Infinity, "1", -1, 1001, 0.5])
    assert.throws(() => m.apply(r, "a", "submitAnswer", { value }, 0));
});
test("Retry same answer is harmless, host cannot advance twice with the same speaker index", () => {
  const r = room();
  m.apply(r, "a", "submitAnswer", { value: 0 }, 1);
  const snapshot = structuredClone(r);
  m.apply(r, "a", "submitAnswer", { value: 0 }, 1);
  assert.deepEqual(r, snapshot);
  m.apply(r, "b", "submitAnswer", { value: 0 }, 1);
  m.apply(r, "c", "submitAnswer", { value: 0 }, 1);
  m.apply(r, "a", "nextSpeaker", { expectedSpeakerIndex: 0 }, 2);
  assert.throws(() =>
    m.apply(r, "a", "nextSpeaker", { expectedSpeakerIndex: 0 }, 2),
  );
  assert.equal(r.gameState.speakerIndex, 1);
});
test("Several impostors remain in play after an impostor elimination, eliminated cannot vote", () => {
  const r = room(5, 2);
  answer(r);
  voting(r);
  for (const id of ["a", "b", "c", "d"])
    m.apply(r, id, "castVote", { targetUid: "e" }, 4);
  m.apply(r, "e", "castVote", { targetUid: "a" }, 4);
  assert.equal(r.gameState.winner, null);
  assert.deepEqual(r.gameState.eliminatedUids, ["e"]);
  m.apply(r, "a", "continueRound", {}, 5);
  voting(r);
  assert.throws(() => m.apply(r, "e", "castVote", { targetUid: "a" }, 6));
  for (const id of ["a", "b", "c"])
    m.apply(r, id, "castVote", { targetUid: "d" }, 6);
  m.apply(r, "d", "castVote", { targetUid: "a" }, 6);
  assert.equal(r.gameState.winner, "civili");
  m.apply(r, "a", "continueRound", {}, 7);
  assert.equal(r.gameState.phase, "results");
});
test("Engine freezes participants and rejects prior match or phase; answers atomic", () => {
  const { applyCommand, createRoom } = loadServer("server/engine.ts");
  let r = createRoom("ABC123", "a", "A", 0);
  r = applyCommand(r, "b", { method: "join", args: ["B"] }, 0);
  r = applyCommand(r, "c", { method: "join", args: ["C"] }, 0);
  r = applyCommand(r, "a", { method: "che-domanda.init", args: [{}] }, 0);
  const expected = (x: any) => ({
    matchId: x.matchId,
    phase: x.gameState.phase,
    roundId: x.gameState.roundId,
    phaseVersion: x.gameState.phaseVersion,
  });
  r = applyCommand(
    r,
    "a",
    { method: "che-domanda.start", expected: expected(r) },
    1,
  );
  const token = expected(r);
  r = applyCommand(r, "z", { method: "join", args: ["Z"] }, 1);
  assert.throws(() =>
    applyCommand(
      r,
      "z",
      {
        method: "che-domanda.submitAnswer",
        args: [{ value: 0 }],
        expected: token,
      },
      2,
    ),
  );
  const original = structuredClone(r);
  for (const id of ["a", "b", "c"])
    r = applyCommand(
      r,
      id,
      {
        method: "che-domanda.submitAnswer",
        args: [{ value: 0, actor: "z" }],
        expected: token,
      },
      2,
    );
  assert.deepEqual(original.gameState.answersByUid, {});
  assert.equal(r.gameState.phase, "discussion");
  assert.equal(r.gameState.participantUids.length, 3);
  assert.throws(() =>
    applyCommand(
      r,
      "a",
      {
        method: "che-domanda.nextSpeaker",
        args: [{ expectedSpeakerIndex: 0 }],
        expected: token,
      },
      3,
    ),
  );
  assert.throws(() =>
    applyCommand(
      r,
      "a",
      {
        method: "che-domanda.nextSpeaker",
        args: [{ expectedSpeakerIndex: 0 }],
        expected: { ...expected(r), matchId: 0 },
      },
      3,
    ),
  );
});
test("Custom domains must contain a representable answer with safe scaled bounds", () => {
  const pair = {
    id: "domain",
    question: "Quanti?",
    alternateQuestion: "Quante?",
    min: 0.1,
    max: 0.9,
    decimals: 0,
  };
  assert.throws(() => m.validateContent([pair]));
  assert.throws(() =>
    m.validateContent([{ ...pair, min: 1e308, max: 1.1e308, decimals: 3 }]),
  );
  assert.throws(() =>
    m.validateContent([
      { ...pair, min: 0, max: Number.MAX_SAFE_INTEGER, decimals: 3 },
    ]),
  );
  assert.doesNotThrow(() =>
    m.validateContent([{ ...pair, min: 0.29, max: 0.291, decimals: 2 }]),
  );
  assert.doesNotThrow(() =>
    m.validateContent([{ ...pair, min: 0.289, max: 0.29, decimals: 2 }]),
  );
  assert.throws(() =>
    m.validateContent([{ ...pair, min: 0.29001, max: 0.29999, decimals: 2 }]),
  );
});

test("Host opens voting after discussion without confirming every speaker", () => {
  const r = room();
  answer(r);
  assert.equal(r.gameState.speakerIndex, 0);
  m.apply(r, "a", "startVoting", {}, 3);
  assert.equal(r.gameState.phase, "voting");
});
