import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
test("immutable round deck", () => {
  const { resetRoundDeck: f } = loadServer("server/games/times-up.ts");
  const ids = ["a", "b", "c"];
  assert.deepEqual(
    f(ids, (a: string[]) => a.reverse()),
    ["c", "b", "a"],
  );
  assert.deepEqual(ids, ["a", "b", "c"]);
});
const room = () => ({
  id: "ROOM01",
  hostId: "a",
  status: "active",
  settings: {
    turnSeconds: 45,
    deckSize: 10,
    teamMode: "manual",
    manualTeams: { a: "blue", b: "blue", c: "red", d: "red" },
    contentSource: "default",
  },
  players: Object.fromEntries(
    ["a", "b", "c", "d"].map((uid) => [uid, { name: uid }]),
  ),
  gameState: {
    participantUids: ["a", "b", "c", "d"],
    roundId: 0,
    phaseVersion: 0,
  },
});
test("complete three rounds same IDs, skips, stale cards and private views", () => {
  const m = loadServer("server/games/times-up.ts").timesUpModule,
    r: any = room();
  m.start(r, 0);
  const ids = r.gameState.private.originalDeck.map((c: any) => c.id).sort();
  for (let round = 1; round <= 3; round++) {
    const s = r.gameState;
    assert.equal(s.roundNumber, round);
    assert.deepEqual([...s.private.pendingCardIds].sort(), ids);
    m.apply(r, "a", "beginTurn", {}, 0);
    const actor = s.describerUid;
    for (const uid of ["a", "b", "c", "d", "late"]) {
      const v = m.project(r, uid);
      assert.equal(v.gameState.private, undefined);
      assert.equal(!!v.gameState.currentCard, uid === actor);
      assert.equal(v.gameState.originalDeck, undefined);
    }
    const first = s.private.pendingCardIds[0],
      v = s.actionVersion;
    m.apply(r, actor, "resolveCard", { outcome: "skip", actionVersion: v }, 1);
    assert.equal(s.private.pendingCardIds.at(-1), first);
    assert.throws(() =>
      m.apply(
        r,
        actor,
        "resolveCard",
        { outcome: "correct", actionVersion: v },
        2,
      ),
    );
    m.apply(r, actor, "undoCard", { actionVersion: s.actionVersion }, 3);
    assert.equal(s.private.pendingCardIds[0], first);
    assert.throws(() =>
      m.apply(r, actor, "undoCard", { actionVersion: s.actionVersion }, 4),
    );
    const solved = [];
    for (let i = 0; i < 10; i++) {
      solved.push(s.private.pendingCardIds[0]);
      m.apply(
        r,
        actor,
        "resolveCard",
        { outcome: "correct", actionVersion: s.actionVersion },
        i + 5,
      );
    }
    assert.deepEqual(solved.sort(), ids);
    assert.throws(() =>
      m.apply(r, actor, "undoCard", { actionVersion: s.actionVersion }, 20),
    );
    assert.equal(s.phase, round === 3 ? "results" : "roundResults");
    if (round < 3) m.apply(r, "a", "nextRound", {}, 21);
  }
  assert.equal(r.gameState.scores.blue + r.gameState.scores.red, 30);
  assert.equal(r.gameState.roundNumber, 3);
  assert.throws(() => m.apply(r, "a", "nextRound", {}, 99));
});
test("deadline preserves unresolved card; expired card cannot score", () => {
  const m = loadServer("server/games/times-up.ts").timesUpModule,
    r: any = room();
  m.start(r, 0);
  m.apply(r, "a", "beginTurn", {}, 10);
  const s = r.gameState,
    ids = [...s.private.pendingCardIds];
  m.apply(
    r,
    s.describerUid,
    "resolveCard",
    { outcome: "correct", actionVersion: s.actionVersion },
    45010,
  );
  assert.equal(s.phase, "turnResults");
  assert.deepEqual(s.private.pendingCardIds, ids);
  assert.equal(s.scores.blue, 0);
});
test("private player contributions, normalized deduplication, insufficiency and manual validation", () => {
  const m = loadServer("server/games/times-up.ts").timesUpModule,
    r: any = room();
  r.settings.contentSource = "players";
  m.start(r, 0);
  m.apply(r, "a", "submitNames", { names: ["Caffè", "CAFFE"] }, 0);
  assert.equal(m.project(r, "a").gameState.collectedCount, 1);
  assert.equal(JSON.stringify(m.project(r, "b")).includes("Caffè"), false);
  assert.throws(() => m.apply(r, "a", "beginTurn", {}, 0));
  m.apply(r, "a", "submitNames", { names: ["new"] }, 0);
  assert.deepEqual(m.project(r, "a").gameState.ownNames, ["new"]);
  m.apply(
    r,
    "b",
    "submitNames",
    { names: Array.from({ length: 10 }, (_, i) => `Persona ${i}`) },
    0,
  );
  m.apply(r, "a", "beginTurn", {}, 0);
  assert.equal(r.gameState.phase, "ready");
  assert.throws(() =>
    m.validateSettings({ ...r.settings, manualTeams: { a: "blue" } }, [
      "a",
      "b",
      "c",
      "d",
    ]),
  );
});
test("next describer owns next turn; host cancellation preserves scored and pending cards", () => {
  const m = loadServer("server/games/times-up.ts").timesUpModule,
    r: any = room();
  m.start(r, 0);
  m.apply(r, "a", "beginTurn", {}, 0);
  const s = r.gameState;
  assert.throws(() => m.apply(r, "b", "endTurn", {}, 1));
  m.apply(
    r,
    s.describerUid,
    "resolveCard",
    { outcome: "correct", actionVersion: s.actionVersion },
    1,
  );
  const pending = [...s.private.pendingCardIds];
  m.apply(r, "a", "cancelRound", {}, 2);
  assert.equal(s.scores.blue, 1);
  assert.deepEqual(s.private.pendingCardIds, pending);
  assert.equal(s.describerUid, "c");
  m.apply(r, "c", "beginTurn", {}, 3);
  assert.equal(s.team, "red");
  m.apply(r, "a", "endTurn", {}, 4);
  assert.equal(s.describerUid, "b");
  m.apply(r, "b", "beginTurn", {}, 5);
  assert.equal(s.team, "blue");
  assert.throws(() => m.apply(r, "b", "endTurn", {}, 6));
});
test("editorial and custom decks enforce names, counts and unique IDs", () => {
  const m = loadServer("server/games/times-up.ts").timesUpModule;
  const data = loadServer("server/data/times-up.json");
  assert.ok(data.length >= 100);
  assert.equal(m.validateContent(data).length, data.length);
  assert.throws(() =>
    m.validateContent([
      { id: "same", name: "Uno" },
      { id: "same", name: "Due" },
    ]),
  );
  assert.throws(() => m.validateContent([""]));
  const r: any = room();
  r.settings.contentSource = "custom";
  assert.throws(() => m.start(r, 0));
  r.gameData = {
    "times-up": { content: Array.from({ length: 10 }, (_, i) => `Nome ${i}`) },
  };
  m.start(r, 0);
  assert.equal(r.gameState.private.originalDeck.length, 10);
  assert.equal(JSON.stringify(m.project(r, "late")).includes("Nome 0"), false);
});
