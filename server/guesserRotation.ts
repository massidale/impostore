import type {Room} from './runtime';
import {participants, check} from './gameModule';
import {nextGuesser} from '../src/core/utils/guesserRotation';

export function guesserSetting(value: unknown, uids: string[]): string | null {
  check(value == null || typeof value === 'string', 'Indovino non valido');
  return typeof value === 'string' && uids.includes(value) ? value : null;
}

/** Restore the per-game cursor when settings are reopened or the game is reselected. */
export function restoreGuesser(room: Room) {
  const uids = Object.keys(room.players ?? {});
  const saved = (room.gameData?.[room.currentGameId] as any)?.guesserRotation;
  const preferred = room.settings.guesserUid ?? saved?.nextUid;
  room.settings.guesserUid = uids.includes(preferred) ? preferred
    : nextGuesser(uids, saved?.previousUid ?? null, saved?.order ?? uids);
}
export function beginGuesserMatch(room: Room) {
  restoreGuesser(room);
  const ids = participants(room);
  room.gameState.guesserUid = ids.includes(room.settings.guesserUid) ? room.settings.guesserUid : ids[0];
  room.gameState.rotationAdvanced = false;
}
/** Advance once, at the result or an early end. Returning to the lobby cannot skip a player. */
export function completeGuesserMatch(room: Room) {
  const s = room.gameState;
  if (!s?.guesserUid || s.rotationAdvanced) return;
  const nextUid = nextGuesser(Object.keys(room.players ?? {}), s.guesserUid, participants(room));
  const game = ((room.gameData ??= {})[room.currentGameId] ??= {}) as any;
  game.guesserRotation = {nextUid, previousUid:s.guesserUid, order:participants(room)};
  room.settings.guesserUid = nextUid;
  s.rotationAdvanced = true;
}
