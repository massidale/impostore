import {cloneState} from '../src/core/utils/cloneState';
import type { Room } from "./runtime";
import { check, hostOnly, type GameModule } from "./gameModule";

export interface ModuleExpected {
  matchId?: number;
  phase?: string;
  roundId?: number;
  phaseVersion?: number;
  actionVersion?: number;
}
const corePlayer = (p: any) => ({
  name: p.name ?? "",
  joinedAt: p.joinedAt,
  isHost: p.isHost === true,
  ...(p.waiting ? { waiting: true } : {}),
});

/** Called inside the single room transaction. Input is cloned for direct tests too. */
export function dispatchModule(
  input: Room,
  actor: string,
  action: string,
  payload: unknown,
  expected: ModuleExpected | undefined,
  now: number,
  game: GameModule,
): Room {
  let room = cloneState(input);
  check(room.players?.[actor], "Non fai parte della stanza");
  if (["init", "setContent", "start", "replay", "end", "cancelRound"].includes(action))
    hostOnly(room, actor);
  if (action === "init") {
    check(room.status === "lobby", "Partita in corso");
    const settings = game.validateSettings(
      payload,
      Object.keys(room.players ?? {}),
    );
    if (room.currentGameId !== game.id) {
      room.gameState = undefined;
      room.players = Object.fromEntries(
        Object.entries(room.players ?? {}).map(([uid, p]) => [
          uid,
          corePlayer(p),
        ]),
      );
    }
    room.currentGameId = game.id;
    room.settings = settings;
    room = game.init(room, settings, now);
  } else {
    check(room.currentGameId === game.id, "Questo gioco non è selezionato");
    if (action === "setContent") {
      throw new Error("I contenuti personalizzati non sono disponibili");
    } else {
      const gs = room.gameState;
      check(
        gs &&
          expected &&
          expected.matchId === (room.matchId ?? 0) &&
          expected.phase === gs.phase &&
          expected.roundId === (gs.roundId ?? 0) &&
          expected.phaseVersion === (gs.phaseVersion ?? 0),
        "Partita aggiornata: riprova",
      );
      if (action === "replay") {
        check(game.id === "wavelength" || (game.id === "just-one" && room.settings?.mode !== "teams"), "Ripetizione non disponibile");
        check(room.status === "active" && gs.phase === "results", "Attendi il risultato");
        room = game.end(room, now);
      }
      if (action === "start" || action === "replay") {
        check(room.status === "lobby", "Partita già iniziata");
        // Waiting players become eligible only at the next match start.
        const uids = Object.keys(room.players ?? {});
        check(
          uids.length >= game.minPlayers && (game.maxPlayers === 0 || uids.length <= game.maxPlayers),
          game.maxPlayers ? `Servono da ${game.minPlayers} a ${game.maxPlayers} giocatori` : `Servono almeno ${game.minPlayers} giocatori`,
        );
        for (const uid of uids)
          room.players![uid] = corePlayer(room.players![uid]);
        for (const p of Object.values(room.players ?? {})) delete p.waiting;
        room.settings = game.validateSettings(room.settings, uids);
        room.gameState = undefined;
        room = game.init(room, room.settings, now);
        room.gameState.participantUids = uids;
        room.matchId = (room.matchId ?? 0) + 1;
        room.status = "active";
        room = game.start(room, now);
        room.gameState.participantUids = uids;
      } else {
        check(room.status === "active", "La partita non è attiva");
        if (action === "end") {
          room = game.end(room, now);
          room.gameState ??= {};
          room.gameState.phase ??= "setup";
          room.gameState.roundId ??= 0;
          room.gameState.phaseVersion ??= 0;
        } else {
          check(
            !room.players![actor].waiting &&
              gs.participantUids?.includes(actor),
            "Non partecipi a questa partita",
          );
          if (
            game.id === "times-up" &&
            gs.actionVersion !== undefined &&
            ["resolveCard", "undoCard", "endTurn"].includes(action)
          ) {
            check(
              expected.actionVersion === gs.actionVersion,
              "Carta aggiornata: riprova",
            );
          }
          room = game.apply(room, actor, action, payload, now);
        }
      }
    }
  }
  room.updatedAt = now;
  return room;
}
