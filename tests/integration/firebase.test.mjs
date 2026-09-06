import test from 'node:test';
import assert from 'node:assert/strict';
const project='demo-gameshub';
const db=`http://127.0.0.1:9000`;
async function user() {
  if(process.env.ROOM_TRANSPORT==='spark') return (await import('../helpers/sparkClient.mjs')).newSparkUser();
  const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  const u=await r.json();assert.ok(u.idToken,JSON.stringify(u));return {uid:u.localId,token:u.idToken};
}
async function command(u,roomId,method,args=[],expected) {
  if(process.env.ROOM_TRANSPORT==='spark') return u.transport.command(roomId,{method,args,...(expected?{expected}:{})});
  const r=await fetch(`http://127.0.0.1:5001/${project}/europe-west1/gameCommand`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${u.token}`},body:JSON.stringify({data:{roomId,method,args,...(expected?{expected}:{})}})});
  const body=await r.json();if(body.error) throw new Error(body.error.message);assert.ok(r.ok,JSON.stringify(body));return body.result;
}
async function read(u,path) {
  const r=await fetch(`${db}/${path}.json?ns=${project}-default-rtdb&auth=${u.token}`);
  if(!r.ok) throw new Error(`RTDB denied ${r.status}`);return r.json();
}
async function view(u,id) {if(process.env.ROOM_TRANSPORT==='spark')return u.transport.read(id);return process.env.ROOM_TRANSPORT==='callable' ? (await command(u,id,'getRoom')).room : read(u,`roomsV2/${id}/views/${u.uid}`);}
function version(r) {return {matchId:r.matchId ?? 0,phase:r.gameState?.phase ?? null,votingEndsAt:r.gameState?.votingEndsAt ?? null,cardVersion:r.cardVersion ?? 0};}
async function act(u,id,method,args=[]) {return command(u,id,method,args,version(await view(u,id)));}

test('Firebase enforces ownership, private data, late joining, atomic cards and disabled Lupus', async () => {
  const users=await Promise.all(Array.from({length:5},()=>user()));const [host,guest]=users;
  const {roomId:id}=await command(host,null,'createRoom',['Host']);
  for(let i=1;i<4;i++) await command(users[i],id,'join',[`Player ${i}`]);
  await assert.rejects(read(guest,`roomsV2/${id}/data`),/denied/);
  await assert.rejects(read(guest,`roomsV2/${id}/views/${host.uid}`),/denied/);
  // Shared-production mode preserves access to legacy rooms for the live app.
  if(!['callable','spark'].includes(process.env.ROOM_TRANSPORT)) await assert.rejects(read(guest,'rooms/ABC123'),/denied/);
  const write=await fetch(`${db}/roomsV2/${id}/preview/status.json?ns=${project}-default-rtdb&auth=${guest.token}`,{method:'PUT',body:JSON.stringify('active')});assert.equal(write.ok,false);
  await assert.rejects(act(guest,id,'initImpostoreGame',[1,0,true,true,45]),/host/);
  await act(host,id,'initImpostoreGame',[1,0,true,true,45]);
  assert.equal((await view(host,id)).settings.votingSeconds,45);
  await act(host,id,'startImpostoreGame');
  const views=await Promise.all(users.slice(0,4).map(u=>view(u,id)));
  const imp=views.findIndex((r,i)=>r.players[users[i].uid].role==='impostor');assert.ok(imp>=0);
  assert.equal(views[imp].gameState.word,undefined);assert.equal(views[imp].gameState.usedWords,undefined);
  const other=users[(imp+1)%4];assert.equal(views[imp].players[other.uid].role,undefined);
  await act(host,id,'endImpostoreGame');
  await act(host,id,'initIndovinaGame',[{wordSource:'random'}]);await act(host,id,'startIndovinaGame');
  await command(users[4],id,'join',['Late']);
  const ind=await view(host,id);assert.equal(ind.gameState.phase,'playing');assert.equal(ind.players[host.uid].word,undefined);assert.ok(ind.players[guest.uid].word);
  const late=await view(users[4],id);assert.equal(late.players[guest.uid].word,undefined);
  await act(host,id,'endIndovinaGame');
  await act(host,id,'initTabooGame',[{turnSeconds:60,turnsPerTeam:2,maxSkips:3,teamMode:'auto'}]);
  await act(host,id,'startTabooGame');
  let state=await view(host,id);const describer=users.find(u=>u.uid===state.gameState.describerUid);assert.ok(describer);
  await act(describer,id,'beginTabooTurn');
  state=await view(describer,id);const expected=version(state);
  const outcomes=await Promise.allSettled([command(describer,id,'resolveTabooCard',['correct'],expected),command(describer,id,'resolveTabooCard',['correct'],expected)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  await act(describer,id,'resolveTabooCard',['correct']);
  state=await view(describer,id);assert.ok(state.gameState.currentCard.word);assert.equal(state.gameState.deck,undefined);
  assert.equal(state.gameState.turnStats.correct,2);
  assert.equal(state.gameState.scores,undefined);
  await assert.rejects(act(guest,id,'initLupusGame',[{}]),/disponibile/);
  await assert.rejects(command(guest,id,'deleteRoom'),/host/);
  await command(host,id,'deleteRoom');assert.equal(['callable','spark'].includes(process.env.ROOM_TRANSPORT) ? await view(host,id) : await read(host,`roomsV2/${id}/preview`),null);
});
