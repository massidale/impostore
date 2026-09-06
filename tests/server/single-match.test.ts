import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer} from '../helpers/serverLoader.ts';
const {applyCommand, createRoom} = loadServer('server/engine.ts');
const expected = (r:any) => ({matchId:r.matchId, phase:r.gameState.phase, roundId:r.gameState.roundId, phaseVersion:r.gameState.phaseVersion});
const act = (r:any, who:string, action:string, payload?:any) => applyCommand(r,who,{method:`${r.currentGameId}.${action}`,args:payload === undefined ? []:[payload],expected:expected(r)},100);
function start(game:string) {
 let r=createRoom('ABC123','a','A',0);
 for(const id of ['b','c']) r=applyCommand(r,id,{method:'join',args:[id]},1);
 r=applyCommand(r,'a',{method:`${game}.init`,args:[{guesserUid:'b',mode:'cooperative'}]},2);
 return act(r,'a','start');
}
for(const game of ['wavelength','just-one']) {
 test(`${game}: one attempt finishes a match and replay rotates indefinitely`,()=>{
  let r=start(game);
  for(const guesser of ['b','c','a','b','c']) {
   assert.equal(r.gameState.guesserUid,guesser);
   if(game==='wavelength') {
    r=act(r,guesser,'beginGuess');r=act(r,guesser,'submitGuess',{value:5});
   } else r=act(r,'a','cancelRound');
   assert.equal(r.gameState.phase,'results');
   const request={method:`${game}.replay`,expected:expected(r)};
   assert.throws(()=>applyCommand(r,'b',request,100),/host/);
   r=applyCommand(r,'a',request,100);
   assert.throws(()=>applyCommand(r,'a',request,100),/aggiornat/);
  }
 });
 test(`${game}: returning to lobby preserves next guesser, explicit selection overrides it`,()=>{
  let r=start(game);r=act(r,'a','cancelRound');r=act(r,'a','end');
  assert.equal(r.settings.guesserUid,'c');
  r=act(r,'a','init',{...r.settings});r=act(r,'a','start');assert.equal(r.gameState.guesserUid,'c');
  r=act(r,'a','end');r=act(r,'a','init',{...r.settings,guesserUid:'b'});r=act(r,'a','start');assert.equal(r.gameState.guesserUid,'b');
 });
 test(`${game}: a new spectator joins the next match and cannot replay`,()=>{
  let r=start(game);r=applyCommand(r,'d',{method:'join',args:['D']},3);
  r=act(r,'a','cancelRound');assert.throws(()=>act(r,'d','replay'),/host/);
  r=act(r,'a','replay');assert.ok(r.gameState.participantUids.includes('d'));assert.ok(!r.players.d.waiting);
 });
}
