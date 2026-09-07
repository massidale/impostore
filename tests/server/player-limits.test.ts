import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer} from '../helpers/serverLoader.ts';
const {createRoom,applyCommand}=loadServer('server/engine.ts');
function lobby(count:number) {
 let r=createRoom('ABC123','p0','Host',0);
 for(let i=1;i<count;i++)r=applyCommand(r,`p${i}`,{method:'join',args:[`Player ${i}`]},i);
 return r;
}
function start(game:string, count:number, settings:any={}) {
 let r=lobby(count);
 r=applyCommand(r,'p0',{method:`${game}.init`,args:[settings]},100);
 return applyCommand(r,'p0',{method:`${game}.start`,expected:{matchId:r.matchId??0,phase:r.gameState.phase,roundId:r.gameState.roundId??0,phaseVersion:r.gameState.phaseVersion??0}},101);
}
for(const game of ['che-domanda','wavelength','just-one','times-up','herd-mentality']) {
 test(`${game} accepts groups larger than previous limits`,()=>{
  const r=start(game,30);assert.equal(r.gameState.participantUids.length,30);
 });
}
test('Just One teams also accept larger groups',()=>{
 const r=start('just-one',30,{mode:'teams',rounds:5});
 assert.deepEqual(Object.values(r.gameState.teams).map((t:any)=>t.participantUids.length).sort(),[15,15]);
});
test('Top Ten retains the ten distinct numbers limit',()=>{
 assert.equal(start('top-ten',10).gameState.participantUids.length,10);
 assert.throws(()=>start('top-ten',11),/10 giocatori/);
});

test('rooms allow 30 players, reject a 31st and allow existing members to reconnect',()=>{
 const r=lobby(30);
 assert.throws(()=>applyCommand(r,'extra',{method:'join',args:['Extra']},100),/Stanza piena/);
 assert.equal(Object.keys(applyCommand(r,'p1',{method:'join',args:['Player 1']},100).players).length,30);
});
