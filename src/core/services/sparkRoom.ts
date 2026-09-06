import {projectRoom, previewRoom} from '../../../server/engine';
import type {Room} from '../../../server/runtime';

/** Keep the root compatible with the existing Spark database rules. The JSON
 * state preserves empty arrays/maps that RTDB otherwise removes. */
export function encodeSparkRoom(room: Room) {
  const state = JSON.stringify(room);
  if (state.length > 2_000_000) throw new Error('I contenuti della stanza sono troppo grandi');
  return {
    id: room.id, hostId: room.hostId, status: room.status,
    currentGameId: room.currentGameId, createdAt: room.createdAt, updatedAt: room.updatedAt,
    players: Object.fromEntries(Object.entries(room.players ?? {}).map(([uid,p]) => [uid, {
      joinedAt: p.joinedAt, name: p.name ?? '', isHost: p.isHost === true,
      ...(p.waiting ? {waiting: true} : {}),
    }])),
    gameState: {protocol: 'spark-v1', phase: room.gameState?.phase ?? 'idle'},
    gameData: {spark: {version: 1, state}},
  };
}
export function decodeSparkRoom(stored: any): Room {
  if (stored?.gameData?.spark?.version !== 1 || stored?.gameState?.protocol !== 'spark-v1')
    throw new Error('Questa stanza usa una versione diversa. Apri il link dell’host oppure crea una nuova stanza.');
  const room = JSON.parse(stored.gameData.spark.state) as Room;
  if (!room || room.id !== stored.id || room.hostId !== stored.hostId)
    throw new Error('Stato della stanza non valido');
  return room;
}
export function sparkRoomView(stored: unknown, uid: string): Room | null {
  if (!stored) return null;
  const room = decodeSparkRoom(stored);
  return Object.hasOwn(room.players ?? {}, uid) ? projectRoom(room, uid) : previewRoom(room);
}
