import {guesserSetting, restoreGuesser, beginGuesserMatch, completeGuesserMatch} from '../guesserRotation';
import data from "../data/wavelength.json";
import type { Room } from "../runtime";
import {
  type GameModule,
  check,
  int,
  text,
  participants,
  shuffled,
  phase,
  hostOnly,
  endGame,
  publicRoom,
} from "../gameModule";
export interface WavelengthSettings {
  guesserUid?: string | null;
}
export interface WavelengthRoundResult {
  roundId: number;
  guesserUid: string;
  target: number;
  guess: number | null;
  distance: number | null;
  cancelled: boolean;
}
export interface WavelengthState {
  history: WavelengthRoundResult[];
  phase: string;
  roundId: number;
  phaseVersion: number;
  participantUids: string[];
  turnIndex: number;
  guesserUid: string;
  turnOrder: string[];
  heardUids: string[];
  target: number;
  suggestion: string;
  guess?: number;
  distance?: number;
  cancelled?: boolean;
}
function next(room: Room): void {
  const s = room.gameState as WavelengthState;
  const ids = participants(room);
  s.roundId = (s.roundId ?? 0) + 1;
  beginGuesserMatch(room);
  s.turnOrder = shuffled(ids.filter((id) => id !== s.guesserUid));
  s.heardUids = [];
  s.target = Math.floor(Math.random() * 10) + 1;
  const content = data;
  s.suggestion = content[Math.floor(Math.random() * content.length)]?.text ?? "";
  delete s.guess;
  delete s.distance;
  delete s.cancelled;
  phase(room, "clues");
}
export const wavelengthModule: GameModule = {
  id: "wavelength",
  minPlayers: 3,
  maxPlayers: 0,
  validateSettings(input, ids) {
    const s = (input ?? {}) as Partial<WavelengthSettings>;
    return { guesserUid: guesserSetting(s.guesserUid, ids) };
  },
  validateContent(input) {
    check(
      Array.isArray(input) && input.length >= 1 && input.length <= 1000,
      "Servono da 1 a 1000 suggerimenti",
    );
    const result = input.map((v: any, i: number) => ({
      id: text(v.id ?? String(i), 60),
      text: text(v.text, 120),
    }));
    check(
      new Set(result.map((v) => v.id)).size === result.length,
      "ID duplicati",
    );
    return result;
  },
  init(room, settings) {
    room.settings = settings;
    restoreGuesser(room);
    room.gameState = { phase: "idle", roundId: 0, phaseVersion: 0 };
    return room;
  },
  start(room) {
    const ids = participants(room);
    check(ids.length >= 3, "Servono almeno 3 partecipanti");
    room.gameState = {
      ...room.gameState,
      participantUids: ids,
      turnIndex: 0,
      history: [],
    };
    next(room);
    return room;
  },
  end(room, now) {
    completeGuesserMatch(room);
    room.gameState = { phase: "idle", roundId: 0, phaseVersion: 0 };
    return endGame(room, now);
  },
  apply(room, actor, action, payload, now) {
    const s = room.gameState as WavelengthState;
    check(participants(room).includes(actor), "Spettatore");
    if (action === "markHeard") {
      check(
        s.phase === "clues" && actor === s.guesserUid,
        "Solo l’indovino ascolta gli esempi",
      );
      const uid = payload?.targetUid;
      check(s.turnOrder.includes(uid), "Interlocutore non valido");
      if (s.heardUids.includes(uid)) return room;
      check(
        s.turnOrder[s.heardUids.length] === uid,
        "Segui l’ordine degli interlocutori",
      );
      s.heardUids.push(uid);
    } else if (action === "beginGuess") {
      check(
        s.phase === "clues" && actor === s.guesserUid,
        "Solo l’indovino può rispondere",
      );
      phase(room, "guessing");
    } else if (action === "submitGuess") {
      check(
        s.phase === "guessing" && actor === s.guesserUid,
        "Solo l’indovino può confermare",
      );
      const guess = int(payload?.value, 1, 10);
      s.guess = guess;
      s.distance = Math.abs(guess - s.target);
      s.history.push({
        roundId: s.roundId,
        guesserUid: s.guesserUid,
        target: s.target,
        guess,
        distance: s.distance,
        cancelled: false,
      });
      completeGuesserMatch(room);
      phase(room, "results");
    } else if (action === "cancelRound") {
      hostOnly(room, actor);
      check(["clues", "guessing"].includes(s.phase), "Turno già chiuso");
      s.cancelled = true;
      s.history.push({
        roundId: s.roundId,
        guesserUid: s.guesserUid,
        target: s.target,
        guess: null,
        distance: null,
        cancelled: true,
      });
      completeGuesserMatch(room);
      phase(room, "results");
    } else throw new Error("Azione non valida");
    room.updatedAt = now;
    return room;
  },
  project(room, viewer) {
    const s = room.gameState as WavelengthState;
    const reveal = ["roundResults", "results"].includes(s.phase);
    return publicRoom(room, {
      guesserUid: s.guesserUid ?? null,
      turnIndex: s.turnIndex ?? 0,
      turnOrder: s.turnOrder ?? [],
      heardUids: s.heardUids ?? [],
      history: s.history ?? [],
      suggestion: s.suggestion ?? null,
      ...(reveal ||
      (participants(room).includes(viewer) &&
        viewer !== s.guesserUid &&
        ["clues", "guessing"].includes(s.phase))
        ? { target: s.target }
        : {}),
      ...(reveal
        ? {
            guess: s.guess ?? null,
            distance: s.distance ?? null,
            cancelled: s.cancelled ?? false,
          }
        : {}),
    });
  },
};
