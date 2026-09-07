import {cloneState} from '../../src/core/utils/cloneState';
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
import questions from "../data/herd-mentality.json";
import { normalizeAnswer } from "../textNormalization";
export { normalizeAnswer } from "../textNormalization";
export function majorityWinners(groups: string[][]): string[] {
  const largest = Math.max(0, ...groups.map((g) => g.length));
  const winners = groups.filter((g) => g.length === largest);
  return largest > 1 && winners.length === 1 ? [...winners[0]] : [];
}
function begin(room: Room) {
  const s = room.gameState;
  s.roundId = (s.roundId ?? 0) + 1;
  s.question = s.private.deck[s.roundIndex].question;
  s.private.answers = {};
  s.private.mergeHistory = [];
  s.groups = [];
  delete s.roundResult;
  phase(room, "answering");
}
function groupAnswers(room: Room) {
  const s = room.gameState;
  const grouped = new Map<string, string[]>();
  for (const uid of participants(room)) {
    const key = normalizeAnswer(s.private.answers[uid]);
    grouped.set(key, [...(grouped.get(key) ?? []), uid]);
  }
  s.groups = Array.from(grouped.values()).map((memberUids, i) => ({
    id: `g${i}`,
    memberUids,
  }));
  phase(room, "review");
}
function finish(room: Room, cancelled = false) {
  const s = room.gameState;
  const winners = cancelled
    ? []
    : majorityWinners(s.groups.map((g: any) => g.memberUids));
  s.roundResult = { winners, cancelled };
  s.history.push({
    round: s.roundIndex + 1,
    question: s.question,
    ...s.roundResult,
  });
  phase(room, "roundResults");
}
export const herdMentalityModule: GameModule = {
  id: "herd-mentality",
  minPlayers: 3,
  maxPlayers: 0,
  validateSettings(input: any) {
    return { rounds: int(input?.rounds ?? 8, 5, 20) };
  },
  validateContent(input: any) {
    check(
      Array.isArray(input) && input.length > 0 && input.length <= 1000,
      "Inserisci da 1 a 1000 domande",
    );
    const seen = new Set<string>();
    return input.map((entry: any, i: number) => {
      const question = text(entry?.question, 120);
      const key = normalizeAnswer(question);
      check(!seen.has(key), "Domande duplicate");
      seen.add(key);
      return { id: `custom-${i}`, question };
    });
  },
  init(room, settings) {
    room.settings = settings;
    room.gameState = {
      participantUids: participants(room),
      phase: "waiting",
      phaseVersion: 0,
      roundId: 0,
      roundIndex: 0,
      history: [],
      private: {},
    };
    return room;
  },
  start(room) {
    const deck =
      questions;
    check(
      deck.length >= room.settings.rounds,
      "Non ci sono abbastanza domande per tutti i round",
    );
    room.gameState.private = { deck: shuffled(deck) };
    begin(room);
    return room;
  },
  end(room, now) {
    room.gameState = {};
    return endGame(room, now);
  },
  apply(room, actor, action, payload) {
    const s = room.gameState,
      p = s.private;
    switch (action) {
      case "submitAnswer": {
        check(
          s.phase === "answering" && participants(room).includes(actor),
          "Non puoi rispondere ora",
        );
        const answer = text(payload?.text, 60);
        if (p.answers[actor] === answer) return room;
        check(p.answers[actor] === undefined, "Risposta già inviata");
        check(
          normalizeAnswer(answer).length > 0,
          "Inserisci una risposta leggibile",
        );
        p.answers[actor] = answer;
        if (participants(room).every((u) => p.answers[u] !== undefined))
          groupAnswers(room);
        break;
      }
      case "mergeGroups": {
        hostOnly(room, actor);
        check(
          s.phase === "review",
          "Le fusioni sono disponibili durante la revisione",
        );
        const ids = payload?.groupIds;
        check(
          Array.isArray(ids) &&
            ids.length >= 2 &&
            ids.length <= s.groups.length &&
            new Set(ids).size === ids.length,
          "Seleziona almeno due gruppi diversi",
        );
        check(
          ids.every((id) => s.groups.some((g: any) => g.id === id)),
          "Gruppo non valido",
        );
        p.mergeHistory.push(cloneState(s.groups));
        const selected = s.groups.filter((g: any) => ids.includes(g.id));
        const merged = {
          id: selected[0].id,
          memberUids: selected.flatMap((g: any) => g.memberUids),
        };
        s.groups = [
          ...s.groups.filter((g: any) => !ids.includes(g.id)),
          merged,
        ];
        phase(room, "review");
        break;
      }
      case "undoMerge":
        hostOnly(room, actor);
        check(
          s.phase === "review" && p.mergeHistory.length > 0,
          "Nessuna fusione da annullare",
        );
        s.groups = p.mergeHistory.pop();
        phase(room, "review");
        break;
      case "confirmResults":
        hostOnly(room, actor);
        check(s.phase === "review", "Attendi la revisione");
        finish(room);
        break;
      case "cancelRound":
        hostOnly(room, actor);
        check(["answering", "review"].includes(s.phase), "Round già terminato");
        finish(room, true);
        break;
      case "nextRound":
        hostOnly(room, actor);
        check(s.phase === "roundResults", "Attendi il risultato");
        s.roundIndex++;
        if (s.roundIndex >= room.settings.rounds) {
          phase(room, "results");
        } else begin(room);
        break;
      default:
        throw new Error("Azione Herd Mentality sconosciuta");
    }
    return room;
  },
  project(room, viewer) {
    const s = room.gameState,
      p = s.private ?? {};
    const state: any = {
      question: s.question ?? null,
      roundIndex: s.roundIndex ?? 0,
      history: s.history ?? [],
      submittedUids: Object.keys(p.answers ?? {}),
    };
    if (
      participants(room).includes(viewer) &&
      p.answers?.[viewer] !== undefined
    )
      state.myAnswer = p.answers[viewer];
    if (["review", "roundResults", "results"].includes(s.phase)) {
      state.answersByUid = p.answers ?? {};
      state.groups = s.groups ?? [];
      state.canUndo = !!p.mergeHistory?.length;
    }
    if (s.roundResult) state.roundResult = s.roundResult;
    return publicRoom(room, state);
  },
};
