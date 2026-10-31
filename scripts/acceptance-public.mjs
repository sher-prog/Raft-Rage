import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {NetClient,readPublicConfig,delay} from './net-client.mjs';
const base=process.argv[2]??'http://localhost:4173',config=await readPublicConfig(base),clients=[],checks=[];
const check=(name,numbers={})=>checks.push({name,status:'PASS',...numbers});
try{
 const [a,b,c]=await Promise.all(['Lia','Ana','Ben'].map(async()=>{const n=new NetClient(base,config,{debug:true});clients.push(n);await n.connected();return n;}));
 const owner=await a.create('Lia');await b.join(owner.code.toLowerCase(),'Ana');await c.join(owner.code,'Ben');
 b.send({type:'seat',seat:3});await a.wait(m=>m.type==='room'&&m.room.players.some(p=>p.id===b.session.playerId&&p.seat===3));
 a.send({type:'seat',seat:1});await a.wait(m=>m.type==='room'&&m.room.players.find(p=>p.id===owner.playerId)?.seat===1);
 b.send({type:'seat',seat:0});c.send({type:'seat',seat:2});
 await a.wait(m=>m.type==='room'&&m.room.players.some(p=>p.name==='Ana'&&p.seat===0)&&m.room.players.some(p=>p.name==='Ben'&&p.seat===2));
 a.send({type:'mode',mode:'1v1'});assert.equal((await a.wait(m=>m.type==='error')).code,'MODE');check('P1-2/3: lowercase join, corrected 2v2 seats, >2 human mode refusal');
 for(const n of [a,b,c])n.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.room.players.every(p=>p.ready));
 const start=performance.now();a.send({type:'start'});await Promise.all([a,b,c].map(n=>n.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race')));check('P1-4: authoritative countdown',{countdownMs:performance.now()-start});
 for(const n of [a,b,c])n.startInputs();
 const d=new NetClient(base,config);clients.push(d);await d.connected();await d.join(owner.code,'Dee');await d.wait(m=>m.type==='room'&&m.room.players.some(p=>p.name==='Dee'&&p.seat===null));check('P1-7: late spectator');
 a.send({type:'debug_jump',raft:'both',percent:95});await a.wait(m=>m.type==='room'&&m.room.banner==='Jumped both to 95%');
 for(const n of [a,b,c])n.setInput({fire:true});
 const finish=await a.wait(m=>m.type==='snapshot'&&m.snapshot.firstFinishTime!==null,30000);
 const result=await a.wait(m=>m.type==='room'&&m.room.phase==='results',17000);const other=await b.wait(m=>m.type==='room'&&m.room.phase==='results',2000);
 assert.deepEqual(result.room.simulation,other.room.simulation);const elapsed=result.receivedMono-finish.receivedMono;assert.ok(elapsed<=config.race.finish_grace_s*1000+200);check('P1-8: real debug jump, finish, identical results',{resultsAfterFirstFinishReceivedMs:elapsed,authoritativeGraceS:config.race.finish_grace_s});
 a.messages=a.messages.filter(m=>!(m.type==='room'&&m.room.phase==='lobby'));a.send({type:'rematch'});const lobby=(await a.wait(m=>m.type==='room'&&m.room.phase==='lobby')).room;assert.ok(lobby.players.every(p=>!p.ready));assert.equal(lobby.players.find(p=>p.name==='Ana').seat,0);d.send({type:'seat',seat:3});await a.wait(m=>m.type==='room'&&m.room.players.some(p=>p.name==='Dee'&&p.seat===3));check('P1-8: rematch retains seats, clears Ready, Dee sits');
}catch(e){checks.push({status:'FAIL',error:e.message});process.exitCode=1;}finally{await Promise.all(clients.map(n=>n.close()));writeFileSync('reports/public-acceptance.json',JSON.stringify({timestamp:new Date().toISOString(),base,environment:'Real WebSocket clients from developer machine; no physical Safari/cellular claim',checks},null,2)+'\n');console.log(JSON.stringify(checks));}
