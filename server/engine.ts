import { RoomStore, type Room } from './runtime';
import { createImpostoreCommands } from './games/impostore';
import { createIndovinaCommands } from './games/indovina';
import { createTabooCommands } from './games/taboo';

export interface Command {
  method: string;
  args?: unknown[];
  expected?: { matchId?: number; phase?: string; votingEndsAt?: number | null; cardVersion?: number };
}
const games = ['impostore', 'indovina', 'taboo'];
const hostMethods = new Set(['initImpostoreGame','initIndovinaGame','initTabooGame','startImpostoreGame','startIndovinaGame','startTabooGame','endImpostoreGame','endIndovinaGame','endTabooGame','startVoting','closeVotingByTimeout','finalizeCollecting','resetImpostoreUsedWords','resetIndovinaUsedWords','updateImpostoreSettings','setDictionary','resetPlayersToCore']);
const methodsByGame: Record<string, string[]> = {
  impostore: ['initImpostoreGame','resetImpostoreUsedWords','startImpostoreGame','endImpostoreGame','markPlayerAsRevealed','startVoting','castVote','closeVotingByTimeout','submitImpostorGuess','updateImpostoreSettings'],
  indovina: ['initIndovinaGame','resetIndovinaUsedWords','startIndovinaGame','submitPlayerWord','finalizeCollecting','endIndovinaGame'],
  taboo: ['initTabooGame','startTabooGame','beginTabooTurn','resolveTabooCard','undoTabooCard','endTabooTurn','endTabooGame'],
};
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function text(value: unknown, max = 60): string {
  check(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, 'Testo non valido');
  return value.trim();
}
function integer(value: unknown, min: number, max: number): number {
  check(typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max, 'Impostazione numerica non valida');
  return value;
}
function bool(value: unknown): boolean {check(typeof value === 'boolean','Impostazione non valida'); return value;}
function corePlayer(p: any) { return {joinedAt:p.joinedAt, name:p.name ?? '', isHost:p.isHost === true, ...(p.waiting ? {waiting:true} : {})}; }

export function createRoom(id: string, actor: string, name: unknown, now: number): Room {
  check(/^[A-Z0-9]{6}$/.test(id) && !!actor, 'Identità non valida');
  return {id,hostId:actor,status:'lobby',currentGameId:'none',createdAt:now,updatedAt:now,matchId:0,cardVersion:0,players:{[actor]:{joinedAt:now,name:text(name,30),isHost:true}}};
}

function settingsFor(game: string, args: any[], room: Room): any {
  if (game === 'impostore') return {numImpostors:integer(args[0],1,30),numClowns:integer(args[1],0,30),hintEnabled:bool(args[2]),hintOnlyFirst:bool(args[3]),votingSeconds:integer(args[4] ?? 60,15,300)};
  const s = args[0];check(s && typeof s === 'object','Impostazioni mancanti');
  if (game === 'indovina') {check(['random','players'].includes(s.wordSource),'Sorgente non valida');return {wordSource:s.wordSource};}
  check(['auto','manual'].includes(s.teamMode ?? 'auto'),'Squadre non valide');
  const manualTeams: Record<string,string> = {};
  for (const [uid,team] of Object.entries(s.manualTeams ?? {})) {
    if (!room.players?.[uid]) continue;
    check(['blue','red'].includes(team as string),'Squadra non valida');manualTeams[uid]=team as string;
  }
  return {turnSeconds:integer(s.turnSeconds,15,300),turnsPerTeam:integer(s.turnsPerTeam,1,30),maxSkips:integer(s.maxSkips ?? 3,0,30),teamMode:s.teamMode ?? 'auto',manualTeams};
}
function cleanDictionary(game: string, data: any): any {
  if (data === null) return null;
  if (game === 'impostore') {
    check(data && !Array.isArray(data) && typeof data === 'object','Dizionario non valido');
    const entries=Object.entries(data);check(entries.length>0 && entries.length<=10000,'Dimensione dizionario non valida');
    return entries.map(([word,hint])=>({word:text(word),hint:text(hint)}));
  }
  check(Array.isArray(data) && data.length>0 && data.length<=10000,'Dizionario non valido');
  if (game === 'indovina') return [...new Set(data.map(w=>text(w)))];
  return data.map(c=>{check(c && Array.isArray(c.taboo) && c.taboo.length===5,'Servono cinque parole vietate');return {word:text(c.word),taboo:c.taboo.map((w:unknown)=>text(w))};});
}

/** Pure synchronous transition. The caller commits it with an RTDB transaction. */
export function applyCommand(input: Room, actor: string, request: Command, now: number): Room {
  check(input && actor && request && typeof request.method === 'string','Richiesta non valida');
  const room: Room = structuredClone(input);
  const {method} = request;const args:any[] = structuredClone(request.args ?? []);check(Array.isArray(args) && args.length<=6,'Argomenti non validi');
  if (method === 'join') {
    if (room.players?.[actor]) return room;
    const name=text(args[0],30);const players=Object.values(room.players ?? {});
    check(players.length<30,'Stanza piena');
    check(!players.some(p=>p.name?.trim().toLowerCase()===name.toLowerCase()),'Questo nome è già usato nella stanza');
    (room.players ??= {})[actor]={joinedAt:now,name,isHost:false,...(room.status==='active'?{waiting:true}:{})};room.updatedAt=now;return room;
  }
  const me=room.players?.[actor];check(me,'Non fai parte della stanza');
  if (method === 'removePlayer') {
    const target=text(args[0],128);check(actor===room.hostId || actor===target,'Solo l’host può rimuovere altri giocatori');
    check(target!==room.hostId,'L’host deve chiudere la stanza');
    check(room.status !== 'active' || room.players?.[target]?.waiting, 'Partita in corso: termina il round prima di rimuovere un partecipante');
    delete room.players![target];room.updatedAt=now;return room;
  }
  if (hostMethods.has(method)) check(actor===room.hostId,'Solo l’host può eseguire questa azione');
  if (method==='resetPlayersToCore') {check(room.status==='lobby','Partita in corso');return room;}
  if (method==='setDictionary') {
    check(room.status==='lobby','Cambia dizionario nella lobby');const game=text(args[0],20);check(games.includes(game)&&game===room.currentGameId,'Gioco non disponibile');
    const dictionary=cleanDictionary(game,args[1]);
    (room.gameData ??= {})[game]={dictionary};
    if(room.gameState) delete room.gameState.usedWords;
    room.updatedAt=now;return room;
  }
  const game=games.find(g=>methodsByGame[g].includes(method));check(game,'Comando non disponibile');
  const isInit=method.startsWith('init');
  if (isInit) {
    check(room.status==='lobby','Partita in corso');
    const settings=settingsFor(game,args,room);
    if (game!==room.currentGameId) {room.gameState=undefined;for(const [uid,p] of Object.entries(room.players ?? {})) room.players![uid]=corePlayer(p);}
    room.settings=settings;
    if(game!=='impostore') args[0]=settings;
    else args.splice(0,args.length,settings.numImpostors,settings.numClowns,settings.hintEnabled,settings.hintOnlyFirst,settings.votingSeconds);
  } else {
    check(room.currentGameId===game,'Gioco non disponibile');
    const expected=request.expected;
    check(expected && (expected.matchId ?? 0)===(room.matchId ?? 0) && expected.phase===room.gameState?.phase,'Partita aggiornata: riprova');
    if (room.gameState?.phase==='voting') check((expected.votingEndsAt ?? null)===(room.gameState.votingEndsAt ?? null),'Votazione aggiornata: riprova');
    if(game==='taboo') check((expected.cardVersion ?? 0)===(room.cardVersion ?? 0),'Carta aggiornata: riprova');
  }
  const gs=room.gameState ?? {};
  if(method.startsWith('start') && method.endsWith('Game')) {
    check(room.status==='lobby','Partita già iniziata');
    const count=Object.values(room.players ?? {}).filter(p=>!p.waiting).length;
    check(count >= ({impostore:3,indovina:2,taboo:4}[game] ?? 2),'Giocatori insufficienti');
    if(game==='impostore') check(gs.numImpostors+(gs.numClowns ?? 0)<count,'Servono anche giocatori civili');
    room.matchId=(room.matchId ?? 0)+1;
  }
  const participant = () => check(!me.waiting && room.status==='active','Non partecipi a questo round');
  if(['markPlayerAsRevealed','castVote','submitPlayerWord'].includes(method)) {participant();check(args[0]===actor,'Identità non valida');}
  if(method==='markPlayerAsRevealed') check(gs.phase==='playing','Fase non valida');
  if(method==='submitPlayerWord') args[1]=text(args[1]);
  if(method==='castVote') {
    const target=args[1];check(target!==actor && room.players?.[target] && !room.players[target].waiting && !room.players[target].eliminated && !me.eliminated,'Voto non valido');
    check(gs.votingEndsAt>now,'Votazione scaduta');
  }
  if(method==='startVoting') check(gs.phase==='playing','Fase non valida');
  if(method==='closeVotingByTimeout') check(gs.votingEndsAt<=now,'Votazione ancora in corso');
  if(method==='submitImpostorGuess') {participant();check(gs.eliminatedPlayer===actor && me.role==='impostor','Solo l’impostore eliminato può rispondere');args[0]=text(args[0]);}
  if(method==='updateImpostoreSettings') throw new Error('Usa le impostazioni della lobby');
  if(game==='taboo' && ['beginTabooTurn','resolveTabooCard','undoTabooCard','endTabooTurn'].includes(method)) {
    participant();const isDescriber=gs.describerUid===actor;
    if(method==='endTabooTurn') check(actor===room.hostId || (isDescriber && gs.turnEndsAt<=now),'Solo l’host può terminare in anticipo');
    else if(method==='resolveTabooCard') {
      check(['correct','skip','taboo'].includes(args[0]),'Esito non valido');
      check(isDescriber || (args[0]==='taboo' && gs.teams?.[actor] && gs.teams[actor]!==gs.currentTeam),'Azione non consentita');
      check(gs.turnEndsAt>now,'Turno scaduto');
    } else check(isDescriber,'Solo il descrittore può eseguire questa azione');
    if(method==='undoTabooCard') check(gs.turnEndsAt>now,'Turno scaduto');
    room.cardVersion=(room.cardVersion ?? 0)+1;
  }
  const store=new RoomStore(room,now);
  const commands:Record<string,Function>={...createImpostoreCommands(store),...createIndovinaCommands(store),...createTabooCommands(store)};
  commands[method](room.id,...args);
  return store.room;
}
export function previewRoom(room: Room): Room {
  return {id:room.id,status:room.status,hostId:room.hostId,createdAt:room.createdAt,updatedAt:room.updatedAt,currentGameId:room.currentGameId,players:Object.fromEntries(Object.entries(room.players ?? {}).map(([id,p])=>[id,corePlayer(p)]))};
}
export function projectRoom(room: Room, actor: string): Room {
  const view=structuredClone(room);delete view.gameData;
  const gs=view.gameState; const me=room.players?.[actor];
  for(const [id,p] of Object.entries(view.players ?? {})) {
    if(room.currentGameId==='impostore' && id!==actor && gs?.phase!=='results') delete p.role;
    if(room.currentGameId==='indovina') {
      p.hasSubmittedWord=!!p.submittedWord;
      if(id!==actor) delete p.submittedWord;
      if(id===actor || me?.waiting) delete p.word;
    }
  }
  if(!gs) return view;
  delete gs.usedWords;
  if(room.currentGameId==='impostore') {
    if(gs.phase!=='results' && (!me?.role || me.waiting || me.role==='impostor')) delete gs.word;
    if(me?.waiting || (gs.hintOnlyFirst && !me?.isFirst)) delete gs.hint;
    if(gs.votes && gs.phase==='voting') for(const uid of Object.keys(gs.votes)) if(uid!==actor) gs.votes[uid]='submitted';
  }
  if(room.currentGameId==='taboo') {
    const canSee=gs.phase==='turn' && !me?.waiting && (gs.describerUid===actor || (gs.teams?.[actor] && gs.teams[actor]!==gs.currentTeam));
    if(canSee && gs.deck?.[gs.cursor ?? 0]) gs.currentCard=gs.deck[gs.cursor ?? 0];
    delete gs.deck;
  }
  return view;
}
