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
import words from "../data/just-one.json";
import { normalizeClue } from "../textNormalization";
export { normalizeClue } from "../textNormalization";
export function survivingClues(clues: Record<string, string>): string[] {
  const values = Object.values(clues);
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = normalizeClue(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return values.filter((value) => counts.get(normalizeClue(value)) === 1);
}
function authors(room: Room): string[] {
  return participants(room).filter((u) => u !== room.gameState.guesserUid);
}
function reviewClues(room: Room) {
  const p = room.gameState.private;
  const valid = survivingClues(p.clues);
  return authors(room).map((authorUid) => ({
    authorUid,
    text: p.clues[authorUid],
    invalid:
      !valid.includes(p.clues[authorUid]) ||
      !!p.withdrawn[authorUid] ||
      Object.keys(p.flags[authorUid] ?? {}).length >= 2,
    flagCount: Object.keys(p.flags[authorUid] ?? {}).length,
  }));
}
function begin(room: Room) {
  const s = room.gameState;
  s.roundId = (s.roundId ?? 0) + 1;
  s.guesserUid = participants(room)[s.roundIndex % participants(room).length];
  s.private.current = s.private.deck[s.roundIndex];
  s.private.clues = {};
  s.private.flags = {};
  s.private.withdrawn = {};
  s.private.ready = {};
  s.validClues = [];
  delete s.roundResult;
  phase(room, "clues");
}
function finish(room: Room, reason: string, guess = "") {
  const s = room.gameState;
  const correct = reason === "correct";
  if (room.settings.mode === "teams") s.wordsGuessed += correct ? 1 : 0;
  s.roundResult = {
    word: s.private.current.word,
    guess,
    correct,
    reason,
  };
  s.history.push({ ...s.roundResult, round: s.roundIndex + 1 });
  phase(room, "roundResults");
}
const cooperativeModule: GameModule = {
  id: "just-one",
  minPlayers: 3,
  maxPlayers: 10,
  validateSettings(input: any) {
    return { rounds: int(input?.rounds ?? 8, 5, 20) };
  },
  validateContent(input: any) {
    check(
      Array.isArray(input) && input.length >= 1 && input.length <= 1000,
      "Inserisci da 1 a 1000 parole",
    );
    const seen = new Set<string>();
    return input.map((entry: any, i: number) => {
      const word = text(typeof entry === "string" ? entry : entry?.word, 60);
      const key = normalizeClue(word);
      check(
        key.length > 0 && /\p{L}/u.test(key),
        "La parola deve contenere lettere",
      );
      check(!seen.has(key), "Parole duplicate");
      seen.add(key);
      const aliases = typeof entry === "string" ? [] : (entry.aliases ?? []);
      check(Array.isArray(aliases) && aliases.length <= 20, "Alias non validi");
      return {
        id: `custom-${i}`,
        word,
        aliases: aliases.map((a: unknown) => {
          const alias = text(a, 60);
          check(
            /\p{L}/u.test(normalizeClue(alias)),
            "L’alias deve contenere lettere",
          );
          return alias;
        }),
      };
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
    const deck = words;
    check(
      deck.length >= room.settings.rounds,
      "Non ci sono abbastanza parole per tutti i round",
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
    const isAuthor = authors(room).includes(actor);
    switch (action) {
      case "submitClue": {
        check(
          s.phase === "clues" && isAuthor,
          "Non puoi inviare un indizio ora",
        );
        const clue = text(payload?.text, 30).normalize("NFC");
        if (p.clues[actor] === clue) return room;
        check(!p.clues[actor], "Indizio già inviato");
        check(
          /^\p{L}[\p{L}\p{M}]*(?:['’‘ʼ`]\p{L}[\p{L}\p{M}]*)*$/u.test(clue),
          "Usa una sola parola, senza numeri o simboli",
        );
        check(
          normalizeClue(clue) !== normalizeClue(p.current.word),
          "L’indizio non può essere la parola obiettivo",
        );
        p.clues[actor] = clue;
        if (authors(room).every((u) => p.clues[u])) phase(room, "review");
        break;
      }
      case "withdrawClue":
      case "flagClue":
      case "confirmReview": {
        check(
          s.phase === "review" && isAuthor,
          "Solo gli autori partecipano alla revisione",
        );
        check(!p.ready[actor], "Revisione già confermata");
        if (action === "withdrawClue") p.withdrawn[actor] = true;
        if (action === "flagClue") {
          const target = payload?.authorUid;
          check(authors(room).includes(target), "Autore non valido");
          (p.flags[target] ??= {})[actor] = true;
        }
        if (action === "confirmReview") {
          p.ready[actor] = true;
          if (authors(room).every((u) => p.ready[u])) {
            s.validClues = shuffled(
              reviewClues(room)
                .filter((c) => !c.invalid)
                .map((c) => c.text),
            );
            if (s.validClues.length) phase(room, "guessing");
            else finish(room, "noClues");
          }
        }
        break;
      }
      case "submitGuess":
      case "pass": {
        check(
          s.phase === "guessing" && actor === s.guesserUid,
          "Solo l’indovino può rispondere",
        );
        if (action === "pass") finish(room, "passed");
        else {
          const guess = text(payload?.text, 60);
          const correct = [p.current.word, ...p.current.aliases].some(
            (v) => normalizeClue(v) === normalizeClue(guess),
          );
          finish(room, correct ? "correct" : "incorrect", guess);
        }
        break;
      }
      case "cancelRound":
        hostOnly(room, actor);
        check(
          ["clues", "review", "guessing"].includes(s.phase),
          "Round già terminato",
        );
        finish(room, "cancelled");
        break;
      case "nextRound":
        if (room.settings.mode !== "teams" || actor !== s.guesserUid) hostOnly(room, actor);
        check(s.phase === "roundResults", "Attendi il risultato");
        s.roundIndex++;
        if (s.roundIndex >= room.settings.rounds) phase(room, "results");
        else begin(room);
        break;
      default:
        throw new Error("Azione Just One sconosciuta");
    }
    return room;
  },
  project(room, viewer) {
    const s = room.gameState,
      p = s.private ?? {};
    const participant = participants(room).includes(viewer);
    const author = participant && viewer !== s.guesserUid;
    const state: any = {
      guesserUid: s.guesserUid ?? null,
      roundIndex: s.roundIndex ?? 0,
      history: s.history ?? [],
      submittedUids: Object.keys(p.clues ?? {}),
      readyUids: Object.keys(p.ready ?? {}),
    };
    if (author && ["clues", "review", "guessing"].includes(s.phase)) {
      state.target = p.current?.word ?? null;
      state.myClue = p.clues?.[viewer] ?? null;
    }
    if (author && s.phase === "review") {
      state.reviewClues = reviewClues(room);
      state.myFlaggedUids = Object.keys(p.flags ?? {}).filter(
        (u) => p.flags[u][viewer],
      );
    }
    if (["guessing", "roundResults", "results"].includes(s.phase))
      state.validClues = s.validClues ?? [];
    if (s.roundResult) state.roundResult = s.roundResult;
    return publicRoom(room, state);
  },
};


/** Each team is an independent round machine; only its own members receive its view. */
export const justOneModule: GameModule = {
  ...cooperativeModule,
  validateSettings(input: any) {
    const mode = input?.mode ?? "cooperative";
    check(["cooperative", "teams"].includes(mode), "Modalità non valida");
    return { rounds: int(input?.rounds ?? 8, 5, 20), mode };
  },
  start(room, now) {
    if (room.settings.mode !== "teams") return cooperativeModule.start(room, now);
    const uids = shuffled(participants(room));
    check(uids.length >= 4 && uids.length <= 10, "Servono da 4 a 10 giocatori per due squadre");
    // Disjoint decks prevent one team's revealed word from helping the other team.
    const deck = shuffled(words);
    const rounds = room.settings.rounds;
    const teams: Record<string, any> = {};
    for (let index = 0; index < 2; index++) {
      const id = `team-${index + 1}`;
      const teamRoom: Room = { ...room, gameState: { participantUids: uids.filter((_, i) => i % 2 === index) } };
      cooperativeModule.init(teamRoom, room.settings, now);
      const state = teamRoom.gameState;
      state.id = id;
      state.name = `Squadra ${index + 1}`;
      state.wordsGuessed = 0;
      state.private = { deck: deck.slice(index * rounds, (index + 1) * rounds) };
      begin(teamRoom);
      teams[id] = state;
    }
    room.gameState = { participantUids: participants(room), phase: "teams", roundId: 1, phaseVersion: 1, teams };
    return room;
  },
  apply(room, actor, action, payload, now) {
    if (room.settings.mode !== "teams") return cooperativeModule.apply(room, actor, action, payload, now);
    const teams = room.gameState.teams ?? {};
    const team = teams[payload?.teamId];
    check(team, "Squadra non valida");
    const hostControl = actor === room.hostId && ["nextRound", "cancelRound"].includes(action);
    check(hostControl || team.participantUids.includes(actor), "Questa non è la tua squadra");
    check(payload?.teamRoundId === team.roundId && payload?.teamPhaseVersion === team.phaseVersion,
      "La parola della squadra è cambiata: riprova");
    cooperativeModule.apply({ ...room, gameState: team }, actor, action, payload, now);
    if (Object.values(teams).every((t: any) => t.phase === "results")) phase(room, "results");
    return room;
  },
  project(room, viewer) {
    if (room.settings.mode !== "teams") return cooperativeModule.project(room, viewer);
    const teams = Object.values(room.gameState.teams ?? {}) as any[];
    const own = teams.find(t => t.participantUids.includes(viewer));
    const summaries = teams.map(t => ({ id: t.id, name: t.name, participantUids: t.participantUids,
      phase: t.phase, roundId: t.roundId, phaseVersion: t.phaseVersion,
      roundIndex: t.roundIndex, guesserUid: t.guesserUid, wordsGuessed: t.wordsGuessed }));
    const state: any = { teams: summaries };
    if (own) {
      state.myTeam = { ...cooperativeModule.project({ ...room, gameState: own }, viewer).gameState,
        id: own.id, name: own.name, wordsGuessed: own.wordsGuessed };
    }
    if (room.gameState.phase === "results") {
      const best = Math.max(...teams.map(t => t.wordsGuessed));
      state.winnerTeamIds = teams.filter(t => t.wordsGuessed === best).map(t => t.id);
    }
    return publicRoom(room, state);
  },
};
