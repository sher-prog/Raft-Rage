import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { WebSocket } from 'ws';
import { createGameServer } from '../dist/server/index.js';
const original=JSON.parse(readFileSync(new URL('../balance_constants.json',import.meta.url)));
const timings=[];
import { setup } from './support.mjs';
test('health route and bundled assets use production HTTP server',async t=>{
  const {base,game}=await setup(t);const before=game.metrics();
  const health=await fetch(`${base}/healthz`);assert.equal(health.status,200);assert.equal(await health.text(),'ok');assert.deepEqual(game.metrics(),before);
  const page=await fetch(base);assert.match(await page.text(),/Raft Rage/);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
  assert.equal((await fetch(`${base}/main.js`)).status,200);assert.equal((await fetch(`${base}/../package.json`)).status,404);
});
test('two independent clients create and join by lowercase spaced code; state and tokens stay separate',async t=>{
  const {client}=await setup(t);const a=await client(),b=await client();const start=performance.now();
  const first=await a.create('Lia');assert.match(first.code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  const second=await b.join(first.code.toLowerCase().split('').join(' '),'Ana');
  const state=await a.wait(m=>m.type==='room'&&m.room.players.length===2);
  assert.notEqual(first.token,second.token);assert.notEqual(first.playerId,second.playerId);
  assert.equal(state.room.hostId,first.playerId);assert.equal(state.room.players.length,2);
  assert.ok(!JSON.stringify(state).includes(first.token));
  timings.push({check:'create_and_second_client_join_and_host_broadcast',ms:performance.now()-start});
});
test('name validation gives plain reasons, collapses spaces, and refuses active-name/token takeover',async t=>{
  const {client}=await setup(t);const a=await client(),b=await client();const owner=await a.create('  Ana   Lee  ');
  for(const name of ['Benjamin Franklin','B@n','']){b.send({type:'join',code:owner.code,name});assert.equal((await b.wait(m=>m.type==='error')).message,'Max 12 letters or numbers');}
  b.send({type:'join',code:owner.code,name:'f u c k'});assert.equal((await b.wait(m=>m.type==='error')).message,'Pick another name');
  b.send({type:'join',code:owner.code,name:'ana lee'});assert.equal((await b.wait(m=>m.type==='error')).code,'NAME_TAKEN');
  b.send({type:'join',code:owner.code,name:'Other',token:owner.token});assert.equal((await b.wait(m=>m.type==='error')).code,'NAME_TAKEN');
});
test('solo uses 1v1 and auto-Ready; mode authority and >2-human refusal are server enforced',async t=>{
  const {client}=await setup(t);const a=await client(),b=await client(),c=await client();const owner=await a.create('Lia',true);
  const solo=(await a.wait(m=>m.type==='room')).room;assert.equal(solo.mode,'1v1');assert.equal(solo.players[0].ready,true);
  a.send({type:'mode',mode:'2v2'});await a.wait(m=>m.type==='room'&&m.room.mode==='2v2');
  await b.join(owner.code,'Ana');await c.join(owner.code,'Ben');
  b.send({type:'mode',mode:'1v1'});assert.equal((await b.wait(m=>m.type==='error')).code,'HOST_ONLY');
  a.send({type:'mode',mode:'1v1'});assert.match((await a.wait(m=>m.type==='error')).message,/at most 2/);
  b.send({type:'ready',ready:true});const state=(await a.wait(m=>m.type==='room'&&m.room.players.some(p=>p.name==='Ana'&&p.ready))).room;assert.equal(state.mode,'2v2');
});
test('explicit host Leave promotes earliest joined connected human and preserves room',async t=>{
  const {client,game}=await setup(t);const a=await client(),b=await client(),c=await client();const owner=await a.create('Lia');const next=await b.join(owner.code,'Ana');await c.join(owner.code,'Ben');
  a.send({type:'leave'});const state=(await b.wait(m=>m.type==='room'&&m.room.hostId===next.playerId)).room;
  assert.equal(state.banner,'Lia left. Ana is now host.');assert.equal(game.rooms.size,1);
  c.send({type:'mode',mode:'1v1'});assert.equal((await c.wait(m=>m.type==='error')).code,'HOST_ONLY');
  b.send({type:'mode',mode:'1v1'});await b.wait(m=>m.type==='room'&&m.room.mode==='1v1');
});
test('real 3s disconnect grace migrates host; old host reclaims seat as ordinary player',async t=>{
  const {client}=await setup(t);const a=await client(),b=await client();const owner=await a.create('Lia');const next=await b.join(owner.code,'Ana');
  const start=performance.now();a.ws.terminate();
  const state=(await b.wait(m=>m.type==='room'&&m.room.hostId===next.playerId,4500)).room;
  const ms=performance.now()-start;assert.ok(ms>=2900&&ms<3500);assert.equal(state.banner,'Lia left. Ana is now host.');
  const back=await client();back.send({type:'resume',code:owner.code,name:'Lia',token:owner.token});const joined=await back.wait(m=>m.type==='joined');assert.equal(joined.playerId,owner.playerId);
  const restored=(await back.wait(m=>m.type==='room')).room;assert.equal(restored.hostId,next.playerId);assert.equal(restored.players.find(p=>p.id===owner.playerId).seat,0);
  timings.push({check:'disconnect_to_bot_and_host_migration_real_grace',ms});
});
test('reconnect before grace retains seat and host with matching per-tab token',async t=>{
  const {client}=await setup(t);const a=await client(),b=await client();const owner=await a.create('Lia');await b.join(owner.code,'Ana');a.ws.terminate();
  await b.wait(m=>m.type==='room'&&m.room.players.some(p=>!p.connected));const back=await client();
  back.send({type:'resume',code:owner.code,name:'Lia',token:owner.token});await back.wait(m=>m.type==='joined');
  assert.equal((await back.wait(m=>m.type==='room')).room.hostId,owner.playerId);
});
test('unclean heartbeat loss becomes bot and migrates host about 3s after last traffic',async t=>{
  const {client}=await setup(t);const a=await client(undefined,{autoPong:false}),b=await client();const owner=await a.create('Lia');const next=await b.join(owner.code,'Ana');
  const start=performance.now();
  const state=(await b.wait(m=>m.type==='room'&&m.room.hostId===next.playerId,4500)).room;
  const ms=performance.now()-start;assert.ok(ms>=2800&&ms<3500);assert.ok(state.players.find(p=>p.id===owner.playerId).botDriving);
  timings.push({check:'unclean_heartbeat_loss_to_bot_and_migration',ms});
});
test('same-name reclaim works only after grace, rotates token and keeps player identity',async t=>{
  const {client}=await setup(t,c=>{c.network.disconnect_to_bot_s=.05;c.rooms.maintenance_interval_ms=10;});
  const a=await client();const owner=await a.create('Lia');a.ws.terminate();await new Promise(r=>setTimeout(r,100));const b=await client();const joined=await b.join(owner.code,'Lia');
  assert.equal(joined.playerId,owner.playerId);assert.notEqual(joined.token,owner.token);
});
test('restart boot mismatch has exact message; ordinary missing room has a different error',async t=>{
  const {client}=await setup(t);const stale=await client('a-previous-server-boot');const restarted=await stale.wait(m=>m.type==='error');assert.equal(restarted.code,'SERVER_RESTART');assert.equal(restarted.message,'The server restarted. Start a new room.');
  const fresh=await client();fresh.send({type:'join',code:'ABCD',name:'Ana'});const missing=await fresh.wait(m=>m.type==='error');assert.equal(missing.code,'ROOM_MISSING');assert.equal(missing.message,'No room ABCD. Check the code with your host.');
});
test('room survives zero connected humans until configured idle expiry',async t=>{
  const {client,game}=await setup(t,c=>{c.rooms.idle_close_min=.005;c.rooms.maintenance_interval_ms=10;});const a=await client();const owner=await a.create('Lia');a.ws.terminate();
  await new Promise(r=>setTimeout(r,100));assert.equal(game.rooms.size,1);const b=await client();b.send({type:'resume',code:owner.code,name:'Lia',token:owner.token});await b.wait(m=>m.type==='joined');
  await new Promise(r=>setTimeout(r,320));assert.equal(game.rooms.size,1);b.ws.terminate();await new Promise(r=>setTimeout(r,350));assert.equal(game.rooms.size,0);
});
test('capacity is 4 seated humans plus 8 spectators; seats reject occupied and invalid indices',async t=>{
  const {client}=await setup(t);const a=await client();const owner=await a.create('Player0');const all=[a];
  for(let i=1;i<12;i++){const c=await client();await c.join(owner.code,`Player${i}`);all.push(c);}
  const state=(await all.at(-1).wait(m=>m.type==='room')).room;assert.equal(state.players.filter(p=>p.seat===null).length,8);
  const extra=await client();extra.send({type:'join',code:owner.code,name:'Extra'});assert.equal((await extra.wait(m=>m.type==='error')).code,'FULL');
  all[1].send({type:'seat',seat:0});assert.equal((await all[1].wait(m=>m.type==='error')).code,'SEAT');
  all[1].send({type:'seat',seat:-1});assert.equal((await all[1].wait(m=>m.type==='error')).code,'SEAT');
});
test('WebSocket refuses foreign origins; malformed messages are contained',async t=>{
  const {client,base}=await setup(t);const rejected=new WebSocket(base.replace('http','ws')+'/ws',{origin:'https://elsewhere.example'});
  const status=await new Promise(resolve=>{rejected.on('unexpected-response',(_,res)=>{resolve(res.statusCode);res.resume();rejected.terminate();});rejected.on('error',()=>{});});assert.equal(status,403);
  const c=await client();c.ws.send('invalid json');assert.equal((await c.wait(m=>m.type==='error')).code,'BAD_MESSAGE');c.send({type:'ping',clientTime:10});assert.equal((await c.wait(m=>m.type==='pong')).clientTime,10);
});
test('all config additions are declared assumed and no existing gameplay values changed',()=>{
  const base=JSON.parse(readFileSync(new URL('../docs/source/balance_constants.json',import.meta.url)));
  const walk=(a,b,path='')=>{for(const [key,value]of Object.entries(a)){if(key==='_version'||key==='_assumed')continue;const p=path?`${path}.${key}`:key;if(value&&typeof value==='object'&&!Array.isArray(value))walk(value,b[key],p);else assert.deepEqual(b[key],value,p);}for(const key of Object.keys(b)){if(!(key in a)&&!key.startsWith('_'))assert.ok(b._assumed.includes(key),`${path}.${key} must be assumed`);}};
  walk(base,original);assert.equal(original.network.sim_hz,60);assert.equal(original.network.snapshot_hz,20);assert.equal(original.network.input_resend_hz,10);
});
test.after(()=>{writeFileSync(new URL('../reports/skeleton-test-timings.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),runtime:process.version,timings},null,2)+'\n');});
