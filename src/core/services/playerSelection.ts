import type { CoreRoom, CorePlayer } from '../types/room';

/**
 * Returns the UIDs of "active" players — i.e. those who should be dealt into
 * the next `startGame`. Excludes players marked as `waiting`, which is the
 * status of users who joined a room while a game was already in progress.
 *
 * Pure helper so the per-plugin start/end logic stays trivial to unit-test.
 */
export function filterActivePlayerUids<T>(room: CoreRoom<T>): string[] {
  const players = room.players ?? {};
  return Object.entries(players)
    .filter(([, p]) => !(p as CorePlayer).waiting)
    .map(([uid]) => uid);
}

export function getWaitingPlayerUids<T>(room: CoreRoom<T>): string[] {
  const players = room.players ?? {};
  return Object.entries(players)
    .filter(([, p]) => (p as CorePlayer).waiting === true)
    .map(([uid]) => uid);
}
