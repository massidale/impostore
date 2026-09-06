import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServer } from '../helpers/serverLoader.ts';
const m = loadServer('server/games/just-one.ts').justOneModule;
function start(count = 4) {
  const ids = Array.from({length: count}, (_, i) => String.fromCharCode(97 + i));
  const r: any = {id:'teams', hostId:'a', players:Object.fromEntries(ids.map(id => [id,{name:id}])), gameState:{participantUids:ids}};
  m.init(r, {rounds:5, mode:'teams'}, 0);
  m.start(r,0);
  return r;
}
function action(r:any, team:any, actor:string, name:string, payload:any={}) {
  return m.apply(r, actor, name, {...payload, teamId:team.id, teamRoundId:team.roundId, teamPhaseVersion:team.phaseVersion}, 0);
}
function solve(r:any, t:any, correct=true) {
  const authors=t.participantUids.filter((id:string)=>id!==t.guesserUid);
  authors.forEach((id:string,i:number)=>action(r,t,id,'submitClue',{text:['brina','luce','vento','cielo'][i]}));
  authors.forEach((id:string)=>action(r,t,id,'confirmReview'));
  assert.equal(t.phase,'guessing');
  action(r,t,t.guesserUid,correct?'submitGuess':'pass',{text:t.private.current.word});
}
test('team settings validate mode, start with four players and balanced fixed rosters',()=>{
  assert.throws(()=>m.validateSettings({rounds:5,mode:'other'},['a','b','c','d']));
  assert.throws(()=>start(3),/4/);
  const r=start(5); const teams=Object.values(r.gameState.teams) as any[];
  assert.equal(teams.length,2);
  assert.deepEqual(teams.map(t=>t.participantUids.length).sort(),[2,3]);
  assert.equal(new Set(teams.flatMap(t=>t.participantUids)).size,5);
  assert.ok(teams.every(t=>t.private.deck.length>=5));
  assert.ok(!teams[0].private.deck.slice(0,5).some((w:any)=>teams[1].private.deck.slice(0,5).some((v:any)=>v.id===w.id)));
});
test('two-player teams keep one clue and move independently without leaking other team secrets',()=>{
  const r=start(); const [a,b]=Object.values(r.gameState.teams) as any[];
  const untouched=structuredClone(b);
  solve(r,a);
  assert.equal(a.wordsGuessed,1); assert.deepEqual(b,untouched);
  const view=m.project(r,b.guesserUid).gameState;
  assert.equal(view.myTeam.id,b.id);
  assert.equal(view.myTeam.target,undefined);
  assert.equal(JSON.stringify(view).includes(a.private.current.word),false);
  const author=b.participantUids.find((id:string)=>id!==b.guesserUid);
  action(r,b,author,'submitClue',{text:'brina'});
  assert.throws(()=>action(r,b,a.guesserUid,'confirmReview'));
  action(r,b,author,'confirmReview');
  assert.deepEqual(b.validClues,['brina']);
  assert.equal(m.project(r,'spectator').gameState.myTeam,undefined);
  assert.equal(JSON.stringify(m.project(r,author)).includes('private'),false);
});
test('duplicate cancellation and flags are scoped to own team',()=>{
  const r=start(6); const [a,b]=Object.values(r.gameState.teams) as any[];
  for(const t of [a,b]) {
    const authors=t.participantUids.filter((id:string)=>id!==t.guesserUid);
    authors.forEach((id:string,i:number)=>action(r,t,id,'submitClue',{text:t===a || i===0?'brina':'vento'}));
    assert.throws(()=>action(r,t,authors[0],'flagClue',{authorUid:(t===a?b:a).participantUids[0]}));
    authors.forEach((id:string)=>action(r,t,id,'confirmReview'));
  }
  assert.equal(a.phase,'roundResults'); assert.equal(b.phase,'guessing');
  assert.deepEqual(b.validClues.sort(),['brina','vento']);
});
test('both teams get equal turns, rotate guessers and finish with a winner or a tie',()=>{
  for(const tie of [true,false]) {
    const r=start(); const teams=Object.values(r.gameState.teams) as any[];
    for(const [index,t] of teams.entries()) {
      for(let i=0;i<5;i++) {
        assert.equal(t.guesserUid,t.participantUids[i%t.participantUids.length]);
        solve(r,t,tie || index===0);
        const stale={teamId:t.id,teamRoundId:t.roundId,teamPhaseVersion:t.phaseVersion};
        action(r,t,t.guesserUid,'nextRound');
        assert.throws(()=>m.apply(r,r.hostId,'cancelRound',stale,0));
      }
      assert.equal(t.history.length,5);
      assert.equal(r.gameState.phase,index===0?'teams':'results');
    }
    const view=m.project(r,'a').gameState;
    assert.deepEqual(view.winnerTeamIds,tie?teams.map(t=>t.id):[teams[0].id]);
    assert.equal(view.score,undefined);
  }
});
test('cooperative projection has outcomes without points and ignores uploaded decks',()=>{
  const r:any={id:'coop',hostId:'a',players:{a:{},b:{},c:{}},gameState:{},gameData:{'just-one':{content:[{word:'injected',aliases:[]}]}}};
  m.init(r,{rounds:5,mode:'cooperative'},0); m.start(r,0);
  assert.notEqual(r.gameState.private.current.word,'injected');
  m.apply(r,'a','cancelRound',{},0);
  const view=m.project(r,'a').gameState;
  assert.equal(view.score,undefined); assert.equal(view.roundResult.points,undefined);
});
test('other team phase changes do not invalidate an in-flight command, but own stale tokens do',()=>{
  const {dispatchModule}=loadServer('server/gameDispatch.ts');
  let r=start(); r.status='active'; r.matchId=1; r.currentGameId='just-one';
  const [a,b]=Object.values(r.gameState.teams) as any[];
  const rootToken={matchId:1,phase:r.gameState.phase,roundId:r.gameState.roundId,phaseVersion:r.gameState.phaseVersion};
  const authorA=a.participantUids.find((id:string)=>id!==a.guesserUid);
  const authorB=b.participantUids.find((id:string)=>id!==b.guesserUid);
  const tokenA={teamId:a.id,teamRoundId:a.roundId,teamPhaseVersion:a.phaseVersion};
  const tokenB={teamId:b.id,teamRoundId:b.roundId,teamPhaseVersion:b.phaseVersion};
  r=dispatchModule(r,authorA,'submitClue',{...tokenA,text:'brina'},rootToken,1,m);
  assert.equal(r.gameState.teams[a.id].phase,'review');
  r=dispatchModule(r,authorB,'submitClue',{...tokenB,text:'luce'},rootToken,1,m);
  assert.equal(r.gameState.teams[b.id].phase,'review');
  assert.throws(()=>dispatchModule(r,authorA,'confirmReview',tokenA,rootToken,1,m),/cambiata/);
});
