import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer} from '../helpers/serverLoader.ts';
const load=()=>loadServer('src/core/services/sparkRoom.ts');
test('Spark storage uses only legacy allowed fields and preserves empty collections',()=>{
 const {encodeSparkRoom,decodeSparkRoom}=load();
 const room={id:'ABC123',hostId:'h',status:'active',currentGameId:'just-one',createdAt:1,updatedAt:2,matchId:3,settings:{rounds:5},players:{h:{name:'Host',joinedAt:1,isHost:true,secret:'x'}},gameState:{phase:'clues',answers:{},order:[],private:{deck:[{word:'A',aliases:[]}]}}};
 const stored=encodeSparkRoom(room);assert.deepEqual(Object.keys(stored).sort(),['id','hostId','status','currentGameId','createdAt','updatedAt','players','gameState','gameData'].sort());
 assert.deepEqual(Object.keys(stored.players.h).sort(),['joinedAt','name','isHost'].sort());
 assert.deepEqual(decodeSparkRoom(JSON.parse(JSON.stringify(stored))),room);
});
test('Spark refuses to overwrite rooms made by another app version',()=>{
 const {decodeSparkRoom}=load();assert.throws(()=>decodeSparkRoom({id:'ABC123',gameState:{}}),/versione/);
});
