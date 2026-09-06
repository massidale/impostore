/** Reproducible UI fixtures produced exclusively through real engine commands/projections.
 * Run: node --experimental-strip-types tests/ui/newGamesFixtures.ts /tmp/new-games.json
 * Omitting the destination runs the same coverage/determinism checks without writing.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { loadServer } from "../helpers/serverLoader.ts";

export interface NewGameFixture {
  name: string;
  gameId: string;
  playerId: string;
  host: boolean;
  room: any;
}
const ids = ["p0", "p1", "p2", "p3"];
const games = [
  "che-domanda",
  "wavelength",
  "just-one",
  "herd-mentality",
  "top-ten",
  "times-up",
];
const engine = loadServer(
  fileURLToPath(new URL("../../server/engine.ts", import.meta.url)),
);
const maxText = (prefix: string, length: number) =>
  prefix + "x".repeat(length).slice(0, length - prefix.length);

/** RTDB removes null children and empty collections, while preserving false and zero. */
export function pruneFirebase(value: any): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") return value;
  const entries = Object.entries(value)
    .map(([key, item]) => [key, pruneFirebase(item)] as const)
    .filter(([, item]) => item !== undefined);
  if (!entries.length) return undefined;
  if (Array.isArray(value))
    return entries.reduce((array: any[], [key, item]) => {
      array[Number(key)] = item;
      return array;
    }, []);
  return Object.fromEntries(entries);
}

export function generateFixtures(): NewGameFixture[] {
  const fixtures: NewGameFixture[] = [];
  const originalRandom = Math.random;
  let seed = 7262026;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    for (const stress of [false, true])
      for (const gameId of games) {
        let now = Date.UTC(2030, 0, 1); // Fixed future clock keeps interactive timer fixtures usable.
        let room = engine.createRoom(
          "UI2026",
          "p0",
          stress ? maxText("Alessandro", 30) : "Alessandro",
          now,
        );
        for (const [index, uid] of ids.slice(1).entries())
          room = engine.applyCommand(
            room,
            uid,
            {
              method: "join",
              args: [
                stress
                  ? maxText(["Beatrice", "Cristoforo", "Daniela"][index], 30)
                  : ["Beatrice", "Cristoforo", "Daniela"][index],
              ],
            },
            ++now,
          );
        const act = (action: string, payload?: any, actor = "p0") => {
          const s = room.gameState ?? {};
          room = engine.applyCommand(
            room,
            actor,
            {
              method: `${gameId}.${action}`,
              args: payload === undefined ? [] : [payload],
              expected: {
                matchId: room.matchId ?? 0,
                phase: s.phase,
                roundId: s.roundId ?? 0,
                phaseVersion: s.phaseVersion ?? 0,
                actionVersion: s.actionVersion,
              },
            },
            ++now,
          );
        };
        const snap = (label: string) => {
          for (const playerId of [
            ...ids,
            ...(room.players.latewaiting ? ["latewaiting"] : []),
          ])
            fixtures.push({
              name: `${gameId}-${stress ? "stress-" : ""}${label}-${playerId}`,
              gameId,
              playerId,
              host: playerId === "p0",
              room: engine.projectRoom(room, playerId),
            });
        };
        const question = (prefix: string) =>
          stress ? maxText(prefix, 120) : prefix;
        const word = (prefix: string) =>
          stress ? maxText(prefix, 60) : prefix;
        const settings =
          gameId === "che-domanda"
            ? { numImpostors: 1 }
            : gameId === "wavelength"
              ? { cycles: 1 }
              : gameId === "top-ten"
                ? { rounds: 3 }
                : gameId === "times-up"
                  ? {
                      turnSeconds: 30,
                      deckSize: 10,
                      teamMode: "manual",
                      manualTeams: {
                        p0: "blue",
                        p1: "red",
                        p2: "blue",
                        p3: "red",
                      },
                      contentSource: "players",
                    }
                  : { rounds: 5 };
        act("init", settings);
        const content =
          gameId === "che-domanda"
            ? [
                {
                  id: "question",
                  question: question("Quante vacanze desideri?"),
                  alternateQuestion: question("Quante vacanze hai fatto?"),
                  min: 0,
                  max: 100,
                  decimals: 0,
                },
              ]
            : gameId === "wavelength"
              ? Array.from({ length: 4 }, (_, i) => ({
                  id: `w${i}`,
                  text: question(`Esempi di felicità ${i}`),
                }))
              : gameId === "just-one"
                ? ["albero", "gatto", "tavolo", "nuvola", "montagna"].map(word)
                : gameId === "herd-mentality"
                  ? Array.from({ length: 5 }, (_, i) => ({
                      question: question(`Scegli una cosa famosa numero ${i}`),
                    }))
                  : gameId === "top-ten"
                    ? Array.from({ length: 3 }, (_, i) => ({
                        id: `theme${i}`,
                        prompt: question(`Interpreta una reazione numero ${i}`),
                        lowLabel: question("Una reazione appena percettibile"),
                        highLabel: question(
                          "Una reazione assolutamente esagerata",
                        ),
                      }))
                    : Array.from({ length: 10 }, (_, i) =>
                        word(`Personaggio ${i}`),
                      );
        act("setContent", content);
        snap("lobby");
        act("start");
        room = engine.applyCommand(
          room,
          "latewaiting",
          {
            method: "join",
            args: [stress ? maxText("Spettatore", 30) : "Spettatore"],
          },
          ++now,
        );
        snap("start");
        if (gameId === "che-domanda") {
          for (const [i, uid] of ids.entries()) {
            act("submitAnswer", { value: (i + 1) * 12 }, uid);
            if (i === 0) snap("answer-submitted");
          }
          snap("discussion");
          while (room.gameState.speakerIndex < ids.length)
            act("nextSpeaker", {
              expectedSpeakerIndex: room.gameState.speakerIndex,
            });
          snap("discussion-complete");
          act("startVoting");
          snap("voting");
          const impostor = room.gameState.impostorUids[0];
          for (const uid of ids)
            act(
              "castVote",
              {
                targetUid:
                  uid === impostor ? ids.find((u) => u !== impostor) : impostor,
              },
              uid,
            );
          snap("elimination");
          act("continueRound");
          snap("final");
        } else if (gameId === "wavelength") {
          for (let round = 0; round < 4; round++) {
            const guesser = room.gameState.guesserUid;
            for (const uid of room.gameState.turnOrder)
              act("markHeard", { targetUid: uid }, guesser);
            if (round === 0) snap("clues-complete");
            act("beginGuess", undefined, guesser);
            snap(`guessing-${round}`);
            act("submitGuess", { value: room.gameState.target }, guesser);
            snap(`round-results-${round}`);
            act("nextRound");
          }
          snap("final");
        } else if (gameId === "just-one") {
          for (let round = 0; round < 5; round++) {
            const guesser = room.gameState.guesserUid,
              authors = ids.filter((uid) => uid !== guesser);
            for (const [i, uid] of authors.entries())
              act(
                "submitClue",
                {
                  text: stress
                    ? ["A", "B", "C"][i].repeat(30)
                    : ["verde", "felice", "caldo"][i],
                },
                uid,
              );
            snap(`review-${round}`);
            if (round === 0) {
              act("flagClue", { authorUid: authors[1] }, authors[0]);
              snap("review-flagged");
            }
            for (const uid of authors) act("confirmReview", undefined, uid);
            snap(`guessing-${round}`);
            act(
              "submitGuess",
              { text: room.gameState.private.current.word },
              guesser,
            );
            snap(`round-results-${round}`);
            act("nextRound");
          }
          snap("final");
        } else if (gameId === "herd-mentality") {
          for (let round = 0; round < 5; round++) {
            for (const [i, uid] of ids.entries()) {
              act(
                "submitAnswer",
                {
                  text: word(
                    round === 0
                      ? `Risposta diversa ${i}`
                      : i < 3
                        ? "Risposta comune"
                        : "Altra risposta",
                  ),
                },
                uid,
              );
              if (round === 0 && i === 0) snap("answer-submitted");
            }
            snap(`review-${round}`);
            if (round === 1) {
              act("mergeGroups", {
                groupIds: room.gameState.groups.map((g: any) => g.id),
              });
              snap("review-merged");
              act("undoMerge");
              snap("review-undo");
            }
            act("confirmResults");
            snap(
              round === 0
                ? "all-different-tied-results"
                : `round-results-${round}`,
            );
            act("nextRound");
          }
          snap("final");
        } else if (gameId === "top-ten") {
          for (let round = 0; round < 3; round++) {
            snap(`performing-${round}`);
            for (const uid of room.gameState.performanceOrder)
              act("markPerformed", { playerUid: uid });
            snap(`performed-${round}`);
            act("beginOrdering");
            snap(`ordering-${round}`);
            act(
              "submitOrder",
              {
                uids: [...ids].sort(
                  (a, b) =>
                    room.gameState.private.numbersByUid[a] -
                    room.gameState.private.numbersByUid[b],
                ),
              },
              room.gameState.captainUid,
            );
            snap(`round-results-${round}`);
            act("nextRound");
          }
          snap("final");
        } else {
          snap("collecting");
          for (const [i, uid] of ids.entries())
            act(
              "submitNames",
              { names: (content as string[]).filter((_, n) => n % 4 === i) },
              uid,
            );
          snap("collecting-submitted");
          act("beginTurn");
          snap("ready");
          act("beginTurn");
          snap("turn");
          act(
            "resolveCard",
            { actionVersion: room.gameState.actionVersion, outcome: "skip" },
            room.gameState.describerUid,
          );
          snap("turn-can-undo");
          act(
            "undoCard",
            { actionVersion: room.gameState.actionVersion },
            room.gameState.describerUid,
          );
          snap("turn-undo");
          act("endTurn");
          snap("turn-results");
          act("beginTurn");
          for (let round = 1; round <= 3; round++) {
            snap(`turn-round-${round}`);
            while (room.gameState.phase === "turn")
              act(
                "resolveCard",
                {
                  actionVersion: room.gameState.actionVersion,
                  outcome: "correct",
                },
                room.gameState.describerUid,
              );
            snap(round === 3 ? "final" : `round-results-${round}`);
            if (round < 3) {
              act("nextRound");
              snap(`ready-round-${round + 1}`);
              act("beginTurn");
            }
          }
        }
      }
  } finally {
    Math.random = originalRandom;
  }
  return fixtures;
}

export function selfCheck(fixtures = generateFixtures()): void {
  assert.equal(
    new Set(fixtures.map((f) => f.name)).size,
    fixtures.length,
    "Names must be unique",
  );
  const required: Record<string, string[]> = {
    "che-domanda": [
      "answering",
      "discussion",
      "voting",
      "elimination",
      "results",
    ],
    wavelength: ["clues", "guessing", "roundResults", "results"],
    "just-one": ["clues", "review", "guessing", "roundResults", "results"],
    "herd-mentality": ["answering", "review", "roundResults", "results"],
    "top-ten": ["performing", "ordering", "roundResults", "results"],
    "times-up": [
      "collecting",
      "ready",
      "turn",
      "turnResults",
      "roundResults",
      "results",
    ],
  };
  for (const [game, phases] of Object.entries(required))
    for (const phase of phases)
      for (const playerId of ["p0", "p1", "latewaiting"])
        assert(
          fixtures.some(
            (f) =>
              f.gameId === game &&
              f.room.gameState.phase === phase &&
              f.playerId === playerId,
          ),
          `${game}/${phase}/${playerId}`,
        );
  const tied = fixtures.find(
    (f) => f.name === "herd-mentality-all-different-tied-results-p0",
  )!;
  assert.deepEqual(tied.room.gameState.roundResult.winners, []);
  assert.equal(
    pruneFirebase(tied.room).gameState.roundResult.winners,
    undefined,
  );
  assert.deepEqual(
    fixtures,
    generateFixtures(),
    "Fixtures must be deterministic",
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const fixtures = generateFixtures();
  selfCheck(fixtures);
  if (process.argv[2])
    writeFileSync(process.argv[2], JSON.stringify(fixtures, null, 2) + "\n");
  console.log(
    `Verified ${fixtures.length} deterministic fixtures across ${games.length} games.`,
  );
}
