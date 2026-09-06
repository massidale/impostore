import { tallyVotes, validateVote, hasEveryoneVoted } from '../../src/core/voting/voting';
import data from "../data/che-domanda.json";
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
export interface Domain {
  min: number;
  max: number;
  decimals: number;
}
export interface QuestionPair extends Domain {
  id: string;
  question: string;
  alternateQuestion: string;
}
export interface CheDomandaState {
  phase: string;
  roundId: number;
  phaseVersion: number;
  participantUids: string[];
  questionPair: QuestionPair;
  impostorUids: string[];
  answersByUid: Record<string, number>;
  eliminatedUids: string[];
  speakerOrder: string[];
  speakerIndex: number;
  votesByUid: Record<string, string>;
  runoff: boolean;
  candidates: string[];
  votingEndsAt: number;
  elimination?: { uid: string; role: string } | null;
  winner?: string | null;
  cancelled?: boolean;
}
export function parseNumericAnswer(input: string, domain: Domain): number {
  check(
    typeof input === "string" && /^-?\d+(?:[.,]\d+)?$/.test(input),
    "Inserisci un numero senza separatori delle migliaia",
  );
  const decimals = input.split(/[.,]/)[1]?.length ?? 0;
  check(decimals <= domain.decimals, "Troppe cifre decimali");
  const value = Number(input.replace(",", "."));
  check(
    Number.isFinite(value) && value >= domain.min && value <= domain.max,
    "Numero fuori intervallo",
  );
  return value;
}
function alive(room: Room): string[] {
  return participants(room).filter(
    (id) => !room.gameState.eliminatedUids.includes(id),
  );
}
function discussion(room: Room) {
  const s = room.gameState as CheDomandaState;
  const ids = alive(room);
  const offset = ((room.matchId ?? 1) - 1) % ids.length;
  s.speakerOrder = [...ids.slice(offset), ...ids.slice(0, offset)];
  s.speakerIndex = 0;
  s.votesByUid = {};
  s.runoff = false;
  s.candidates = [];
  delete s.elimination;
  phase(room, "discussion");
}
function close(room: Room, now: number) {
  const s = room.gameState as CheDomandaState;
  const { leaders: tied } = tallyVotes(s.votesByUid);
  if (tied.length > 1 && !s.runoff) {
    s.runoff = true;
    s.candidates = tied;
    s.votesByUid = {};
    s.votingEndsAt = now + 30000;
    phase(room, "voting");
    return;
  }
  s.elimination = null;
  if (tied.length === 1) {
    const uid = tied[0];
    s.eliminatedUids.push(uid);
    s.elimination = {
      uid,
      role: s.impostorUids.includes(uid) ? "impostore" : "civile",
    };
  }
  const remaining = alive(room);
  const imps = remaining.filter((id) => s.impostorUids.includes(id)).length;
  s.winner =
    imps === 0
      ? "civili"
      : imps >= remaining.length - imps
        ? "impostori"
        : null;
  phase(room, "elimination");
}
export const cheDomandaModule: GameModule = {
  id: "che-domanda",
  minPlayers: 3,
  maxPlayers: 12,
  validateSettings(input, ids) {
    const s = (input ?? {}) as any;
    return {
      numImpostors: int(
        s.numImpostors ?? 1,
        1,
        Math.max(1, Math.floor(((ids.length || 3) - 1) / 2)),
      ),
      votingSeconds: 60,
    };
  },
  validateContent(input) {
    check(
      Array.isArray(input) && input.length > 0 && input.length <= 1000,
      "Servono da 1 a 1000 coppie",
    );
    const result = input.map((v: any) => {
      check(v && typeof v === "object", "Coppia non valida");
      check(
        typeof v.min === "number" &&
          Number.isFinite(v.min) &&
          typeof v.max === "number" &&
          Number.isFinite(v.max) &&
          v.min < v.max,
        "Intervallo non valido",
      );
      const decimals = int(v.decimals, 0, 3);
      const scale = 10 ** decimals;
      const scaledMin = v.min * scale,
        scaledMax = v.max * scale;
      check(
        Number.isFinite(scaledMin) &&
          Number.isFinite(scaledMax) &&
          Math.abs(scaledMin) <= Number.MAX_SAFE_INTEGER &&
          Math.abs(scaledMax) <= Number.MAX_SAFE_INTEGER,
        "Intervallo troppo grande per la precisione scelta",
      );
      let first = Math.ceil(scaledMin),
        last = Math.floor(scaledMax);
      // Multiplication can turn 0.29 × 100 into 28.999999999999996.
      // Compare neighboring grid values in the original domain instead of
      // widening its boundaries with an arbitrary epsilon.
      if (Number.isSafeInteger(first - 1) && (first - 1) / scale >= v.min)
        first--;
      if (Number.isSafeInteger(last + 1) && (last + 1) / scale <= v.max) last++;
      check(
        first <= last && first / scale >= v.min && first / scale <= v.max,
        "L’intervallo non contiene risposte con la precisione scelta",
      );
      return {
        id: text(v.id, 60),
        question: text(v.question, 120),
        alternateQuestion: text(v.alternateQuestion, 120),
        min: v.min,
        max: v.max,
        decimals,
      };
    });
    check(
      new Set(result.map((v) => v.id)).size === result.length,
      "ID duplicati",
    );
    return result;
  },
  init(room, settings) {
    room.settings = settings;
    room.gameState = { phase: "idle", roundId: 0, phaseVersion: 0 };
    return room;
  },
  start(room) {
    const ids = participants(room);
    check(ids.length >= 3 && ids.length <= 12, "Servono 3–12 partecipanti");
    room.settings = this.validateSettings(room.settings, ids);
    const content = data;
    const pair = shuffled(content)[0];
    room.gameState = {
      ...room.gameState,
      participantUids: ids,
      roundId: (room.gameState.roundId ?? 0) + 1,
      questionPair: pair,
      impostorUids: shuffled(ids).slice(0, room.settings.numImpostors),
      answersByUid: {},
      votesByUid: {},
      eliminatedUids: [],
      speakerOrder: [],
      speakerIndex: 0,
      runoff: false,
      candidates: [],
    };
    phase(room, "answering");
    return room;
  },
  end(room, now) {
    room.gameState = { phase: "idle", roundId: 0, phaseVersion: 0 };
    return endGame(room, now);
  },
  apply(room, actor, action, payload, now) {
    const s = room.gameState as CheDomandaState;
    check(participants(room).includes(actor), "Spettatore");
    if (action === "submitAnswer") {
      check(s.phase === "answering", "Risposte chiuse");
      check(
        typeof payload?.value === "number" && Number.isFinite(payload.value),
        "Numero non valido",
      );
      const answer = parseNumericAnswer(String(payload.value), s.questionPair);
      if (actor in s.answersByUid) {
        check(s.answersByUid[actor] === answer, "Risposta già inviata");
        return room;
      }
      s.answersByUid[actor] = answer;
      if (Object.keys(s.answersByUid).length === participants(room).length)
        discussion(room);
    } else if (action === "nextSpeaker") {
      check(s.phase === "discussion", "Discussione non attiva");
      check(
        actor === room.hostId || actor === s.speakerOrder[s.speakerIndex],
        "Attendi il tuo turno",
      );
      check(s.speakerIndex < s.speakerOrder.length, "Tutti hanno parlato");
      check(
        payload?.expectedSpeakerIndex === s.speakerIndex,
        "Oratore aggiornato: riprova",
      );
      s.speakerIndex++;
    } else if (action === "startVoting") {
      hostOnly(room, actor);
      check(
        s.phase === "discussion",
        "Discussione non attiva",
      );
      s.votesByUid = {};
      s.candidates = alive(room);
      s.runoff = false;
      s.votingEndsAt = now + 60000;
      phase(room, "voting");
    } else if (action === "castVote") {
      check(s.phase === "voting" && now < s.votingEndsAt, "Votazione chiusa");
      const target = payload?.targetUid;
      validateVote({voter: actor, target, eligible: alive(room), candidates: s.candidates, endsAt: s.votingEndsAt, now});
      s.votesByUid[actor] = target;
      if (hasEveryoneVoted(s.votesByUid, alive(room)))
        close(room, now);
    } else if (action === "closeVoting") {
      hostOnly(room, actor);
      check(
        s.phase === "voting" && now >= s.votingEndsAt,
        "Attendi la scadenza",
      );
      close(room, now);
    } else if (action === "continueRound") {
      hostOnly(room, actor);
      check(s.phase === "elimination", "Attendi l’esito");
      if (s.winner) phase(room, "results");
      else discussion(room);
    } else if (action === "cancelRound") {
      hostOnly(room, actor);
      check(!["idle", "results"].includes(s.phase), "Partita già chiusa");
      s.cancelled = true;
      s.winner = null;
      phase(room, "results");
    } else throw new Error("Azione non valida");
    room.updatedAt = now;
    return room;
  },
  project(room, viewer) {
    const s = room.gameState as CheDomandaState;
    const member = participants(room).includes(viewer);
    const result = s.phase === "results";
    const revealed = [
      "discussion",
      "voting",
      "elimination",
      "results",
    ].includes(s.phase);
    return publicRoom(room, {
      answeredUids: Object.keys(s.answersByUid ?? {}),
      eliminatedUids: s.eliminatedUids ?? [],
      speakerOrder: s.speakerOrder ?? [],
      speakerIndex: s.speakerIndex ?? 0,
      ...(s.phase === "answering" && member
        ? {
            ownQuestion: s.impostorUids.includes(viewer)
              ? s.questionPair.alternateQuestion
              : s.questionPair.question,
            domain: {
              min: s.questionPair.min,
              max: s.questionPair.max,
              decimals: s.questionPair.decimals,
            },
            ownAnswer: s.answersByUid[viewer] ?? null,
          }
        : {}),
      ...(revealed
        ? { question: s.questionPair.question, answersByUid: s.answersByUid }
        : {}),
      ...(s.phase === "voting"
        ? {
            ownVote: s.votesByUid[viewer] ?? null,
            voteCount: Object.keys(s.votesByUid).length,
            candidates: s.candidates,
            runoff: s.runoff,
            votingEndsAt: s.votingEndsAt,
          }
        : {}),
      ...(s.phase === "elimination"
        ? { elimination: s.elimination, winner: s.winner }
        : {}),
      ...(result
        ? {
            alternateQuestion: s.questionPair.alternateQuestion,
            roles: Object.fromEntries(
              participants(room).map((id) => [
                id,
                s.impostorUids.includes(id) ? "impostore" : "civile",
              ]),
            ),
            winner: s.winner ?? null,
            cancelled: s.cancelled ?? false,
          }
        : {}),
    });
  },
};
