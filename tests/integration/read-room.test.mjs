import test from 'node:test';
import assert from 'node:assert/strict';
const endpoint='http://127.0.0.1:5001/demo-gameshub/europe-west1/gameCommand';
async function user(){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});return r.json();}
async function command(u,roomId,method,args=[],expected){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(u?{Authorization:`Bearer ${u.idToken}`}:{})},body:JSON.stringify({data:{roomId,method,args,...(expected?{expected}:{})}})});const b=await r.json();if(b.error)throw Error(b.error.message);assert.ok(r.ok);return b.result;}
const read=async(u,id,args=[]) => (await command(u,id,'getRoom',args)).room;
test('callable reads return only the authenticated projection or public preview without mutating the room',async()=>{
 const users=await Promise.all([user(),user(),user(),user()]);const [host,guest,other,outsider]=users;
 const {roomId:id}=await command(host,null,'createRoom',['Host']);
 try{
  for(const [i,u] of [guest,other].entries())await command(u,id,'join',[`Guest ${i}`]);
  await command(host,id,'wavelength.init',[{cycles:1}]);
  const lobby=await read(host,id);const s=lobby.gameState;
  await command(host,id,'wavelength.start',[],{matchId:lobby.matchId,phase:s.phase,roundId:s.roundId,phaseVersion:s.phaseVersion});
  const views=await Promise.all(users.slice(0,3).map(u=>read(u,id)));
  const guesserIndex=users.findIndex(u=>u.localId===views[0].gameState.guesserUid);
  const guesser=users[guesserIndex];const someoneElse=users.find(u=>u!==guesser);
  assert.equal(views[guesserIndex].gameState.target,undefined);
  const spoofed=await read(guesser,id,[{uid:someoneElse.localId,viewer:someoneElse.localId}]);
  assert.equal(spoofed.gameState.target,undefined);
  const preview=await read(outsider,id);assert.equal(preview.gameState,undefined);assert.equal(preview.settings,undefined);
  for(const r of [...views,preview]){assert.equal(r.gameData,undefined);assert.equal(r.data,undefined);assert.equal(r.gameState?.private,undefined);}
  assert.equal((await read(host,id)).updatedAt,views[0].updatedAt);
  await assert.rejects(command(null,id,'getRoom'),/Accedi/);
  await assert.rejects(command(host,'../rooms','getRoom'),/Codice/);
  if(process.env.ROOM_TRANSPORT==='callable'){
   const r=await fetch(`http://127.0.0.1:9000/roomsV2/${id}/views/${host.localId}.json?ns=demo-gameshub-default-rtdb&auth=${host.idToken}`);
   assert.equal(r.ok,false,'Live-equivalent rules must deny direct roomsV2 reads');
  }
 }finally{await command(host,id,'deleteRoom');}
 assert.equal(await read(host,id),null);
});
