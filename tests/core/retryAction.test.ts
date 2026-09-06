import test from 'node:test';
import assert from 'node:assert/strict';
import { retryAction } from '../../src/core/services/retryAction.ts';
test('a rejected timeout is retried until the server accepts it', async () => {
  let calls=0;
  await new Promise<void>(resolve=>{
    retryAction(async()=>{calls++;if(calls===1) throw new Error('too early');resolve();},1);
  });
  assert.equal(calls,2);
});
test('unmount cancellation stops subsequent timeout attempts', async () => {
  let calls=0;
  const cancel=retryAction(async()=>{calls++;throw new Error('too early');},5);
  cancel();await new Promise(resolve=>setTimeout(resolve,15));assert.equal(calls,1);
});
