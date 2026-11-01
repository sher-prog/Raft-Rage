import {readCpuCgroup} from './cpu-metrics.ts';
import { Simulation } from '../game/simulation.ts';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { RawData } from 'ws';
import type { Config, PlayerView, RoomView, ServerMessage, Character, Difficulty } from '../shared.ts';

type Player = PlayerView & { token: string; socket?: WebSocket; disconnectedAt?: number; order: number; inputEpoch?:string };
type Room = { difficulty?:Difficulty; code: string; hostId: string; mode: '1v1'|'2v2'; players: Player[]; revision: number; emptySince?: number; banner: string; sim?:Simulation; accumulator:number; lastPump:number; snapshotPhase:number;snapshotCount:number;snapshotTotalMs:number;snapshotWorstMs:number;snapshotBytes:number;schedulerLateMaxMs:number;overruns:number;lastOverrunWallMs?:number;lastOverrunCpuMs?:number;pausedSince?:number };
type Connection = { room?: Room; player?: Player; hello: boolean; lastSeen: number; lostAt?:number; budget: number; refillAt: number; debug:boolean; socket:IncomingMessage['socket'] };
export function loadConfig(): Config { return JSON.parse(readFileSync(new URL('../../balance_constants.json', import.meta.url), 'utf8')); }

export function createGameServer(config: Config, options: { bootId?: string; staticDir?: URL; measure?: boolean } = {}) {
  const buildVersion=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).version as string;
  const bootId = options.bootId ?? randomUUID();
  const rooms = new Map<string, Room>();
  const clients = new Map<WebSocket, Connection>();
  const assets = new Map<string,{data: Buffer;br:Buffer;gzip:Buffer; type: string}>();
  const staticDir = options.staticDir ?? new URL('../client/', import.meta.url);
  for (const [path, file, type] of [
    ['/', 'index.html','text/html; charset=utf-8'], ['/main.js','main.js','text/javascript; charset=utf-8'],
    ['/style.css','style.css','text/css; charset=utf-8'], ['/balance_constants.json','balance_constants.json','application/json']
  ]) assets.set(path, {data:readFileSync(new URL(file,staticDir)),br:readFileSync(new URL(file+'.br',staticDir)),gzip:readFileSync(new URL(file+'.gz',staticDir)),type});
  const server = createServer((req,res) => {
    const path = req.url?.split('?')[0];
    // Deliberately constant: no room, simulation, filesystem or telemetry work.
    if (path === '/healthz' && req.method === 'GET') {res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'}); res.end('ok'); return;}
    if(path==='/version'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({version:buildVersion,configVersion:config._version,bootId}));return;}
    const asset = assets.get(path ?? '');
    if (!asset || !['GET','HEAD'].includes(req.method ?? '')) {res.writeHead(404);res.end('Not found');return;}
    const host=/^[a-zA-Z0-9.:[\]-]+$/.test(req.headers.host??'')?req.headers.host:'';
    const accepted=req.headers['accept-encoding']??'',encoding=accepted.includes('br')?'br':accepted.includes('gzip')?'gzip':undefined;const data=encoding?asset[encoding]:asset.data;
    res.writeHead(200, {
      'Content-Type':asset.type, 'Content-Length':data.length, 'Cache-Control':'no-cache','Vary':'Accept-Encoding',...(encoding?{'Content-Encoding':encoding}:{}),
      'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ${host?`ws://${host} wss://${host}`:''}; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
      'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'
    });
    res.end(req.method==='HEAD' ? undefined : data);
  });
  const wss = new WebSocketServer({noServer:true, maxPayload:config.network.max_message_bytes, perMessageDeflate:false});
  let bytesOut=0, messagesOut=0, bytesIn=0, messagesIn=0, order=0;
  let loop = options.measure ? monitorEventLoopDelay({resolution:config.debug.event_loop_resolution_ms}) : undefined;
  loop?.enable();
  const sendRaw=(ws:WebSocket,encoded:string|Buffer)=>{
    if(ws.readyState!==WebSocket.OPEN)return;
    if(ws.bufferedAmount>config.network.max_buffered_bytes){ws.terminate();return;}
    bytesOut+=typeof encoded==='string'?Buffer.byteLength(encoded):encoded.length;messagesOut++;ws.send(encoded,{binary:false});
  };
  const send=(ws:WebSocket,message:ServerMessage)=>sendRaw(ws,JSON.stringify(message));
  const view = (room:Room):RoomView => ({
    difficulty:room.difficulty??'chill',code:room.code, hostId:room.hostId, mode:room.mode, phase:room.sim?.phase??'lobby', simulation:room.sim?.snapshot(), revision:room.revision, banner:room.banner,
    players:room.players.map(p=>({character:p.character??'hippo',bigScreen:p.bigScreen??false,id:p.id,name:p.name,seat:p.seat,connected:!!p.socket,ready:p.ready,botDriving:!p.socket && p.disconnectedAt!==undefined && performance.now()-p.disconnectedAt>=config.network.disconnect_to_bot_s*1000}))
  });
  const broadcast = (room:Room) => {room.revision++; const state=view(room),encoded=Buffer.from(JSON.stringify({type:'room',room:state})); for(const p of room.players) if(p.socket) sendRaw(p.socket,encoded);};
  const promote = (room:Room, departing:Player) => {
    if(room.hostId!==departing.id) return;
    const next=room.players.filter(p=>p.socket && p.id!==departing.id).sort((a,b)=>a.order-b.order)[0];
    room.hostId=next?.id ?? '';
    if(next) room.banner=`${departing.name} left. ${next.name} is now host.`;
  };
  const detach = (ws:WebSocket, explicit=false) => {
    const c=clients.get(ws);if(!c?.room || !c.player || c.player.socket!==ws) return;
    const {room,player}=c;player.socket=undefined;player.ready=false;if(player.seat!==null)room.sim?.release(player.seat);player.disconnectedAt=c.lostAt??performance.now();
    if(explicit){promote(room,player);room.players=room.players.filter(p=>p!==player);}
    if(!room.players.some(p=>p.socket))room.emptySince=performance.now();
    c.room=undefined;c.player=undefined;broadcast(room);
  };
  const error=(ws:WebSocket,code:string,message:string)=>send(ws,{type:'error',code,message});
  const cleanName=(value:unknown):string => {
    if(typeof value!=='string')throw new Error(`Max ${config.names.max_chars} letters or numbers`);
    const name=value.trim().replace(/\s+/g,' ');
    if(name.length>config.names.max_chars || !new RegExp(config.names.allowed_pattern).test(name))throw new Error(`Max ${config.names.max_chars} letters or numbers`);
    const normalized=name.toLowerCase().replaceAll(' ','');
    if(config.names.blocklist.some(word=>normalized.includes(word)))throw new Error('Pick another name');
    return name;
  };
  const codeOf=(value:unknown)=>typeof value==='string'?value.replace(/\s/g,'').toUpperCase():'';
  const seatCount=(r:Room)=>r.mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2;
  const freeSeat=(r:Room)=>Array.from({length:seatCount(r)},(_,i)=>i).find(i=>!r.players.some(p=>p.seat===i)) ?? null;
  const attach=(ws:WebSocket,c:Connection,room:Room,p:Player)=>{
    if(room.sim&&room.pausedSince!==undefined){room.sim.startServerTime+=performance.now()-room.pausedSince;room.pausedSince=undefined;room.lastPump=performance.now();}
    p.socket=ws;p.disconnectedAt=undefined;p.botDriving=false;room.emptySince=undefined;c.room=room;c.player=p;
    if(!room.hostId)room.hostId=p.id;
    p.inputEpoch=randomUUID();if(p.seat!==null)room.sim?.resetInput(p.seat);
    send(ws,{type:'joined',code:room.code,playerId:p.id,token:p.token,bootId,inputEpoch:p.inputEpoch});broadcast(room);
  };
  server.on('upgrade',(req:IncomingMessage,socket,head)=>{
    let valid=false;
    try{valid=new URL(req.headers.origin??'').host===req.headers.host && req.url==='/ws';}catch{}
    if(!valid || clients.size>=config.rooms.max_connections){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  wss.on('connection',(ws:WebSocket,request:IncomingMessage)=>{
    const now=performance.now();const c:Connection={hello:false,lastSeen:now,budget:config.network.message_burst,refillAt:now,debug:false,socket:request.socket};clients.set(ws,c);
    send(ws,{type:'hello',bootId,protocol:config.network.protocol_version,serverTime:Date.now(),buildVersion});
    ws.on('pong',()=>{c.lastSeen=performance.now();});
    ws.on('error',()=>{}); // Never log names, payloads, tokens or network metadata.
    ws.on('message',(data:RawData)=>{
      const now=performance.now();c.lastSeen=now;messagesIn++;bytesIn+=Array.isArray(data)?data.reduce((sum,chunk)=>sum+chunk.byteLength,0):data.byteLength;
      c.budget=Math.min(config.network.message_burst,c.budget+(now-c.refillAt)/1000*config.network.message_rate_per_s);c.refillAt=now;
      if(c.budget<1){error(ws,'RATE_LIMIT','Too many requests. Try again in a moment.');return;}c.budget--;
      let m:Record<string,unknown>;try{m=JSON.parse(data.toString());if(!m || typeof m!=='object'||Array.isArray(m))throw 0;}catch{error(ws,'BAD_MESSAGE','Request not understood.');return;}
      if(m.type==='hello'){
        if(m.bootId && m.bootId!==bootId){error(ws,'SERVER_RESTART','The server restarted. Start a new room.');return;}
        if(m.protocol!==config.network.protocol_version){error(ws,'VERSION','Please reload to update the game.');return;}
        c.hello=true;c.debug=m.debug===true;if(c.debug&&!loop){loop=monitorEventLoopDelay({resolution:config.debug.event_loop_resolution_ms});loop.enable();}send(ws,{type:'connected',bootId});return;
      }
      if(!c.hello){error(ws,'HELLO_REQUIRED','Connect before joining a room.');return;}
      if(m.type==='ping'){send(ws,{type:'pong',clientTime:typeof m.clientTime==='number'?m.clientTime:0,serverTime:Date.now()});return;}
      if(m.type==='leave'){detach(ws,true);send(ws,{type:'left'});return;}
      if(m.type==='create'||m.type==='join'||m.type==='resume'){
        if(c.room){error(ws,'IN_ROOM','Leave your current room first.');return;}
        let name:string;try{name=cleanName(m.name);}catch(e){error(ws,'NAME',String((e as Error).message));return;}
        let room:Room|undefined;
        if(m.type==='create'){
          if(rooms.size>=config.rooms.max_rooms){error(ws,'CAPACITY','The river is busy. Try again shortly.');return;}
          let code='';for(let i=0;i<config.rooms.code_attempts_max;i++){
            code=Array.from({length:config.rooms.code_length},()=>config.rooms.code_alphabet[randomInt(config.rooms.code_alphabet.length)]).join('');
            if(!rooms.has(code)&&!config.rooms.code_blocklist.includes(code)&&!config.names.blocklist.some(word=>code.toLowerCase().includes(word)))break;code='';
          }
          if(!code){error(ws,'CAPACITY','The river is busy. Try again shortly.');return;}
          room={code,hostId:'',mode:(m.solo?config.rooms.default_mode_solo:config.rooms.default_mode_multiplayer) as Room['mode'],players:[],revision:0,banner:'',accumulator:0,lastPump:now,snapshotPhase:rooms.size%Math.round(config.network.sim_hz/config.network.snapshot_hz),snapshotCount:0,snapshotTotalMs:0,snapshotWorstMs:0,snapshotBytes:0,schedulerLateMaxMs:0,overruns:0};rooms.set(code,room);
        }else{room=rooms.get(codeOf(m.code));}
        if(!room){error(ws,'ROOM_MISSING',`No room ${codeOf(m.code)}. Check the code with your host.`);return;}
        const tokenPlayer=typeof m.token==='string'?room.players.find(p=>p.token===m.token):undefined;
        const named=room.players.find(p=>p.name.toLowerCase()===name.toLowerCase());
        const candidate=tokenPlayer??named;
        if(candidate){
          if(candidate.socket){error(ws,'NAME_TAKEN','Name taken in this room');return;}
          const gracePassed=candidate.disconnectedAt!==undefined && now-candidate.disconnectedAt>=config.network.disconnect_to_bot_s*1000;
          if(!tokenPlayer && !(gracePassed&&config.rooms.reclaim_by_name_after_grace)){error(ws,'NAME_TAKEN','Name taken in this room');return;}
          if(gracePassed)promote(room,candidate);
          if(!tokenPlayer)candidate.token=randomBytes(config.rooms.token_bytes).toString('hex');
          attach(ws,c,room,candidate);return;
        }
        if(m.type==='resume'){error(ws,'SESSION_MISSING','Your seat is no longer reserved. Join the room again.');return;}
        const seat=room.sim||m.bigScreen===true&&config.release.big_screen?null:freeSeat(room);
        if(seat===null && room.players.filter(p=>p.seat===null).length>=config.rooms.max_spectators){error(ws,'FULL','Room is full. Try another room.');return;}
        const p:Player={character:'hippo',bigScreen:m.bigScreen===true&&config.release.big_screen,id:randomUUID(),token:randomBytes(config.rooms.token_bytes).toString('hex'),name,seat,ready:!!m.solo,connected:true,botDriving:false,order:order++};room.players.push(p);attach(ws,c,room,p);return;
      }
      const {room,player}=c;if(!room||!player){error(ws,'NO_ROOM','Join a room first.');return;}
      if(m.type==='debug_metrics'){
        if(!c.debug||room.hostId!==player.id){error(ws,'HOST_ONLY','Debug metrics are for the host in debug mode.');return;}
        const cpu=process.cpuUsage();send(ws,{type:'metrics',metrics:{...readCpuCgroup(config.debug),lastOverrunWallMs:room.lastOverrunWallMs??0,lastOverrunCpuMs:room.lastOverrunCpuMs??0,cpuUserUs:cpu.user,cpuSystemUs:cpu.system,wallMs:performance.now(),rssBytes:process.memoryUsage().rss,activeRaceRooms:[...rooms.values()].filter(r=>r.sim&&r.sim.phase!=='results'&&r.players.some(p=>p.socket)).length,roomCount:rooms.size,connections:clients.size,bytesIn,bytesOut,messagesIn,messagesOut,socketBytesRead:[...clients.values()].reduce((n,c)=>n+c.socket.bytesRead,0),socketBytesWritten:[...clients.values()].reduce((n,c)=>n+c.socket.bytesWritten,0),eventLoopMeanMs:loop?loop.mean/1e6:null,eventLoopMaxMs:loop?loop.max/1e6:null,tick:room.sim?.tick??0,tickAverageMs:room.sim?.tickAverageMs??0,tickWorstMs:room.sim?.tickWorstMs??0,snapshotPhase:room.snapshotPhase,snapshotCount:room.snapshotCount,snapshotAverageMs:room.snapshotCount?room.snapshotTotalMs/room.snapshotCount:0,snapshotWorstMs:room.snapshotWorstMs,snapshotBytes:room.snapshotBytes,schedulerLateMaxMs:room.schedulerLateMaxMs,overruns:room.overruns}});return;
      }
      if(m.type==='debug_jump'){
        if(!c.debug||room.hostId!==player.id){error(ws,'HOST_ONLY','Jump is for the host in debug mode.');return;}
        if(!['red','blue','both'].includes(String(m.raft))||!config.debug.jump_percents.includes(Number(m.percent))){error(ws,'DEBUG','Choose a listed jump.');return;}
        if(!room.sim?.jump(m.raft as 'red'|'blue'|'both',Number(m.percent))){error(ws,'PHASE','Jump during a race before anyone finishes.');return;}
        room.banner=`Jumped ${m.raft} to ${m.percent}%`;broadcast(room);return;
      }
      if(m.type==='debug_pickup'||m.type==='debug_turbo'){
        if(!c.debug||room.hostId!==player.id){error(ws,'HOST_ONLY','Only the debug host can use this.');return;}
        if(!room.sim||room.sim.phase!=='race'){error(ws,'PHASE','Use during a race.');return;}
        if(!['red','blue','both'].includes(String(m.raft))){error(ws,'DEBUG','Choose a raft.');return;}
        if(m.type==='debug_turbo'&&!config.release.turbo){error(ws,'DEBUG','Turbo is not available.');return;}
        if(m.type==='debug_pickup'&&!['speed','log','bubble'].includes(String(m.item))){error(ws,'DEBUG','Choose a pickup.');return;}
        room.sim.rafts.forEach((r,i)=>{if(m.raft!=='both'&&i!==(m.raft==='red'?0:1))return;if(m.type==='debug_turbo')r.turboMeter=1;else room.sim!.systems.pickup(i,m.item as 'speed'|'log'|'bubble');});broadcast(room);return;
      }
      if(m.type==='input'){
        if(!room.sim||player.seat===null)return;
        if(m.seat!==player.seat||m.inputEpoch!==player.inputEpoch||m.raceId!==room.sim.raceId)return;
        if(!Number.isSafeInteger(m.seq)||Number(m.seq)<0||![-1,0,1].includes(Number(m.walk))||typeof m.fire!=='boolean'||!Number.isSafeInteger(m.whackCount)||Number(m.whackCount)<0)return;
        room.sim.input(player.seat,{seq:Number(m.seq),walk:Number(m.walk),fire:m.fire,whackCount:Number(m.whackCount)});return;
      }
      if(m.type==='rematch'){
        if(room.hostId!==player.id){error(ws,'HOST_ONLY','Only the host can rematch.');return;}
        if(room.sim?.phase!=='results'){error(ws,'PHASE','Finish the race before rematching.');return;}
        room.sim=undefined;room.accumulator=0;room.banner='';for(const p of room.players)p.ready=false;broadcast(room);return;
      }
      if(m.type==='start'){
        if(room.hostId!==player.id){error(ws,'HOST_ONLY','Only the host can start.');return;}
        if(room.sim){error(ws,'PHASE','The race has already started.');return;}
        const waiting=room.players.filter(p=>p.seat!==null&&p.socket&&!p.ready);
        if(waiting.length){error(ws,'NOT_READY',`Waiting for ${waiting[0].name} to be Ready`);return;}
        room.sim=new Simulation(config,room.mode,Date.now(),randomBytes(4).readUInt32LE(0),randomUUID(),{difficulty:room.difficulty??'chill',characters:Array.from({length:seatCount(room)},(_,seat)=>room.players.find(p=>p.seat===seat)?.character??(['hippo','frog','bear','capybara'] as Character[])[seat%4])});room.lastPump=performance.now();room.accumulator=0;broadcast(room);return;
      }
      if(room.sim){error(ws,'PHASE','Wait for the next lobby to change seats or mode.');return;}
      if(m.type==='character'){
        if(!['hippo','frog','bear','capybara'].includes(String(m.character))){error(ws,'CHARACTER','Choose an animal.');return;}
        if(player.seat===null){error(ws,'SEAT','Take a seat first.');return;}player.character=m.character as Character;player.ready=false;broadcast(room);return;
      }
      if(m.type==='difficulty'){
        if(room.hostId!==player.id){error(ws,'HOST_ONLY','Only the host sets difficulty.');return;}
        if(!['chill','normal','spicy'].includes(String(m.difficulty))){error(ws,'DIFFICULTY','Choose Chill, Normal or Spicy.');return;}room.difficulty=m.difficulty as Difficulty;broadcast(room);return;
      }
      if(m.type==='ready'){if(player.seat!==null)player.ready=m.ready===true;broadcast(room);return;}
      if(m.type==='seat'){
        if(!Number.isInteger(m.seat)||Number(m.seat)<0||Number(m.seat)>=seatCount(room)){error(ws,'SEAT','Choose a seat.');return;}
        if(room.players.some(p=>p!==player&&p.seat===m.seat)){error(ws,'SEAT','That seat is taken.');return;}
        player.seat=Number(m.seat);player.bigScreen=false;player.ready=false;broadcast(room);return;
      }
      if(m.type==='mode'){
        if(room.hostId!==player.id){error(ws,'HOST_ONLY','Only the host can change the mode.');return;}
        if(m.mode!=='1v1'&&m.mode!=='2v2'){error(ws,'MODE','Choose 1v1 or 2v2.');return;}
        if(m.mode==='1v1'&&room.players.filter(p=>p.seat!==null).length>config.rooms.seats_1v1){error(ws,'MODE','1v1 needs at most 2 seated humans.');return;}
        room.mode=m.mode;
        if(m.mode==='1v1')room.players.filter(p=>p.seat!==null).sort((a,b)=>Number(a.seat)-Number(b.seat)).forEach((p,i)=>{p.seat=i;});
        room.players.forEach(p=>p.ready=false);broadcast(room);return;
      }
      error(ws,'UNAVAILABLE','Racing is coming in the next checkpoint.');
    });
    ws.on('close',()=>{detach(ws);clients.delete(ws);if(loop&&!options.measure&&![...clients.values()].some(c=>c.debug)){loop.disable();loop=undefined;}});
  });
  const pump=setInterval(()=>{
    const now=performance.now();
    for(const room of rooms.values()){
      const sim=room.sim;if(!sim)continue;
      if(config.rooms.suspend_sim_when_empty&&!room.players.some(p=>p.socket)){room.pausedSince??=now;room.lastPump=now;room.accumulator=0;continue;}
      if(sim.currentPhase()==='results'){room.accumulator=0;room.lastPump=now;continue;}
      room.accumulator+=(now-room.lastPump)/1000;room.lastPump=now;room.schedulerLateMaxMs=Math.max(room.schedulerLateMaxMs,Math.max(0,(room.accumulator-sim.dt)*1000));
      while(room.accumulator>=sim.dt){
        const phase:string=sim.phase,cpuStart=loop?process.threadCpuUsage():undefined,start=performance.now();
        sim.setBots(sim.animals.filter(a=>!room.players.some(p=>p.seat===a.seat&&!p.botDriving)).map(a=>a.seat));sim.step();
        const cost=performance.now()-start,cpuCost=cpuStart?process.threadCpuUsage(cpuStart):undefined;sim.tickTotalMs+=cost;sim.tickCount++;sim.tickAverageMs=sim.tickTotalMs/sim.tickCount;sim.tickWorstMs=Math.max(sim.tickWorstMs,cost);if(cost>sim.dt*1000){room.overruns++;room.lastOverrunWallMs=cost;room.lastOverrunCpuMs=cpuCost?(cpuCost.user+cpuCost.system)/1000:undefined;if(room.overruns===1)console.warn('Simulation tick exceeded budget; rates unchanged.');}
        room.accumulator-=sim.dt;
        if(phase!==sim.phase)broadcast(room);if(sim.currentPhase()==='results'){room.accumulator=0;break;}
        if((sim.tick+room.snapshotPhase)%Math.round(config.network.sim_hz/config.network.snapshot_hz)===0){
          const start=performance.now(),snapshot=sim.snapshot(),encoded=Buffer.from(JSON.stringify({type:'snapshot',snapshot}));room.snapshotCount++;room.snapshotBytes+=encoded.length;for(const p of room.players)if(p.socket)sendRaw(p.socket,encoded);const snapshotMs=performance.now()-start;room.snapshotTotalMs+=snapshotMs;room.snapshotWorstMs=Math.max(room.snapshotWorstMs,snapshotMs);
        }
      }
    }
  },config.network.scheduler_interval_ms);pump.unref();
  const maintenance=setInterval(()=>{
    const now=performance.now();
    for(const [ws,c] of clients){
      if(now-c.lastSeen>config.network.heartbeat_timeout_s*1000){
        // An unclean transport loss starts at its last heartbeat, not at the later
        // socket close callback. Do not add a second 3s grace after detection.
        c.lostAt=c.lastSeen;ws.terminate();
      }else if(!c.hello && now-c.refillAt>config.network.handshake_timeout_s*1000)ws.terminate();
    }
    for(const [code,room]of rooms){
      let changed=false;
      for(const p of room.players)if(!p.socket && p.disconnectedAt!==undefined && now-p.disconnectedAt>=config.network.disconnect_to_bot_s*1000 && !p.botDriving){
        p.botDriving=true;room.banner=`${p.name} left, bot is driving`;promote(room,p);changed=true;
      }
      if(room.emptySince!==undefined && now-room.emptySince>=config.rooms.idle_close_min*60*1000){rooms.delete(code);continue;}
      if(changed)broadcast(room);
    }
  },config.rooms.maintenance_interval_ms);maintenance.unref();
  const heartbeat=setInterval(()=>{for(const ws of clients.keys())if(ws.readyState===WebSocket.OPEN)ws.ping();},config.network.heartbeat_interval_s*1000);heartbeat.unref();
  return {server,bootId,rooms,
    metrics:()=>({rooms:rooms.size,connections:clients.size,bytesOut,messagesOut,bytesIn,messagesIn,eventLoopMeanMs:loop?loop.mean/1e6:null,eventLoopMaxMs:loop?loop.max/1e6:null}),
    listen:async(port=Number(process.env.PORT??3000))=>{await new Promise<void>(resolve=>server.listen(port,'0.0.0.0',resolve));return (server.address()as AddressInfo).port;},
    close:async()=>{clearInterval(pump);clearInterval(maintenance);clearInterval(heartbeat);loop?.disable();for(const ws of clients.keys())ws.terminate();await new Promise<void>(resolve=>wss.close(()=>resolve()));await new Promise<void>(resolve=>server.close(()=>resolve()));}
  };
}
