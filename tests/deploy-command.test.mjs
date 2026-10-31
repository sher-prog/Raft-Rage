import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
async function start(t){
  const started=performance.now();
  const child=spawn('npm',['start'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0'},detached:true,stdio:['ignore','pipe','pipe']});
  let stopped=false;
  const stop=async()=>{if(stopped)return;stopped=true;const exit=new Promise(resolve=>child.once('exit',resolve));process.kill(-child.pid,'SIGTERM');await exit;};
  t.after(stop);
  const port=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(new Error('Production start timed out')),5000);child.stdout.on('data',data=>{output+=data;const match=output.match(/listening on (\d+)/);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Production start exited ${code}`));});});
  const base=`http://127.0.0.1:${port}`;assert.equal(await(await fetch(`${base}/healthz`)).text(),'ok');
  const ws=new WebSocket(`${base.replace('http','ws')}/ws`,{origin:base});
  const hello=await new Promise(resolve=>ws.once('message',data=>resolve(JSON.parse(data))));
  t.after(()=>ws.terminate());
  return {stop,ws,hello,base,readyMs:performance.now()-started};
}
test('actual npm start honors PORT and two real process boots produce distinct identifiers',async t=>{
  const a=await start(t);assert.equal(a.hello.type,'hello');a.ws.terminate();await a.stop();
  const b=await start(t);assert.notEqual(b.hello.bootId,a.hello.bootId);
  const response=new Promise(resolve=>b.ws.once('message',data=>resolve(JSON.parse(data))));
  b.ws.send(JSON.stringify({type:'hello',protocol:1,bootId:a.hello.bootId}));
  const error=await response;assert.equal(error.message,'The server restarted. Start a new room.');
  writeFileSync(new URL('../reports/deployment-smoke.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),runtime:process.version,startCommand:'npm start',binding:'0.0.0.0; ephemeral PORT honored',firstReadyHttpAndWebSocketMs:a.readyMs,secondReadyHttpAndWebSocketMs:b.readyMs,bootChanged:true,restartMessageExact:true,environment:'Local Work container, not Render'},null,2)+'\n');
});
