import data from "../data/top-ten.json";
import {
  check,
  int,
  text,
  participants,
  shuffled,
  phase,
  hostOnly,
  endGame,
  publicRoom,
  type GameModule,
} from "../gameModule";
import type { Room } from "../runtime";
export const countAscendingPairs = (values: number[]) =>
  values.slice(1).filter((n, i) => n > values[i]).length;
function next(room: Room) {
  const s = room.gameState;
  const u = participants(room);
  const shuffledNumbers = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  s.roundId++;
  s.captainUid = u[(s.roundId - 1) % u.length];
  s.theme = s.private.themes[s.roundId - 1];
  s.performanceOrder = [
    ...u.slice((s.roundId - 1) % u.length),
    ...u.slice(0, (s.roundId - 1) % u.length),
  ];
  s.performed = [];
  s.private.numbersByUid = Object.fromEntries(
    u.map((id, i) => [id, shuffledNumbers[i]]),
  );
  phase(room, "performing");
}
function startRound(room: Room) {
  next(room);
}
export const topTenModule: GameModule = {
  id: "top-ten",
  minPlayers: 4,
  maxPlayers: 10,
  validateSettings(input: any) {
    return { rounds: int(input?.rounds ?? 5, 3, 10) };
  },
  validateContent(input: any) {
    check(
      Array.isArray(input) && input.length >= 3 && input.length <= 1000,
      "Servono da 3 a 1000 temi",
    );
    const result = input.map((x: any, i: number) => ({
      id: text(x.id ?? `custom-${i}`),
      prompt: text(x.prompt, 120),
      lowLabel: text(x.lowLabel, 120),
      highLabel: text(x.highLabel, 120),
    }));
    check(
      new Set(result.map((x) => x.id)).size === result.length,
      "ID duplicati",
    );
    return result;
  },
  init(room, settings) {
    room.settings = settings;
    room.gameState = { phase: "lobby", roundId: 0, phaseVersion: 0 };
    return room;
  },
  start(room) {
    const s = room.gameState;
    const themes = this.validateContent(
      data,
    );
    check(themes.length >= room.settings.rounds, "Temi insufficienti");
    Object.assign(s, {
      roundId: 0,
      history: [],
      private: { themes: shuffled(themes).slice(0, room.settings.rounds) },
    });
    startRound(room);
    return room;
  },
  end: endGame,
  apply(room, actor, action, payload) {
    const s = room.gameState;
    const u = participants(room);
    check(
      u.includes(actor) || room.hostId === actor,
      "Non partecipi a questa partita",
    );
    if (action === "cancelRound") {
      hostOnly(room, actor);
      check(
        ["performing", "ordering"].includes(s.phase),
        "Round non annullabile",
      );
      s.correctOrder = false;
      s.cancelled = true;
      s.order = [];
      s.history.push({ round: s.roundId, correctOrder: false, cancelled: true });
      phase(room, "roundResults");
    } else if (action === "markPerformed") {
      check(s.phase === "performing", "Fase non valida");
      const current = s.performanceOrder[s.performed.length];
      check(
        payload?.playerUid === current &&
          (actor === current || actor === room.hostId),
        "Attendi il tuo turno",
      );
      s.performed.push(current);
    } else if (action === "beginOrdering") {
      check(
        s.phase === "performing",
        "Completate tutte le interpretazioni",
      );
      check(
        actor === s.captainUid || actor === room.hostId,
        "Solo capitano o host",
      );
      phase(room, "ordering");
    } else if (action === "submitOrder") {
      check(
        s.phase === "ordering" && actor === s.captainUid,
        "Solo il capitano può ordinare",
      );
      const ids = payload?.uids;
      check(
        Array.isArray(ids) &&
          ids.length === u.length &&
          new Set(ids).size === u.length &&
          ids.every((x: string) => u.includes(x)),
        "Ordine incompleto o duplicato",
      );
      s.order = [...ids];
      s.correctOrder = countAscendingPairs(
        ids.map((id: string) => s.private.numbersByUid[id]),
      ) === ids.length - 1;
      s.cancelled = false;
      s.history.push({ round: s.roundId, correctOrder: s.correctOrder });
      phase(room, "roundResults");
    } else if (action === "nextRound") {
      hostOnly(room, actor);
      check(s.phase === "roundResults", "Fase non valida");
      if (s.roundId >= room.settings.rounds) phase(room, "results");
      else startRound(room);
    } else throw new Error("Azione sconosciuta");
    return room;
  },
  project(room, viewer) {
    const s = room.gameState ?? {};
    const reveal = ["roundResults", "results"].includes(s.phase);
    return publicRoom(room, {
      theme: s.theme ?? null,
      captainUid: s.captainUid ?? null,
      performanceOrder: s.performanceOrder ?? [],
      performed: s.performed ?? [],
      history: s.history ?? [],
      correctOrder: reveal ? (s.correctOrder ?? false) : null,
      cancelled: reveal ? (s.cancelled ?? false) : false,
      order: reveal ? (s.order ?? []) : [],
      ...(participants(room).includes(viewer) && s.private?.numbersByUid
        ? { ownNumber: s.private.numbersByUid[viewer] }
        : {}),
      ...(reveal ? { numbersByUid: s.private?.numbersByUid ?? {} } : {}),
    });
  },
};
