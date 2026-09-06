import {cloneState} from '../src/core/utils/cloneState';
import impostoreWords from '../src/games/impostore/data/words.json';
import indovinaWords from '../src/games/indovina/data/words.json';
import tabooCards from '../src/games/taboo/data/cards.json';
import type { CoreRoom } from '../src/core/types/room';

export type Room = CoreRoom<any> & { settings?: any; matchId?: number; cardVersion?: number; players?: Record<string, any> };
export class RoomStore {
  constructor(public room: Room, public now: number) {}
  read(path: string) {
    const keys = this.keys(path);
    const value = keys.reduce((v: any, k) => v?.[k], this.room);
    return { exists: () => value != null, val: () => cloneState(value) };
  }
  update(_roomId: string, updates: Record<string, unknown>): void {
    for (const [path, value] of Object.entries(updates)) {
      const keys = this.keys(path);
      let target: any = this.room;
      for (const key of keys.slice(0, -1)) target = target[key] ??= {};
      if (value === null) delete target[keys.at(-1)!];
      else target[keys.at(-1)!] = cloneState(value);
    }
    this.room.updatedAt = this.now;
  }
  dictionary(game: string): any {
    const custom = (this.room.gameData?.[game] as any)?.dictionary;
    if (game === 'impostore' && Array.isArray(custom)) return Object.fromEntries(custom.map(c => [c.word, c.hint]));
    return custom ??
      ({impostore: impostoreWords, indovina: indovinaWords, taboo: tabooCards} as any)[game];
  }
  private keys(path: string): string[] {
    const [root, id, ...keys] = path.split('/');
    if (root !== 'rooms' || id !== this.room.id || keys.some(k => ['__proto__', 'constructor', 'prototype'].includes(k))) throw new Error('Percorso non valido');
    return keys;
  }
}
