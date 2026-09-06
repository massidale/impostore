import type { Room } from "./runtime";

export interface GameModule {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  validateSettings(input: unknown, participantUids: string[]): any;
  validateContent(input: unknown): any;
  init(room: Room, settings: any, now: number): Room;
  start(room: Room, now: number): Room;
  end(room: Room, now: number): Room;
  apply(
    room: Room,
    actor: string,
    action: string,
    payload: any,
    now: number,
  ): Room;
  project(room: Room, viewer: string): Room;
}

export function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function int(value: unknown, min: number, max: number): number {
  check(
    typeof value === "number" &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max,
    `Inserisci un intero fra ${min} e ${max}`,
  );
  return value;
}
export function text(value: unknown, max = 60): string {
  check(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
    `Inserisci un testo di 1–${max} caratteri`,
  );
  return value.trim();
}
export function participants(room: Room): string[] {
  return (
    room.gameState?.participantUids ??
    Object.keys(room.players ?? {}).filter((uid) => !room.players![uid].waiting)
  );
}
export function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function phase(room: Room, next: string): void {
  room.gameState.phase = next;
  room.gameState.phaseVersion = (room.gameState.phaseVersion ?? 0) + 1;
}
export function hostOnly(room: Room, actor: string): void {
  check(room.hostId === actor, "Solo l’host può eseguire questa azione");
}
export function endGame(room: Room, now: number): Room {
  room.status = "lobby";
  room.updatedAt = now;
  for (const p of Object.values(room.players ?? {})) delete p.waiting;
  return room;
}
/** Explicit core envelope: no player extension, private state or dictionary leaks. */
export function publicRoom(room: Room, state: Record<string, unknown>): Room {
  return {
    id: room.id,
    hostId: room.hostId,
    status: room.status,
    currentGameId: room.currentGameId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    matchId: room.matchId ?? 0,
    settings: structuredClone(room.settings),
    players: Object.fromEntries(
      Object.entries(room.players ?? {}).map(([uid, p]) => [
        uid,
        {
          name: p.name ?? "",
          joinedAt: p.joinedAt,
          isHost: p.isHost === true,
          ...(p.waiting ? { waiting: true } : {}),
        },
      ]),
    ),
    gameState: {
      phase: room.gameState?.phase,
      roundId: room.gameState?.roundId ?? 0,
      phaseVersion: room.gameState?.phaseVersion ?? 0,
      participantUids: participants(room),
      ...structuredClone(state),
    },
  };
}
