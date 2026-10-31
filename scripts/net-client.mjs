import{WebSocket}from'ws';import{Agent}from'node:https';import{performance}from'node:perf_hooks';
export class NetClient{
  constructor(base,config,{debug=false}={}){
    this.base=base;this.config=config;this.debug=debug;this.messages=[];this.snapshots=[];this.phaseTimes={};this.receivedBytes=0;this.seq=0;this.whackCount=0;this.input={walk:0,fire:false};
    this.agent=base.startsWith('https:')?new Agent({proxyEnv:process.env}):undefined;
    this.ws=new WebSocket(base.replace(/^http/,'ws')+'/ws',{origin:base,agent:this.agent});
    this.ws.on('error',e=>{this.errorCode=e.code??'SOCKET_ERROR';});
    this.ws.on('message',data=>{
      this.receivedBytes+=data.byteLength;const m=JSON.parse(data);m.receivedAt=Date.now();m.receivedMono=performance.now();
      if(m.type==='hello'){this.bootId=m.bootId;this.send({type:'hello',protocol:config.network.protocol_version,bootId:m.bootId,debug});}
      if(m.type==='joined')this.session=m;
      if(m.type==='room'){this.room=m.room;this.phaseTimes[m.room.phase]??=m.receivedAt;if(m.room.simulation)this.state=m.room.simulation;}
      if(m.type==='snapshot'){this.state=m.snapshot;this.snapshots.push({tick:m.snapshot.tick,time:m.receivedMono});if(this.snapshots.length>config.network.snapshot_buffer_max)this.snapshots.shift();}
      this.messages.push(m);if(this.messages.length>config.network.snapshot_buffer_max*2){const index=this.messages.findIndex(m=>m.type==='snapshot');if(index>=0)this.messages.splice(index,1);else this.messages.shift();}
    });
  }
  async wait(predicate,timeout=15000){const began=performance.now();while(performance.now()-began<timeout){if(this.errorCode)throw Error('WebSocket '+this.errorCode);const i=this.messages.findIndex(predicate);if(i>=0)return this.messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('Protocol response timed out');}
  async connected(){await this.wait(m=>m.type==='connected');return this;}
  send(m){if(this.ws.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(m));}
  async create(name,solo=false){this.send({type:'create',name,solo});return this.wait(m=>m.type==='joined');}
  async join(code,name,extra={}){this.send({type:'join',code,name,...extra});return this.wait(m=>m.type==='joined');}
  async metrics(){this.messages=this.messages.filter(m=>m.type!=='metrics');this.send({type:'debug_metrics'});return(await this.wait(m=>m.type==='metrics')).metrics;}
  setInput(input){this.input={...this.input,...input};this.sendInput();}
  sendInput(){const seat=this.room?.players.find(p=>p.id===this.session?.playerId)?.seat;if(!this.session||!this.state||seat===null||seat===undefined||!['race','countdown'].includes(this.state.phase))return;this.send({type:'input',raceId:this.state.raceId,inputEpoch:this.session.inputEpoch,seat,seq:++this.seq,whackCount:this.whackCount,...this.input});}
  startInputs(){this.inputTimer=setInterval(()=>this.sendInput(),1000/this.config.network.input_resend_hz);this.clockTimer=setInterval(()=>this.send({type:'ping',clientTime:Date.now()}),this.config.network.clock_sync_interval_s*1000);}
  async close(){clearInterval(this.inputTimer);clearInterval(this.clockTimer);if(this.ws.readyState===WebSocket.OPEN){this.send({type:'leave'});this.ws.close();}else this.ws.terminate();await new Promise(r=>{if(this.ws.readyState===WebSocket.CLOSED)return r();const t=setTimeout(()=>{this.ws.terminate();r();},1000);this.ws.once('close',()=>{clearTimeout(t);r();});});this.agent?.destroy();}
}
export async function readPublicConfig(base){const response=await fetch(base+'/balance_constants.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Config HTTP '+response.status);return response.json();}
export const delay=ms=>new Promise(r=>setTimeout(r,ms));
