import test from "node:test";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";
const get = () => loadServer("server/games/just-one.ts");
const room = () => ({
  id: "room",
  currentGameId: "just-one",
  hostId: "a",
  status: "playing",
  matchId: 1,
  settings: {},
  players: Object.fromEntries(["a", "b", "c"].map((u) => [u, { name: u }])),
  gameState: { participantUids: ["a", "b", "c"] },
});
test("all normalized duplicates disappear, related words stay", () => {
  const { survivingClues } = get();
  assert.deepEqual(survivingClues({ a: "Caffè", b: "CAFFE", c: "bar" }), [
    "bar",
  ]);
  assert.deepEqual(survivingClues({ a: "mare", b: "mare", c: "mare" }), []);
  assert.equal(survivingClues({ a: "mare", b: "marino" }).length, 2);
});
test("complete cooperative match, host guesser privacy, aliases and outcome history", () => {
  const m = get().justOneModule;
  let r: any = room();
  m.init(r, { rounds: 5 }, 0);
  r.gameState.participantUids = ["a", "b", "c"];
  m.start(r, 0);
  for (let i = 0; i < 1; i++) {
    const s = r.gameState;
    const guesser = s.guesserUid;
    const authors = s.participantUids.filter((u: string) => u !== guesser);
    assert.equal(m.project(r, guesser).gameState.target, undefined);
    assert.equal(
      JSON.stringify(m.project(r, guesser)).includes("private"),
      false,
    );
    m.apply(r, authors[0], "submitClue", { text: "brina" }, 0);
    assert.throws(() =>
      m.apply(r, authors[0], "submitClue", { text: "sole" }, 0),
    );
    m.apply(r, authors[1], "submitClue", { text: "luce" }, 0);
    assert.equal(s.phase, "review");
    assert.equal(m.project(r, guesser).gameState.reviewClues, undefined);
    for (const u of authors) m.apply(r, u, "confirmReview", {}, 0);
    assert.equal(s.phase, "guessing");
    assert.equal(m.project(r, guesser).gameState.validClues.length, 2);
    m.apply(
      r,
      guesser,
      "submitGuess",
      { text: s.private.current.aliases[0] || s.private.current.word },
      0,
    );
    assert.equal(s.history.filter((h: any) => h.correct).length, i + 1);
    assert.throws(() => m.apply(r, guesser, "pass", {}, 0));
    assert.equal(s.phase, "results");
  }
  assert.equal(r.gameState.phase, "results");
  assert.equal(r.gameState.history.filter((h: any) => h.correct).length, 1);
});
test("review requires two distinct flags, validates role and no-clue failure", () => {
  const m = get().justOneModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  const g = r.gameState.guesserUid;
  const [a, b] = ["a", "b", "c"].filter((u) => u !== g);
  assert.throws(() => m.apply(r, g, "submitClue", { text: "sole" }, 0));
  assert.throws(() => m.apply(r, a, "submitClue", { text: "due parole" }, 0));
  m.apply(r, a, "submitClue", { text: "sole" }, 0);
  m.apply(r, b, "submitClue", { text: "luna" }, 0);
  m.apply(r, a, "flagClue", { authorUid: b }, 0);
  m.apply(r, a, "flagClue", { authorUid: b }, 0);
  assert.equal(
    m.project(r, a).gameState.reviewClues.find((c: any) => c.authorUid === b)
      .invalid,
    false,
  );
  m.apply(r, b, "flagClue", { authorUid: b }, 0);
  m.apply(r, a, "withdrawClue", {}, 0);
  m.apply(r, a, "confirmReview", {}, 0);
  assert.throws(() => m.apply(r, a, "withdrawClue", {}, 0));
  m.apply(r, b, "confirmReview", {}, 0);
  assert.equal(r.gameState.phase, "results");
  assert.equal(r.gameState.history.filter((h: any) => h.correct).length, 0);
});
test("content, Unicode, bounds, target rejection and spectator projections", () => {
  const { justOneModule: m, normalizeClue } = get();
  assert.equal(normalizeClue("L’ÀGO"), "l'ago");
  assert.equal(normalizeClue("caffe\u0300"), "caffe");
  assert.throws(() => m.validateSettings({ rounds: 4, mode: "teams" }, []));
  assert.throws(() => m.validateSettings({ rounds: 21, mode: "teams" }, []));
  assert.throws(() => m.validateContent(["Caffè", "CAFFE"]));
  assert.throws(() => m.validateContent([{ word: "x", aliases: 42 }]));
  assert.throws(() => m.validateContent(Array(1001).fill("x")));
  const defaults = loadServer("server/data/just-one.json");
  assert.ok(defaults.length >= 100);
  assert.equal(new Set(defaults.map((v: any) => v.id)).size, defaults.length);
  assert.equal(m.validateContent(defaults).length, defaults.length);
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  const g = r.gameState.guesserUid;
  const a = ["a", "b", "c"].find((u) => u !== g)!;
  assert.throws(() =>
    m.apply(
      r,
      a,
      "submitClue",
      { text: r.gameState.private.current.word.toUpperCase() },
      0,
    ),
  );
  for (const clue of ["a b", "123", "😀", "'ciao", "a".repeat(31)])
    assert.throws(() => m.apply(r, a, "submitClue", { text: clue }, 0));
  assert.throws(() => m.apply(r, "late", "submitClue", { text: "brina" }, 0));
  const projected = m.project(r, "late");
  assert.equal(projected.gameState.target, undefined);
  assert.equal(projected.gameData, undefined);
  assert.equal(projected.gameState.private, undefined);
  assert.throws(() => m.apply(r, "b", "cancelRound", {}, 0));
  m.apply(r, "a", "cancelRound", {}, 0);
  assert.equal(r.gameState.roundResult.points, undefined);
  assert.equal(r.gameState.phase, "results");
  m.end(r, 10);
  assert.equal(r.status, "lobby");
  assert.deepEqual(r.gameState, {});
});
test("all duplicate clues automatically fail after review; one flag keeps a clue", () => {
  const m = get().justOneModule;
  for (const duplicate of [true, false]) {
    const r: any = room();
    m.init(r, { rounds: 5 }, 0);
    m.start(r, 0);
    const [a, b] = ["a", "b", "c"].filter((u) => u !== r.gameState.guesserUid);
    m.apply(r, a, "submitClue", { text: "Caffè" }, 0);
    m.apply(r, b, "submitClue", { text: duplicate ? "CAFFE" : "bar" }, 0);
    if (!duplicate) m.apply(r, a, "flagClue", { authorUid: b }, 0);
    m.apply(r, a, "confirmReview", {}, 0);
    m.apply(r, b, "confirmReview", {}, 0);
    assert.equal(r.gameState.phase, duplicate ? "results" : "guessing");
    if (!duplicate) assert.equal(r.gameState.validClues.length, 2);
  }
});
test("editorial alias accepted; pass and incorrect guesses consume words without points", () => {
  const m = get().justOneModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  r.gameState.private.current = loadServer("server/data/just-one.json").find(
    (entry: any) => entry.aliases.length > 0,
  );
  for (let i = 0; i < 3; i++) {
    const s = r.gameState;
    const authors = s.participantUids.filter((u: string) => u !== s.guesserUid);
    for (const [index, u] of authors.entries())
      m.apply(r, u, "submitClue", { text: index ? "brina" : "luce" }, 0);
    for (const u of authors) m.apply(r, u, "confirmReview", {}, 0);
    if (i === 0)
      m.apply(
        r,
        s.guesserUid,
        "submitGuess",
        { text: s.private.current.aliases[0] || s.private.current.word },
        0,
      );
    if (i === 1) m.apply(r, s.guesserUid, "pass", {}, 0);
    if (i === 2) m.apply(r, s.guesserUid, "submitGuess", { text: "errore" }, 0);
    assert.equal(s.history.filter((h: any) => h.correct).length, i === 0 ? 1 : 0);
    assert.equal(s.phase, "results");
    if (i < 2) { m.end(r, 0); m.init(r, r.settings, 0); m.start(r, 0); }
  }
  assert.equal(r.gameState.roundIndex, 0);
  assert.equal(r.gameState.history.length, 1);
});
test("an identical clue retry is idempotent while collection stays open", () => {
  const m = get().justOneModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  const u = r.gameState.participantUids.find(
    (p: string) => p !== r.gameState.guesserUid,
  );
  m.apply(r, u, "submitClue", { text: "brina" }, 0);
  const before = structuredClone(r);
  assert.doesNotThrow(() => m.apply(r, u, "submitClue", { text: "brina" }, 0));
  assert.deepEqual(r, before);
  assert.throws(() => m.apply(r, u, "submitClue", { text: "diverso" }, 0));
});
test("host dashboard is a compact footer, not a second player screen", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(
    "src/games/just-one/components/HostDashboard.tsx",
    "utf8",
  );
  assert.equal(source.includes("<PlayerGamepad"), false);
  assert.ok(source.includes("HostDashboardShell"));
});
test("combining marks alone cannot become an invisible clue, target or alias", () => {
  const m = get().justOneModule;
  const r: any = room();
  m.init(r, { rounds: 5 }, 0);
  m.start(r, 0);
  const u = r.gameState.participantUids.find(
    (p: string) => p !== r.gameState.guesserUid,
  );
  assert.throws(() => m.apply(r, u, "submitClue", { text: "\u0301" }, 0));
  assert.throws(() => m.apply(r, u, "submitClue", { text: "\u0301a" }, 0));
  assert.throws(() => m.validateContent(["\u0301"]));
  assert.throws(() =>
    m.validateContent([{ word: "casa", aliases: ["\u0301"] }]),
  );
});
