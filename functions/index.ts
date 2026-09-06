import { initializeApp } from 'firebase-admin/app';
import { getDatabaseWithUrl } from 'firebase-admin/database';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomInt } from 'node:crypto';
import { applyCommand, createRoom, previewRoom, projectRoom, type Command } from '../server/engine';
import type { Room } from '../server/runtime';
import {encodeRoom,decodeRoom} from '../server/roomCodec';
initializeApp();
function envelope(room: Room) {
  return JSON.parse(JSON.stringify({data:encodeRoom(room),preview:previewRoom(room),views:Object.fromEntries(Object.keys(room.players ?? {}).map(uid=>[uid,projectRoom(room,uid)]))}));
}
export const gameCommand = onCall({region:'europe-west1', maxInstances:10}, async request => {
  const actor=request.auth?.uid;
  if(!actor) throw new HttpsError('unauthenticated','Accedi prima di entrare in una stanza');
  const command=request.data as Command & {roomId?:string};
  if(!command || typeof command.method!=='string' || JSON.stringify(command).length>1_000_000) throw new HttpsError('invalid-argument','Richiesta non valida');
  const databaseUrl = process.env.FIREBASE_DATABASE_EMULATOR_HOST
    ? `https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`
    : 'https://gameshub-6b1ce-default-rtdb.europe-west1.firebasedatabase.app';
  const db=getDatabaseWithUrl(databaseUrl);const now=Date.now();
  if(command.method==='createRoom') {
    for(let attempt=0;attempt<5;attempt++) {
      const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const id=Array.from({length:6},()=>chars[randomInt(chars.length)]).join('');
      let room:Room;
      try {room=createRoom(id,actor,command.args?.[0],now);} catch(e) {throw new HttpsError('invalid-argument',(e as Error).message);}
      const result=await db.ref(`roomsV2/${id}`).transaction(current=>current ? undefined : envelope(room));
      if(result.committed) return {roomId:id};
    }
    throw new HttpsError('resource-exhausted','Riprova a creare la stanza');
  }
  if(typeof command.roomId!=='string' || !/^[A-Z0-9]{6}$/.test(command.roomId)) throw new HttpsError('invalid-argument','Codice stanza non valido');
  const target=db.ref(`roomsV2/${command.roomId}`);
  if (command.method === 'getRoom') {
    const snapshot = await target.child('data').get();
    if (!snapshot.exists()) return {room: null};
    const room = decodeRoom(snapshot.val());
    // The caller can only read their own projection. Non-members get the same
    // public preview as the join screen, never authoritative state or a deck.
    return {room: Object.hasOwn(room.players ?? {}, actor) ? projectRoom(room, actor) : previewRoom(room)};
  }
  // RTDB can invoke the transaction callback first with an empty local cache.
  // Returning null lets the compare-and-set retry with the real server value.
  try {
    let rejected: Error | null = null;
    const result=await target.transaction(current=>{
      rejected = null;
      try {
      if(!current?.data) return current;
      const room=decodeRoom(current.data);
      if(command.method==='deleteRoom') {
        if(room.hostId!==actor) throw new Error('Solo l’host può chiudere la stanza');
        return null;
      }
      return envelope(applyCommand(room,actor,command,now));
      } catch (error) {
        // A callback may run asynchronously on an RTDB retry. Abort explicitly:
        // throwing here can escape the SDK callback and leave the promise pending.
        rejected = error instanceof Error ? error : new Error('Comando non valido');
        return undefined;
      }
    });
    if (rejected) throw rejected;
    if(command.method!=='deleteRoom' && !result.snapshot.exists()) throw new Error('Stanza non trovata');
    return {ok:true};
  } catch(e) {
    throw new HttpsError('failed-precondition',e instanceof Error ? e.message : 'Impossibile aggiornare la stanza');
  }
});
