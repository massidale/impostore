import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {get,ref,set,remove}=require('firebase/database');
test('Spark realtime updates, persisted collections and legacy-room protection', {skip:process.env.ROOM_TRANSPORT!=='spark'}, async()=>{
 const {newSparkUser}=await import('../helpers/sparkClient.mjs');
 const [host,guest]=await Promise.all([newSparkUser(),newSparkUser()]);
 const {roomId:id}=await host.transport.command(null,{method:'createRoom',args:['Host']});
 let stop=()=>{};
 try{
  let resolveJoined;const joined=new Promise(resolve=>{resolveJoined=resolve});
  const observed=[];const errors=[];
  stop=host.transport.subscribe(id,room=>{observed.push(room);if(room?.players?.[guest.uid])resolveJoined(room);},e=>errors.push(e));
  await guest.transport.command(id,{method:'join',args:['Guest']});
  const timeout=setTimeout(()=>resolveJoined(null),8000);
  const latest=await joined;clearTimeout(timeout);assert.ok(latest?.players[guest.uid]);assert.deepEqual(errors,[]);
  await host.transport.command(id,{method:'just-one.init',args:[{rounds:5}]});
  const raw=(await get(ref(host.db,`rooms/${id}`))).val();
  assert.equal(raw.gameData.spark.version,1);assert.equal(typeof raw.gameData.spark.state,'string');
  const state=JSON.parse(raw.gameData.spark.state);assert.equal(state.settings.rounds,5);
  assert.equal(raw.settings,undefined);assert.equal(raw.matchId,undefined);
  stop();const count=observed.length;await host.transport.command(id,{method:'deleteRoom'});
  assert.equal(await guest.transport.read(id),null);assert.equal(observed.length,count);
 }finally{stop();await host.transport.command(id,{method:'deleteRoom'});}
 const legacyId='OLD'+Math.random().toString(36).slice(2,5).toUpperCase().padEnd(3,'A');
 const legacy={id:legacyId,status:'lobby',hostId:host.uid,createdAt:1,updatedAt:1,currentGameId:'taboo'};
 await set(ref(host.db,`rooms/${legacyId}`),legacy);
 try{
  await assert.rejects(host.transport.command(legacyId,{method:'join',args:['No']}),/versione/);
  assert.deepEqual((await get(ref(host.db,`rooms/${legacyId}`))).val(),legacy);
 }finally{await remove(ref(host.db,`rooms/${legacyId}`));}
});
