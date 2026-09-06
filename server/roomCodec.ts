import type { Room } from "./runtime";
/** RTDB deletes empty arrays/maps. A private JSON scalar preserves the exact
 * authoritative state; preview and per-user views stay queryable objects. */
export function encodeRoom(room: Room): string {
  const encoded = JSON.stringify(room);
  if (Buffer.byteLength(encoded, "utf8") > 9_000_000)
    throw new Error("I contenuti della stanza sono troppo grandi");
  return encoded;
}
export function decodeRoom(stored: unknown): Room {
  const room = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (
    !room ||
    Array.isArray(room) ||
    typeof room !== "object" ||
    typeof room.id !== "string" ||
    typeof room.hostId !== "string"
  )
    throw new Error("Stato stanza non valido");
  return room;
}
