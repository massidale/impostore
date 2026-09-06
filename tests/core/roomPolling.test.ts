import test from 'node:test';
import assert from 'node:assert/strict';
import {startRoomPolling} from '../../src/core/services/roomPolling.ts';
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
test('room polling serializes refreshes and ignores late results after stop', async () => {
  let resolveRead!: (value:number)=>void;
  let reads=0;const seen:number[]=[];
  const poll=startRoomPolling(()=>{reads++;return new Promise<number>(r=>{resolveRead=r});},v=>seen.push(v),()=>{},1500);
  poll.refresh();poll.refresh();assert.equal(reads,1);
  resolveRead(1);await settle();assert.equal(reads,2);assert.deepEqual(seen,[1]);
  poll.stop();resolveRead(2);await settle();assert.deepEqual(seen,[1]);assert.equal(reads,2);
});
test('polling retries errors without reporting a deleted room, and stops its timer',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let reads=0;const seen:(number|null)[]=[];const errors:unknown[]=[];
  const poll=startRoomPolling(async()=>{if(++reads===1)throw Error('offline');return null;},v=>seen.push(v),e=>errors.push(e),100);
  await settle();assert.equal(errors.length,1);assert.deepEqual(seen,[]);
  t.mock.timers.tick(200);await settle();assert.deepEqual(seen,[null]);assert.equal(reads,2);
  poll.stop();t.mock.timers.tick(1000);await settle();assert.equal(reads,2);
});
