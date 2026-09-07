import test from 'node:test';
import assert from 'node:assert/strict';
import {isRoomHost} from '../../src/core/utils/roomRole.ts';
test('host keeps host controls when returning via the guest link, in lobby or active game',()=>{
 for(const status of ['lobby','active']){const room={hostId:'host',status};assert.equal(isRoomHost(room,'host'),true);}
});
test('guest never gets host controls because of navigation state or a stale player flag',()=>{
 const room={hostId:'host',players:{guest:{isHost:true}}};
 assert.equal(isRoomHost(room,'guest'),false);
 assert.equal(isRoomHost(null,'host'),false);
 assert.equal(isRoomHost({hostId:'host'},null),false);
});
