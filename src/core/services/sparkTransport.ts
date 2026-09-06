import {get, onValue, ref, runTransaction, type Database} from 'firebase/database';
import {applyCommand, createRoom, type Command} from '../../../server/engine';
import {decodeSparkRoom, encodeSparkRoom, sparkRoomView} from './sparkRoom';
import type {CoreRoom} from '../types/room';

/** The same transport is used by the app and real Firebase emulator tests.
 * Transactions prevent lost answers/double scoring; game rules run on clients. */
export function createSparkTransport(database: Database, currentUid: () => string | null) {
  const actor = () => {const uid = currentUid();if (!uid) throw new Error('Accedi prima di entrare in una stanza');return uid;};
  const roomRef = (id: string) => {
    if (!/^[A-Z0-9]{6}$/.test(id)) throw new Error('Codice stanza non valido');
    return ref(database, `rooms/${id}`);
  };
  return {
    async read(id: string) {const uid=actor();return sparkRoomView((await get(roomRef(id))).val(), uid);},
    subscribe(id: string, next: (room: CoreRoom | null) => void, error: (e: unknown) => void) {
      const uid=actor();
      return onValue(roomRef(id), snapshot => {
        try {next(sparkRoomView(snapshot.val(), uid));} catch(e) {error(e);}
      }, error);
    },
    async command(id: string | null, request: Command): Promise<{roomId?: string;ok?: boolean;room: CoreRoom | null}> {
      const uid=actor(), now=Date.now();
      if (request.method === 'createRoom') {
        for (let attempt=0;attempt<10;attempt++) {
          const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          const code=Array.from({length:6},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
          const stored=encodeSparkRoom(createRoom(code,uid,request.args?.[0],now));
          const result=await runTransaction(roomRef(code), current=>current ? undefined : stored, {applyLocally:false});
          if(result.committed) return {roomId:code,room:sparkRoomView(result.snapshot.val(),uid)};
        }
        throw new Error('Riprova a creare la stanza');
      }
      if (!id) throw new Error('Codice stanza non valido');
      const target=roomRef(id);
      if(request.method==='getRoom') return {room:sparkRoomView((await get(target)).val(),uid)};
      if(request.method==='deleteRoom') {
        const existing=await get(target);
        // Legacy rules deny even a no-op deletion once hostId no longer exists.
        if(!existing.exists()) return {ok:true,room:null};
        if(decodeSparkRoom(existing.val()).hostId!==uid) throw new Error('Solo l’host può chiudere la stanza');
      }
      let rejected: Error | null=null;
      const result=await runTransaction(target,current=>{
        rejected=null;
        // An empty local cache must let RTDB retry with its current value.
        if(current===null) return null;
        try {
          const room=decodeSparkRoom(current);
          if(request.method==='deleteRoom') {
            if(room.hostId!==uid) throw new Error('Solo l’host può chiudere la stanza');
            return null;
          }
          return encodeSparkRoom(applyCommand(room,uid,request,now));
        } catch(e) {rejected=e instanceof Error?e:new Error('Impossibile aggiornare la stanza');return undefined;}
      },{applyLocally:false});
      if(rejected) throw rejected;
      if(!result.committed) throw new Error('Partita aggiornata: riprova');
      if(request.method!=='deleteRoom'&&!result.snapshot.exists()) throw new Error('Stanza non trovata');
      return {ok:true,room:sparkRoomView(result.snapshot.val(),uid)};
    },
  };
}
