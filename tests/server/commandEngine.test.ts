import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer as load} from '../helpers/serverLoader.ts';
const {applyCommand, projectRoom, previewRoom} = load('server/engine.ts');
function room(game = 'indovina'): any {
  return {id:'ABC123', hostId:'a', status:'active', currentGameId:game, createdAt:1, updatedAt:1, matchId:1, cardVersion:0,
    players:{a:{joinedAt:1,name:'A',isHost:true},b:{joinedAt:2,name:'B'},c:{joinedAt:3,name:'C'}}, gameState:{phase:'collecting'}};
}
function command(r: any, actor: string, method: string, args: any[] = []) {
  return applyCommand(r, actor, {method, args, expected: {matchId:r.matchId, phase:r.gameState?.phase, votingEndsAt:r.gameState?.votingEndsAt ?? null, cardVersion:r.cardVersion}}, 100);
}
test('guests cannot reset a room or impersonate voters', () => {
  const r=room('impostore'); r.gameState={phase:'voting'};
  assert.throws(()=>command(r,'b','endImpostoreGame'), /host/i);
  assert.throws(()=>command(r,'b','castVote',['a','c']), /identit/i);
});
test('late spectators do not block collecting', () => {
  let r=room(); r.players.late={joinedAt:4,waiting:true};
  r=command(r,'a','submitPlayerWord',['a','Mela']);
  r=command(r,'b','submitPlayerWord',['b','Pera']);
  r=command(r,'c','submitPlayerWord',['c','Kiwi']);
  assert.equal(r.gameState.phase,'playing');
  assert.equal(r.players.late.word,undefined);
});
test('private projections exclude roles, own word, dictionaries and history', () => {
  let r=room('impostore'); r.players.b.role='impostor';r.players.a.role='civilian';r.gameState={phase:'playing',word:'Segreto',usedWords:['Segreto'],hint:'Indizio',hintOnlyFirst:true};r.gameData={impostore:{dictionary:{Segreto:'Indizio'}}};
  const view=projectRoom(r,'b');
  assert.equal(view.gameState.word,undefined);assert.equal(view.gameState.hint,undefined);assert.equal(view.players.a.role,undefined);assert.equal(view.gameData,undefined);assert.equal(view.gameState.usedWords,undefined);
  r=room();r.gameState={phase:'playing'};r.players.a.word='Mela';r.players.b.word='Pera';
  assert.equal(projectRoom(r,'a').players.a.word,undefined);assert.equal(projectRoom(r,'a').players.b.word,'Pera');
  assert.equal(previewRoom(r).gameState,undefined);
});
test('Lupus is rejected even through a direct command', () => {
  const r=room();r.status='lobby';r.gameState={phase:'setup'};
  assert.throws(()=>command(r,'a','initLupusGame',[{}]), /disponibile|comando/i);
});
test('Taboo rejects duplicate card resolution and refills from bundled cards', () => {
  const r=room('taboo');r.players.d={joinedAt:4};
  const deck=[{word:'Custom A',taboo:['a','b','c','d','e']},{word:'Custom B',taboo:['a','b','c','d','e']}];
  r.gameData={taboo:{dictionary:deck}};
  r.gameState={phase:'turn',deck,cursor:1,turnEndsAt:1000,teams:{a:'blue',b:'blue',c:'red',d:'red'},currentTeam:'blue',describerUid:'a',scores:{blue:0,red:0},turnStats:{correct:0,taboo:0,skipped:0}};
  const request={method:'resolveTabooCard',args:['correct'],expected:{matchId:1,phase:'turn',cardVersion:0,votingEndsAt:null}};
  const next=applyCommand(r,'a',request,100);
  assert.equal(next.gameState.scores,undefined);
  assert.ok(next.gameState.deck.every((c:any)=>!c.word.startsWith('Custom')));
  assert.throws(()=>applyCommand(next,'a',request,100),/aggiornata|obsolet/i);
  assert.equal(projectRoom(next,'b').gameState.currentCard,undefined);
  assert.equal(projectRoom(next,'c').gameState.currentCard.word,next.gameState.deck[0].word);
  assert.equal(projectRoom(next,'a').gameState.deck,undefined);
});

test('custom dictionaries are unavailable even for the host', () => {
  const r=room('impostore');r.status='lobby';r.gameState={phase:'setup'};
  assert.throws(() => command(r,'a','setDictionary',['impostore',{'AC/DC':'Rock'}]), /personalizzati/);
});
test('validated defaults are persisted consistently with game state', () => {
  const r=room('impostore');r.status='lobby';r.gameState={phase:'setup'};
  const next=command(r,'a','initImpostoreGame',[1,0,true,false,null]);
  assert.equal(next.settings.votingSeconds,60);
  assert.equal(next.gameState.votingSeconds,60);
});

test('an active guest cannot reset the match by deleting their own player record', () => {
  const r=room('taboo');r.gameState={phase:'turn'};
  assert.throws(()=>command(r,'b','removePlayer',['b']),/corso|round/);
  r.players.b.waiting=true;
  const next=command(r,'b','removePlayer',['b']);
  assert.equal(next.status,'active');assert.equal(next.players.b,undefined);
});
