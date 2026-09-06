import data from "../data/times-up.json";
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
export const resetRoundDeck = (
  ids: string[],
  shuffle: (ids: string[]) => string[] = shuffled,
) => shuffle([...ids]);
const normalize = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
function cards(input: any) {
  check(
    Array.isArray(input) && input.length > 0 && input.length <= 1000,
    "Inserisci da 1 a 1000 nomi",
  );
  const seen = new Set<string>();
  return input
    .map((x: any, i: number) => ({
      id: text(typeof x === "string" ? `custom-${i}` : (x.id ?? `custom-${i}`)),
      name: text(typeof x === "string" ? x : x.name),
      aliases:
        typeof x === "string"
          ? []
          : Array.isArray(x.aliases)
            ? x.aliases.map((a: any) => text(a))
            : [],
    }))
    .filter((x) => {
      const key = normalize(x.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
function prepare(room: Room, source: any[]) {
  const s = room.gameState;
  check(
    source.length >= room.settings.deckSize,
    `Servono almeno ${room.settings.deckSize} nomi distinti`,
  );
  s.private.originalDeck = shuffled(source).slice(0, room.settings.deckSize);
  s.private.pendingCardIds = s.private.originalDeck.map((c: any) => c.id);
  phase(room, "ready");
}
function advanceTeam(s: any) {
  s.rotation[s.team]++;
  s.team = s.team === "blue" ? "red" : "blue";
  s.describerUid = s.teams[s.team][s.rotation[s.team] % s.teams[s.team].length];
  s.deadline = null;
  s.private.undo = null;
}
function closeTurn(room: Room) {
  const s = room.gameState;
  advanceTeam(s);
  phase(room, "turnResults");
}
export const timesUpModule: GameModule = {
  id: "times-up",
  minPlayers: 4,
  maxPlayers: 12,
  validateSettings(input: any, u) {
    const s = {
      turnSeconds: int(input?.turnSeconds ?? 45, 30, 90),
      deckSize: int(input?.deckSize ?? 30, 10, 60),
      teamMode: input?.teamMode ?? "auto",
      manualTeams: input?.manualTeams ?? null,
      contentSource: input?.contentSource ?? "default",
    };
    check(["auto", "manual"].includes(s.teamMode), "Squadre non valide");
    check(
      ["default", "custom", "players"].includes(s.contentSource),
      "Fonte non valida",
    );
    if (s.teamMode === "manual") {
      check(
        s.manualTeams && typeof s.manualTeams === "object",
        "Assegna le squadre",
      );
      check(
        u.every((id) => ["blue", "red"].includes(s.manualTeams[id])),
        "Assegna ogni partecipante",
      );
      check(
        ["blue", "red"].every(
          (t) => u.filter((id) => s.manualTeams[id] === t).length >= 2,
        ),
        "Almeno due giocatori per squadra",
      );
      s.manualTeams = Object.fromEntries(
        u.map((id) => [id, s.manualTeams[id]]),
      );
    }
    return s;
  },
  validateContent(input) {
    const result = cards(input);
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
    const s = room.gameState,
      u = participants(room),
      order = shuffled(u);
    const teams = {
      blue: u.filter((id) =>
        room.settings.teamMode === "manual"
          ? room.settings.manualTeams[id] === "blue"
          : order.indexOf(id) % 2 === 0,
      ),
      red: u.filter((id) =>
        room.settings.teamMode === "manual"
          ? room.settings.manualTeams[id] === "red"
          : order.indexOf(id) % 2 === 1,
      ),
    };
    Object.assign(s, {
      roundId: 1,
      roundNumber: 1,
      teams,
      team: "blue",
      rotation: { blue: 0, red: 0 },
      describerUid: teams.blue[0],
      scores: { blue: 0, red: 0 },
      roundScores: { blue: 0, red: 0 },
      history: [],
      actionVersion: 0,
      deadline: null,
      private: {
        contributions: {},
        pendingCardIds: [],
        originalDeck: [],
        undo: null,
      },
    });
    if (room.settings.contentSource === "players") phase(room, "collecting");
    else {
      const content =
        room.settings.contentSource === "custom"
          ? (room.gameData?.["times-up"] as any)?.content
          : data;
      check(content, "Carica prima i nomi personalizzati");
      prepare(room, this.validateContent(content));
    }
    return room;
  },
  end: endGame,
  apply(room, actor, action, payload, now) {
    const s = room.gameState,
      p = s.private;
    check(
      participants(room).includes(actor) || actor === room.hostId,
      "Non partecipi a questa partita",
    );
    if (action === "submitNames") {
      check(
        s.phase === "collecting" && participants(room).includes(actor),
        "Raccolta terminata",
      );
      p.contributions[actor] = cards(payload?.names).map((x) => x.name);
    } else if (action === "beginTurn" && s.phase === "collecting") {
      hostOnly(room, actor);
      prepare(room, cards(Object.values(p.contributions).flat()));
    } else if (action === "beginTurn") {
      check(
        s.phase === "ready" || s.phase === "turnResults",
        "Fase non valida",
      );
      check(
        actor === s.describerUid || actor === room.hostId,
        "Solo descrittore o host",
      );
      s.deadline = now + room.settings.turnSeconds * 1000;
      s.actionVersion++;
      phase(room, "turn");
    } else if (action === "endTurn") {
      check(s.phase === "turn", "Turno non aperto");
      check(now >= s.deadline || actor === room.hostId, "Timer ancora attivo");
      closeTurn(room);
    } else if (action === "resolveCard" || action === "undoCard") {
      check(
        s.phase === "turn" && actor === s.describerUid,
        "Solo il descrittore durante il turno",
      );
      check(payload?.actionVersion === s.actionVersion, "Carta già cambiata");
      if (now >= s.deadline) {
        closeTurn(room);
        return room;
      }
      if (action === "undoCard") {
        check(p.undo, "Nessuna azione annullabile");
        p.pendingCardIds = p.undo.queue;
        s.scores[s.team] = p.undo.score;
        s.roundScores[s.team] = p.undo.roundScore;
        p.undo = null;
      } else {
        check(
          ["correct", "skip", "violation"].includes(payload?.outcome),
          "Esito non valido",
        );
        p.undo = {
          queue: [...p.pendingCardIds],
          score: s.scores[s.team],
          roundScore: s.roundScores[s.team],
        };
        const id = p.pendingCardIds.shift();
        check(id, "Mazzo esaurito");
        if (payload.outcome === "correct") {
          s.scores[s.team]++;
          s.roundScores[s.team]++;
        } else p.pendingCardIds.push(id);
        if (!p.pendingCardIds.length) {
          p.undo = null;
          s.history.push({
            round: s.roundNumber,
            scores: { ...s.roundScores },
          });
          s.deadline = null;
          if (s.roundNumber === 3) phase(room, "results");
          else phase(room, "roundResults");
        }
      }
      s.actionVersion++;
    } else if (action === "nextRound") {
      hostOnly(room, actor);
      check(
        s.phase === "roundResults" && s.roundNumber < 3,
        "Nessun nuovo round",
      );
      advanceTeam(s);
      s.roundNumber++;
      s.roundId++;
      s.roundScores = { blue: 0, red: 0 };
      p.pendingCardIds = resetRoundDeck(p.originalDeck.map((x: any) => x.id));
      phase(room, "ready");
    } else if (action === "cancelRound") {
      hostOnly(room, actor);
      check(s.phase === "turn", "Turno non annullabile");
      closeTurn(room);
    } else throw new Error("Azione sconosciuta");
    return room;
  },
  project(room, viewer) {
    const s = room.gameState ?? {},
      p = s.private ?? {};
    return publicRoom(room, {
      roundNumber: s.roundNumber ?? 1,
      teams: s.teams ?? { blue: [], red: [] },
      team: s.team ?? "blue",
      describerUid: s.describerUid ?? null,
      scores: s.scores ?? { blue: 0, red: 0 },
      roundScores: s.roundScores ?? { blue: 0, red: 0 },
      history: s.history ?? [],
      deadline: s.deadline ?? null,
      actionVersion: s.actionVersion ?? 0,
      remaining: p.pendingCardIds?.length ?? 0,
      collectedCount: cardsCount(p.contributions),
      submitted: !!p.contributions?.[viewer],
      ...(s.phase === "collecting" && participants(room).includes(viewer)
        ? { ownNames: p.contributions?.[viewer] ?? [] }
        : {}),
      submittedCount: Object.keys(p.contributions ?? {}).length,
      ...(s.phase === "turn" && viewer === s.describerUid
        ? {
            currentCard:
              p.originalDeck.find((c: any) => c.id === p.pendingCardIds[0]) ??
              null,
            canUndo: !!p.undo,
          }
        : {}),
    });
  },
};
function cardsCount(contributions: any) {
  return new Set(
    (Object.values(contributions ?? {}).flat() as string[]).map(normalize),
  ).size;
}
