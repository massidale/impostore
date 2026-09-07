import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isRoomHost} from '../../src/core/utils/roomRole.ts';
const ts=createRequire(import.meta.url)('typescript');
function screen(uid:string, status:string, enteredAsGuest:boolean) {
 const room={id:'ABC123',hostId:'host',status,currentGameId:'wavelength',players:{host:{isHost:true},guest:{}}};
 let index=0; const values=['ABC123',enteredAsGuest,false,false,null,null,'',null,null];
 const React={createElement:(type:any,props:any,...children:any[])=>({type,props,children}),useState:()=>[values[index++],()=>{}],useEffect:()=>{}};
 const ui={Screen:'Screen',AppHeader:'Header',Button:'Button',UserIcon:'Icon',colors:{},fonts:{},fontSize:{},radius:{}};
 const requireMock=(id:string):any=>{
  if(id==='react')return React;
  if(id==='react-native')return {StyleSheet:{create:(v:any)=>v},Platform:{OS:'web',select:(v:any)=>v.web},useWindowDimensions:()=>({width:390,height:800}),View:'View',ScrollView:'ScrollView',Text:'Text'};
  if(id.endsWith('/roomRole'))return {isRoomHost};
  if(id.endsWith('/useRoomData'))return {useRoomData:()=>({roomData:room,isFetched:true,error:null})};
  if(id.endsWith('/useAuthUser'))return {useAuthUser:()=>({uid,isRegistered:false})};
  if(id.endsWith('/gameRegistry'))return {getGame:()=>({PlayerGamepad:'Gamepad',HostDashboard:'Dashboard'})};
  if(id.endsWith('/ui'))return ui;
  if(id.includes('/components/'))return id.split('/').pop();
  return {};
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync('src/screens/MainScreen.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(requireMock,module,module.exports);
 return JSON.stringify(module.exports.default());
}
test('host who entered via room link retains dashboard and returns to host lobby after end',()=>{
 assert.match(screen('host','active',true),/Dashboard/);
 const lobby=screen('host','lobby',true);
 assert.match(lobby,/LobbyScreen/);assert.doesNotMatch(lobby,/WebPlayerScreen/);
});
test('guest does not get host controls even with stale host navigation state',()=>{
 assert.match(screen('guest','lobby',false),/WebPlayerScreen/);
 assert.doesNotMatch(screen('guest','active',false),/Dashboard/);
});
