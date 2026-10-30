const {test} = require('node:test');
const assert = require('node:assert/strict');
const Outbox = require('../outbox');
const storage = () => ({map:new Map(),getItem(k){return this.map.get(k) || null;},setItem(k,v){this.map.set(k,v);}});
const ack = e => ({ok:true, async json(){return {success:true,operation_id:e.operation_id,route_id:e.route_id,stop_id:e.stop_id,status:e.status,version:e.expected_version+1};}});
test('three offline stops survive reopening and each needs a matching acknowledgement',async()=>{
 const s=storage();let q=new Outbox(s,'ROT-2222',async()=>{throw Error('offline');});
 for(const id of ['a','b','c'])q.enqueue({id,status:'pending',version:0},'delivered');
 await q.flush();assert.equal(q.items.length,3);assert.ok(q.retryAt>Date.now());
 const received=[];q=new Outbox(s,'ROT-2222',async e=>{received.push(e);return ack(e);});
 await q.flush();assert.equal(received.length,3);assert.equal(q.items.length,0);
 assert.equal(new Outbox(s,'ROT-2222',null).items.length,0);
});
test('offline undo remains pending and preserves ordered stop versions',async()=>{
 const q=new Outbox(storage(),'ROT-2222',async e=>ack(e));const stop={id:'a',status:'pending',version:2};
 q.enqueue(stop,'delivered');stop.status='delivered';q.enqueue(stop,'pending');
 assert.deepEqual(q.items.map(e=>e.expected_version),[2,3]);
 const route={stops:[{id:'a',status:'delivered'}]};q.overlay(route);assert.equal(route.stops[0].status,'pending');
 await q.flush();assert.equal(q.items.length,0);
});
for(const status of [500,401,403,409])test(`HTTP ${status} retains events`,async()=>{
 const q=new Outbox(storage(),'ROT-2222',async()=>({ok:false,status,async json(){return {error:'test'};}}));
 q.enqueue({id:'a',status:'pending'},'delivered');await q.flush();assert.equal(q.items.length,1);
 assert.equal(q.items[0].state,status===409?'conflict':[401,403].includes(status)?'unauthorized':'pending');
});
test('wrong ack, invalid JSON and timeout never remove events',async()=>{
 for(const send of [async()=>({ok:true,json:async()=>({success:true})}),async()=>({ok:true,json:async()=>{throw Error('json');}}),async()=>{throw Error('timeout');}]){
  const q=new Outbox(storage(),'ROT-2222',send);q.enqueue({id:'a',status:'pending'},'delivered');await q.flush();assert.equal(q.items.length,1);
 }
});
test('same operation retries after lost response',async()=>{
 let calls=0;const ids=[];const q=new Outbox(storage(),'ROT-2222',async e=>{ids.push(e.operation_id);if(!calls++)throw Error('lost');return ack(e);});
 q.enqueue({id:'a',status:'pending'},'delivered');await q.flush();await q.flush(true);
 assert.equal(ids[0],ids[1]);assert.equal(q.items.length,0);
});
test('storage quota prevents enqueue and optimistic success',()=>{
 const s=storage();const q=new Outbox(s,'ROT-2222',null);s.setItem=()=>{throw Error('quota');};
 assert.throws(()=>q.enqueue({id:'a',status:'pending'},'delivered'));assert.equal(q.items.length,0);
});
test('concurrent flushes are serialized',async()=>{
 let calls=0;const q=new Outbox(storage(),'ROT-2222',async e=>{calls++;await new Promise(r=>setTimeout(r,5));return ack(e);});
 q.enqueue({id:'a',status:'pending'},'delivered');await Promise.all([q.flush(),q.flush()]);assert.equal(calls,1);
});
test('cache delivered does not override confirmed pending without an event',()=>{
 const q=new Outbox(storage(),'ROT-2222',null);const route={stops:[{id:'a',status:'pending'}]};q.overlay(route);assert.equal(route.stops[0].status,'pending');
});
test('acknowledgement with impossible version preserves the pending operation',async()=>{
 for (const version of [-1,0,50]) {
  const q=new Outbox(storage(),'ROT-2222',async e=>({ok:true,json:async()=>({...await ack(e).json(),version})}));
  q.enqueue({id:'a',status:'pending',version:0},'delivered');await q.flush();
  assert.equal(q.items.length,1);
 }
});
test('malformed durable queue fails closed without overwriting the original',()=>{
 for (const original of ['{}','[null]','[{"route_id":"ROT-OTHER"}]']) {
  const s=storage();s.setItem('plaswill_outbox_v1_ROT-2222',original);
  assert.throws(()=>new Outbox(s,'ROT-2222',null));
  assert.equal(s.getItem('plaswill_outbox_v1_ROT-2222'),original);
 }
});
