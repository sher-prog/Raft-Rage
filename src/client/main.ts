import {JoinRetry} from './join-retry.ts';
import {capybaraIcon} from './character-icon.ts';
import {RiverAudio} from './audio.ts';
import { FirstRaceHints } from '../game/first-race-hints.ts';
import { EventDeduper } from '../game/event-deduper.ts';
import { RaceView,interpolate } from './race-view.ts';
import type { Config, RoomView, ServerMessage, Snapshot, Character } from '../shared.ts';
type Session={code:string;name:string;playerId:string;token:string;bootId:string;inputEpoch:string;seq:number;whackCount:number};
const main=document.querySelector<HTMLElement>('#main')!;
const connection=document.querySelector<HTMLElement>('#connection')!;
const how=document.querySelector<HTMLDialogElement>('#how')!;
document.querySelector('#close-how')!.addEventListener('click',()=>how.close());
const params=new URLSearchParams(location.search),debug=params.get('debug')==='1';
declare const __BUILD_VERSION__:string;
const config:Config=await fetch('/balance_constants.json').then(r=>{if(!r.ok)throw new Error('Config unavailable');return r.json();});
document.documentElement.style.setProperty('--pad-frac',`${(config.release.visuals?config.visuals.phone_pad_frac:config.views.phone_pad_frac)*100}%`);
document.documentElement.style.setProperty('--race-view-frac',`${(config.release.visuals?config.visuals.phone_race_view_frac:config.views.phone_race_view_frac)*100}%`);
for(const [animal,color]of Object.entries(config.visuals.animal_clothing_colors))document.documentElement.style.setProperty(`--kit-${animal}`,color);
const audio=new RiverAudio(config);document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true});document.addEventListener('keydown',()=>audio.unlock(),{capture:true});document.addEventListener('visibilitychange',()=>audio.volume());
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let settings={lowEffects:config.views.default_low_effects,reduceMotion:motionPreference.matches},manualMotion=false;
try{const saved=JSON.parse(sessionStorage.getItem('raft-rage-settings')??'null');if(saved){settings={lowEffects:saved.lowEffects===true,reduceMotion:saved.reduceMotion===true};manualMotion=true;}}catch{}
const settingsDialog=document.querySelector<HTMLDialogElement>('#settings')!,lowBox=document.querySelector<HTMLInputElement>('#low-effects')!,motionBox=document.querySelector<HTMLInputElement>('#reduce-motion')!;
lowBox.checked=settings.lowEffects;motionBox.checked=settings.reduceMotion;
const applySettings=()=>{lowBox.checked=settings.lowEffects;motionBox.checked=settings.reduceMotion;document.body.classList.toggle('reduce-motion',settings.reduceMotion);document.body.classList.toggle('low-effects',settings.lowEffects);raceView?.setEffects(settings.lowEffects,settings.reduceMotion);try{sessionStorage.setItem('raft-rage-settings',JSON.stringify(settings));}catch{}};
document.querySelector('#close-settings')!.addEventListener('click',()=>settingsDialog.close());
lowBox.addEventListener('change',()=>{settings.lowEffects=lowBox.checked;applySettings();});motionBox.addEventListener('change',()=>{manualMotion=true;settings.reduceMotion=motionBox.checked;applySettings();});motionPreference.addEventListener('change',e=>{if(!manualMotion){settings.reduceMotion=e.matches;applySettings();}});
let session:Session|undefined;
try{session=JSON.parse(sessionStorage.getItem('raft-rage-session')??'null')??undefined;}catch{}
let socket:WebSocket|undefined,online=false,bootId=session?.bootId??'',room:RoomView|undefined;
let reconnectDelay=config.network.reconnect_initial_ms,reconnectTimer:ReturnType<typeof setTimeout>|undefined;
let bigScreenPrefill=false;
let screen:'home'|'create'|'join'|'solo'|'lobby'=params.has(config.rooms.share_link_param)?'join':'home';
let clockOffset=0,snapshot:Snapshot|undefined;
let raceView:RaceView|undefined,frames:Snapshot[]=[],lastFrame=performance.now();
const hints=new FirstRaceHints();
const eventDeduper=new EventDeduper(config.network.event_seen_max);
let roomBannerUntil=0;
let eventRaceId='',comicText='',comicUntil=0,serverCpuPercent=0;
let previousMetrics:Record<string,number|null>|undefined,serverMetrics:Record<string,number|null>|undefined,snapshotArrivals:number[]=[];
const held=new Set<string>(),pointers=new Map<number,string>();
let ping=0,notice='',currentName='',prefillCode=params.get(config.rooms.share_link_param)??'';
try{if(sessionStorage.getItem('raft-rage-restarted')){notice='The server restarted. Start a new room.';sessionStorage.removeItem('raft-rage-restarted');}}catch{}
try{currentName=localStorage.getItem('raft-rage-name')??'';}catch{}
const esc=(v:string)=>v.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));
const send=(message:object)=>{if(online&&socket?.readyState===WebSocket.OPEN){socket.send(JSON.stringify(message));return true;}showError('Reconnecting… Please wait for the river connection.');return false;};
let pendingJoin:Record<string,unknown>|undefined;
const joinRetry=new JoinRetry(()=>{if(pendingJoin&&screen==='join')send(pendingJoin);else joinRetry.cancel();},()=>{showError('Could not reconnect yet. Please try again.');});
const saveSession=()=>{try{if(session)sessionStorage.setItem('raft-rage-session',JSON.stringify(session));else sessionStorage.removeItem('raft-rage-session');}catch{}};
const showError=(text:string)=>{const target=document.querySelector<HTMLElement>('#room-form #error');notice=target?text:'';if(target)target.textContent=text;};
const art=`<div class="art" aria-hidden="true"><svg viewBox="0 0 520 530" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#0b8587" d="M0 0h520v530H0z"/><path d="M-100 65C80-30 10 180 200 140S400 20 620 100M-80 440c160-150 220 60 390-30s170-90 280-20" stroke="#41a7a0" stroke-width="90"/><g class="wave" stroke="#96d5bd" stroke-width="3" stroke-linecap="round"><path d="m70 135 36-18m216 15 36-18M420 265l28-14M52 365l40-22m265 110 40-22M126 479l21-10m38-418 25-12M445 69l22-10"/></g><g class="bob" transform="rotate(-20 260 280)"><ellipse cx="267" cy="350" rx="137" ry="51" fill="#075457"/><ellipse cx="260" cy="316" rx="137" ry="74" fill="#c2542d" stroke="#123e40" stroke-width="6"/><ellipse cx="260" cy="297" rx="137" ry="78" fill="#ffb646" stroke="#123e40" stroke-width="6"/><ellipse cx="260" cy="297" rx="91" ry="45" fill="#e69338" stroke="#123e40" stroke-width="5"/><path d="m138 271 31 17m63-67 5 35m94-24-17 31m65 30-31 10m-97 41 3 29m-73-42-22 24" stroke="#c56a29" stroke-width="6"/><path d="M148 308c53 45 167 61 234-2" stroke="#fff1b0" stroke-width="5" stroke-dasharray="8 7"/><path d="m212 283 102 7-2 23-103-7z" fill="#ffe1a3" stroke="#123e40" stroke-width="4"/><path d="M242 233v-38l37-10 20 46" fill="#dd512f" stroke="#123e40" stroke-width="5"/><path d="m244 191-4-26 46-9 6 27z" fill="#f45a34" stroke="#123e40" stroke-width="5"/><ellipse cx="263" cy="160" rx="25" ry="9" fill="#123e40"/><path d="M181 270c-13-6-20-31-12-54 7-17 41-21 62-6 16 12 21 52 8 68" fill="#ff8f35" stroke="#123e40" stroke-width="5"/><path d="m192 222 8 49m20-48-2 52" stroke="#ffe7a5" stroke-width="6"/><ellipse cx="201" cy="202" rx="44" ry="38" fill="#ababbc" stroke="#123e40" stroke-width="5"/><circle cx="168" cy="172" r="11" fill="#ababbc" stroke="#123e40" stroke-width="4"/><circle cx="231" cy="173" r="11" fill="#ababbc" stroke="#123e40" stroke-width="4"/><path d="M158 180c-1-25 14-42 42-42 24 0 39 15 42 39" fill="#f35d35" stroke="#123e40" stroke-width="5"/><path d="m175 148 8 26" stroke="#ffca5e" stroke-width="8"/><ellipse cx="191" cy="209" rx="35" ry="22" fill="#c5c2d1" stroke="#123e40" stroke-width="4"/><circle cx="177" cy="204" r="3" fill="#123e40"/><circle cx="205" cy="204" r="3" fill="#123e40"/><path d="M181 216q12 13 24 0" fill="#123e40"/><path d="m188 218 4 6 5-6" fill="#fff9e9"/><ellipse cx="183" cy="186" rx="8" ry="11" fill="white" stroke="#123e40" stroke-width="3"/><ellipse cx="214" cy="186" rx="8" ry="11" fill="white" stroke="#123e40" stroke-width="3"/><circle cx="186" cy="188" r="3" fill="#123e40"/><circle cx="217" cy="188" r="3" fill="#123e40"/><path d="m247 131-7-24m35 19 10-24m-25 15-2-26" stroke="#d0f5e5" stroke-width="7" stroke-linecap="round"/></g><g fill="#e8f2c8" stroke="#123e40" stroke-width="3"><path d="m67 220 9 10 14 1-10 10-2 15-10-10-14-2 10-10z"/><path d="m407 383 7 8 12 1-8 8-2 12-8-8-11-1 8-8z"/></g></svg><span class="river-caption">GOOD FRIENDS. QUESTIONABLE STEERING.</span><div class="art-tag">1–4 FRIENDS. <span>ONE WILD RIVER.</span></div></div>`;
function pips(character:Character='hippo'){
  const p=config.characters[character].pips;
  return Object.entries(p).map(([key,value])=>`${key[0].toUpperCase()+key.slice(1)} ${'●'.repeat(value)}${'○'.repeat(config.characters.card_pips_max-value)} ${value}`).join(' · ');
}
function characterCards(selected:Character){return `<div class="character-cards">${(['hippo','frog','bear','capybara'] as Character[]).map(ch=>`<button class="character-card ${selected===ch?'selected':''}" data-character="${ch}" aria-pressed="${selected===ch}"><span class="animal-icon">${({hippo:'🦛',frog:'🐸',bear:'🐻',capybara:capybaraIcon})[ch]}</span><b>${ch.toUpperCase()}</b><span class="clothing-key"><i aria-hidden="true"></i>${({hippo:'Red',frog:'Green',bear:'Blue',capybara:'Yellow'})[ch]} kit</span><span>${config.characters[ch].fire_label}${selected===ch?' · ✓ SELECTED':''}</span><small>${pips(ch)}</small></button>`).join('')}</div>`;}
function render(){
  if(!['create','join','solo'].includes(screen))notice='';
  if(screen==='lobby'&&room?.phase==='results'){renderResults();return;}
  if(screen==='lobby'&&room&&room.phase!=='lobby'){renderRace();return;}
  if(raceView){raceView.dispose();raceView=undefined;}document.body.classList.remove('in-race','hud-hidden');
  if(screen==='home')main.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">A LITTLE FRIENDLY RIVER RIVALRY</span><h1>MAKE<br><span>WAVES.</span></h1><p class="intro">A river. Two rafts. Your very competitive friends. Stand to steer, spout to sprint, and try to stay friends at the finish.</p><div class="actions"><button class="primary" id="create">Create room <span aria-hidden="true">↗</span></button><div class="subactions"><button id="join">Join room</button><button id="solo">Solo vs bots</button></div><button class="text-button" id="how-button">How to play →</button>${config.release.big_screen?'<button class="text-button" id="big-screen-home">Big Screen spectator →</button>':''}</div><button class="text-button" id="settings-button">⚙ Settings</button></div>${art}</section>`;
  else if(screen!=='lobby'){
    const joining=screen==='join';
    main.innerHTML=`<section class="form-screen"><button class="text-button back" id="back">← Back to river</button><div class="card"><span class="eyebrow">${joining?'YOUR CREW IS WAITING':'START A LITTLE TROUBLE'}</span><h2>${joining?'Hop aboard.':screen==='solo'?'Your river.<br>Your rules.':'Round up<br>your crew.'}</h2><p class="muted">${joining?'Enter the room code and a name your friends know.':'Pick a display name. Share the room link with your friends.'}</p><form id="room-form">${joining?`<label for="code">Room code</label><input id="code" class="code" name="code" value="${esc(prefillCode)}" autocomplete="off" autocapitalize="characters" spellcheck="false" required aria-describedby="error">`:''}${joining&&config.release.big_screen?`<label class="setting-row"><span>Big Screen spectator</span><input id="big-screen-choice" type="checkbox" ${bigScreenPrefill?'checked':''}></label>`:''}<label for="name">Display name</label><input id="name" name="name" value="${esc(currentName)}" placeholder="e.g. Ana" autocomplete="off" autocapitalize="words" spellcheck="false" required aria-describedby="name-help error"><p class="muted" id="name-help">1–${config.names.max_chars} letters, numbers or spaces.</p><p class="error" id="error" role="alert">${esc(notice)}</p><p id="reclaim-status" role="status"></p><button class="primary submit" type="submit">${joining?'Join room →':'Create room →'}</button></form><p class="privacy">Your name stays in this room until the room closes. No accounts, analytics, trackers, ads or payments. Your browser remembers your name; hosting handles connection metadata.</p></div></section>`;
    document.querySelector<HTMLFormElement>('#room-form')!.onsubmit=e=>{
      e.preventDefault();currentName=document.querySelector<HTMLInputElement>('#name')!.value;
      prefillCode=document.querySelector<HTMLInputElement>('#code')?.value??prefillCode;
      try{localStorage.setItem('raft-rage-name',currentName);}catch{}
      joinRetry.cancel();showError('');pendingJoin=joining?{type:'join',name:currentName,code:prefillCode,bigScreen:document.querySelector<HTMLInputElement>('#big-screen-choice')?.checked===true}:undefined;send(pendingJoin??{type:'create',name:currentName,solo:screen==='solo'});
    };
    if(joining && params.has(config.rooms.share_link_param))document.querySelector<HTMLInputElement>('#name')!.focus();
  } else if(room){
    const own=room.players.find(p=>p.id===session?.playerId),host=room.hostId===session?.playerId;
    const seats=room.mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2;
    const team=(index:number)=>`<section class="team ${index===0?'red':'blue'}"><h3>${index===0?'▲ RED RAFT':'● BLUE RAFT'}</h3>${Array.from({length:seats/2},(_,i)=>{
      const seat=index*(seats/2)+i,p=room!.players.find(x=>x.seat===seat);
      return `<button class="seat ${p?.id===own?.id?'own':''}" data-seat="${seat}"><span>${esc(p?.name??`Bot (${room?.difficulty??'chill'})`)}${p?.id===room!.hostId?' · HOST':''}${p?.id===own?.id?' · YOU':''}<small>${room!.mode==='1v1'?'Solo seat':i===0?'Left seat':'Right seat'} · ${p?.character??(['hippo','frog','bear','capybara'][seat%4])}</small></span><span class="seat-status">${p?(p.connected?(p.ready?'✓ READY':'Not ready'):'Reconnecting…'):'Tap to sit'}</span></button>`;
    }).join('')}</section>`;
    main.innerHTML=`<section class="lobby"><div class="lobby-top"><div><span class="eyebrow">THE CREW ASSEMBLES</span><h2 class="room-code">${esc(room.code)}</h2><p class="muted">Players join at this link with no login.</p></div><div class="share-actions"><button id="copy">Copy link</button><button id="share">Share ↗</button></div></div><div id="banner" class="banner" role="status">${esc(room.banner||'Your raft is waiting. Bring a friend aboard.')}</div><div class="seat-grid">${team(0)}${team(1)}</div><div class="lobby-controls">${own?.seat!==null?`<button class="${own?.ready?'':'primary'}" id="ready">${own?.ready?'✓ READY':'Ready up'}</button>`:'<p class="muted">Spectating · Tap an open seat to sit.</p>'}<button class="text-button" id="how-button">How to play</button><button class="text-button" id="settings-button">⚙ Settings</button><button class="text-button" id="leave">Leave</button>${host?`<div class="host-controls"><span class="muted">Mode</span><button id="mode-1" class="${room.mode==='1v1'?'selected':''}" aria-pressed="${room.mode==='1v1'}">1v1</button><button id="mode-2" class="${room.mode==='2v2'?'selected':''}" aria-pressed="${room.mode==='2v2'}">2v2</button></div>`:''}</div>${own?.seat!==null?characterCards(own?.character??'hippo'):''}${host?`<label class="difficulty-label">Bots <select id="difficulty">${['chill','normal','spicy'].map(d=>`<option ${d===(room?.difficulty??'chill')?'selected':''}>${d}</option>`).join('')}</select></label>`:''}${host?`<button id="start" class="primary" ${room.players.some(p=>p.seat!==null&&p.connected&&!p.ready)?'disabled':''}>Start race</button><p class="muted">${room.players.filter(p=>p.seat!==null&&p.connected&&!p.ready).map(p=>`Waiting for ${esc(p.name)} to be Ready`).join(' · ')||'Crew ready. Let’s go!'}</p>`:'<p class="muted">Waiting for host to start…</p>'}<div class="how-strip"><article class="how-card"><b>01 / Stand to steer</b><p>Walk the rim. Fire at the back to go forward, or from a side to slide.</p></article><article class="how-card"><b>02 / Pick an animal</b><p>Hippo spouts. Frog charges. Bear pushes. Capybara whirls. Pick your style.</p></article><article class="how-card"><b>03 / Whack and block</b><p>Whack a nearby rival to stun. Whack during their windup to block.</p></article></div><p class="muted status-toast" id="share-status" role="status"></p>${debug?`<pre class="debug">BUILD ${__BUILD_VERSION__}
phase: ${room.phase} · revision: ${room.revision} · ping: ${ping.toFixed(0)} ms
player: ${esc(session?.playerId??'')} · boot: ${esc(bootId.slice(0,8))}
Simulation starts with the race
Configured: ${config.network.sim_hz} Hz sim / ${config.network.snapshot_hz} Hz snapshots / ${config.network.input_resend_hz} Hz input</pre>`:''}</section>`;
    document.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(b=>b.onclick=()=>send({type:'seat',seat:Number(b.dataset.seat)}));
    document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>b.onclick=()=>send({type:'character',character:b.dataset.character}));document.querySelector('#difficulty')?.addEventListener('change',e=>send({type:'difficulty',difficulty:(e.target as HTMLSelectElement).value}));
    document.querySelector('#start')?.addEventListener('click',()=>send({type:'start'}));
    document.querySelector('#ready')?.addEventListener('click',()=>send({type:'ready',ready:!own?.ready}));
    document.querySelector('#mode-1')?.addEventListener('click',()=>send({type:'mode',mode:'1v1'}));
    document.querySelector('#mode-2')?.addEventListener('click',()=>send({type:'mode',mode:'2v2'}));
    document.querySelector('#leave')!.addEventListener('click',()=>{send({type:'leave'});clearRoom();});
    const link=new URL(location.origin);link.searchParams.set(config.rooms.share_link_param,room.code);
    document.querySelector('#copy')!.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link.href);document.querySelector('#share-status')!.textContent='Link copied. Send it to your crew.';}catch{document.querySelector('#share-status')!.textContent=link.href;}});
    document.querySelector('#share')!.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'Raft Rage',text:`Hop aboard room ${room!.code}`,url:link.href});else{await navigator.clipboard.writeText(link.href);document.querySelector('#share-status')!.textContent='Link copied.';}}catch{document.querySelector('#share-status')!.textContent=link.href;}});
  }
  for(const id of ['create','join','solo'])document.querySelector(`#${id}`)?.addEventListener('click',()=>{screen=id as typeof screen;notice='';render();});
  document.querySelector('#big-screen-home')?.addEventListener('click',()=>{bigScreenPrefill=true;screen='join';render();});
  document.querySelector('#back')?.addEventListener('click',()=>{screen='home';notice='';joinRetry.cancel();pendingJoin=undefined;render();});
  document.querySelector('#settings-button')?.addEventListener('click',()=>{releaseAll();settingsDialog.showModal();});
  document.querySelector('#how-button')?.addEventListener('click',()=>how.showModal());
}
function renderRace(){
  if(document.querySelector('#game-stage')){syncDebugActions();return;}
  document.body.classList.add('in-race');
  const own=room?.players.find(p=>p.id===session?.playerId);const crewNames=(index:number)=>snapshot?.animals.filter(a=>a.raft===index).map(a=>esc(room?.players.find(p=>p.seat===a.seat)?.name??`Bot ${a.character}`)).join(' + ')??'';document.body.classList.toggle('spectator-view',own?.seat===null);
  main.innerHTML=`<section class="race-screen"><div class="race-top"><b>▲ RED <span>vs</span> ● BLUE</b><strong id="race-clock">0:00.0</strong><button id="race-settings" aria-label="Settings">⚙</button><button id="pad-toggle">Show controls</button><button id="race-leave">Leave</button></div><div id="game-stage"></div><div id="big-screen-labels" hidden><span>▲ RED<small>${crewNames(0)}</small></span><span>● BLUE<small>${crewNames(1)}</small></span></div><div id="countdown" role="status"></div><div id="race-progress"><label>▲ RED${own?.seat!==null&&own?.seat!==undefined&&Math.floor(own.seat/((room?.mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2)/2))===0?' YOU':''} <output id="red-distance"></output><progress aria-label="Red race progress" id="red-progress" max="1" value="0"></progress></label><label>● BLUE${own?.seat!==null&&own?.seat!==undefined&&Math.floor(own.seat/((room?.mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2)/2))===1?' YOU':''} <output id="blue-distance"></output><progress aria-label="Blue race progress" id="blue-progress" max="1" value="0"></progress></label><div class="race-hud-meta"><div id="race-resources" role="status"></div><div id="race-banner" class="hud-event" role="status">${own?.seat===null?"You'll join next race":''}</div></div><button id="rescue" hidden>RESCUE · REWIND</button><div id="race-hints" aria-live="polite"><p id="walk-hint"></p><p id="fire-hint"></p><p id="turbo-hint"></p></div></div>${own?.seat!==null?`<div id="pad" class="pad"><button data-control="left" aria-label="Walk left">◀<small>WALK LEFT</small></button><button data-control="right" aria-label="Walk right">▶<small>WALK RIGHT</small></button><button data-control="whack">WHACK</button><button data-control="fire" class="primary">SPOUT</button></div><div class="key-legend">A / D walk · W fire · S whack</div>`:''}${debug?'<pre id="race-debug" class="debug"></pre>':''}</section>`;
  try{raceView=new RaceView(document.querySelector<HTMLElement>('#game-stage')!,config,()=>{settings.lowEffects=true;applySettings();comicText='Low effects enabled for smoother play';comicUntil=Date.now()+clockOffset+config.visuals.comic_banner_s*1000;});raceView.setEffects(settings.lowEffects,settings.reduceMotion);}catch{showError('This browser could not start 3D. Try refreshing the page.');}
  document.querySelector('#race-settings')!.addEventListener('click',()=>{releaseAll();settingsDialog.showModal();});
  syncDebugActions();
  document.querySelector('#rescue')?.addEventListener('click',()=>{if(!session)return;releaseAll();send({type:'rescue',raceId:snapshot?.raceId,seat:room?.players.find(p=>p.id===session?.playerId)?.seat,inputEpoch:session.inputEpoch});});
  document.querySelector('#race-leave')!.addEventListener('click',()=>{releaseAll();send({type:'leave'});clearRoom();});
  document.querySelector('#pad-toggle')!.addEventListener('click',e=>{const shown=document.querySelector('#pad')?.classList.toggle('show-pad');const button=e.currentTarget as HTMLButtonElement;button.textContent=shown?'Hide controls':'Show controls';button.setAttribute('aria-expanded',String(!!shown));});
  document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,button.dataset.control!);if(button.dataset.control==='whack'&&session)session.whackCount++;button.classList.add('held');sendInput();});
    const release=(e:PointerEvent)=>{pointers.delete(e.pointerId);button.classList.remove('held');sendInput();};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    button.addEventListener('contextmenu',e=>e.preventDefault());
  });updateClock();
}
function syncDebugActions(){
  document.querySelector('#debug-actions')?.remove();
  if(!debug||room?.hostId!==session?.playerId||!document.querySelector('.race-screen'))return;
  const box=document.createElement('div');box.id='debug-actions';
  box.innerHTML=`<label>Jump to <select id="jump-percent">${config.debug.jump_percents.map(n=>`<option value="${n}" ${n===config.debug.default_jump_percent?'selected':''}>${n}%</option>`).join('')}</select></label>${['Red','Blue','both'].map(raft=>`<button data-jump="${raft.toLowerCase()}">Jump ${raft} to ${config.debug.default_jump_percent}%</button>`).join('')}<select id="debug-raft"><option value="red">Red</option><option value="blue">Blue</option><option value="both">Both</option></select><select id="debug-item"><option value="speed">Speed</option><option value="log">Log</option><option value="bubble">Bubble</option></select><button id="give-pickup">Give pickup</button>${config.release.turbo?'<button id="fill-turbo">Fill turbo</button>':''}<button id="hide-hud" title="Tap the scene or press H to show the HUD again">Hide HUD</button>`;
  document.querySelector('.race-screen')!.append(box);
  const select=box.querySelector<HTMLSelectElement>('#jump-percent')!;
  const update=()=>box.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach(button=>button.textContent=`Jump ${button.dataset.jump==='both'?'both':button.dataset.jump==='red'?'Red':'Blue'} to ${select.value}%`);
  select.addEventListener('change',update);box.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach(button=>button.addEventListener('click',()=>send({type:'debug_jump',raft:button.dataset.jump,percent:Number(select.value)})));
  box.querySelector('#give-pickup')!.addEventListener('click',()=>send({type:'debug_pickup',raft:box.querySelector<HTMLSelectElement>('#debug-raft')!.value,item:box.querySelector<HTMLSelectElement>('#debug-item')!.value}));box.querySelector('#fill-turbo')?.addEventListener('click',()=>send({type:'debug_turbo',raft:box.querySelector<HTMLSelectElement>('#debug-raft')!.value}));
  box.querySelector('#hide-hud')!.addEventListener('click',()=>document.body.classList.toggle('hud-hidden'));
}
main.addEventListener('pointerdown',()=>{if(document.body.classList.contains('hud-hidden'))document.body.classList.remove('hud-hidden');},true);
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&debug&&room?.hostId===session?.playerId)document.body.classList.toggle('hud-hidden');});
function updateOrientation(){const block=matchMedia('(pointer:coarse)').matches&&innerWidth>innerHeight&&innerHeight<=config.views.phone_landscape_max_height_px;document.querySelector<HTMLElement>('#orientation')!.hidden=!block;if(block)releaseAll();}
window.addEventListener('resize',updateOrientation);
function scorecard(state:Snapshot){
 const columns=Object.entries(config.stats.awards),name=(seat:number)=>room?.players.find(p=>p.seat===seat)?.name??`Bot ${state.animals[seat].character}`,max=(key:string)=>Math.max(...state.animals.map(a=>(a.stats as Record<string,number>)[key]));
 const awards=columns.filter(([key])=>max(key)>0).map(([key,title])=>`<p><b>${title}</b> · ${state.animals.filter(a=>(a.stats as Record<string,number>)[key]===max(key)).map(a=>esc(name(a.seat))).join(' & ')}</p>`).join('');
 return `<section class="scorecard"><h3>CREW SCORECARD</h3><div class="score-scroll"><table><thead><tr><th>CREW</th>${columns.map(([key])=>`<th>${key.replace('_',' ').toUpperCase()}</th>`).join('')}</tr></thead><tbody>${state.animals.map(a=>`<tr><th>${a.raft===0?'▲':'●'} ${esc(name(a.seat))}<small>${a.character}</small></th>${columns.map(([key])=>{const value=(a.stats as Record<string,number>)[key];return `<td data-label="${esc(key.replaceAll('_',' ').toUpperCase())}">${value}${value>0&&value===max(key)?' ★':''}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div><div class="awards">${awards}</div></section>`;
}
function renderResults(){
  if(raceView){raceView.dispose();raceView=undefined;}held.clear();pointers.clear();document.body.classList.remove('in-race','hud-hidden');
  if(!snapshot||!room)return;
  const state=snapshot,host=room.hostId===session?.playerId,seats=room.mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2;
  const title=state.winner===null?config.race.timeout_tie_label:state.winner===0?'▲ RED WINS!':'● BLUE WINS!';
  main.innerHTML=`<section class="results card"><span class="eyebrow">THAT WAS A SPLASH</span><h2>${title}</h2><div class="seat-grid">${state.rafts.map((r,index)=>`<article class="team ${index===0?'red':'blue'}"><h3>${index===0?'▲ RED':'● BLUE'}</h3><h2>${r.finishTime===null?`DNF`:`${r.finishTime.toFixed(2)}s`}</h2><p>${r.finishTime===null?`${Math.max(0,config.course.length-r.progress).toFixed(0)}u to go`:''}</p>${Array.from({length:seats/2},(_,i)=>{const seat=index*seats/2+i,p=room!.players.find(p=>p.seat===seat);return `<p>${esc(p?.name??'Bot')} · ${state.animals[seat]?.character??'hippo'}${p&&!p.connected?' (bot driving)':''}</p>`;}).join('')}</article>`).join('')}</div>${config.release.awards?scorecard(state):''}<div class="lobby-controls">${host?'<button id="rematch" class="primary">Rematch</button>':'<p>Waiting for host…</p>'}<button id="results-leave">Leave</button></div></section>`;
  document.querySelector('#rematch')?.addEventListener('click',()=>send({type:'rematch'}));document.querySelector('#results-leave')!.addEventListener('click',()=>{send({type:'leave'});clearRoom();});
}
function acceptSnapshot(state:Snapshot){
  if(state.raceId!==eventRaceId){frames=[];eventRaceId=state.raceId;comicText='';}
  for(const e of eventDeduper.consume(state.raceId,state.events)){
    const text:Record<string,string>={rescued:'RESCUED',whack_windup:'WHACK WINDUP!',block:'BLOCK!',hit:'WHACK!',immune:'IMMUNE'};
    Object.assign(text,{overheat:'OVERHEAT!',tired:'TIRED!',pickup_speed:'SPEED BOOST!',pickup_bubble:'BUBBLE SHIELD!',pickup_log:'LOG LOADED!',log_throw:'LOG AWAY!',bubble_block:'BUBBLE BLOCK!',sync:'SYNC!',turbo_start:'TURBO!',turbo_ready:'TURBO READY!',chomp:'CHOMP!',launch:'LAUNCH!',landing:`BIG AIR ${(e.value??0).toFixed(1)}s`,too_slow:'TOO SLOW',close_call:'CLOSE CALL!',gate_open:'GATE OPEN!',gate_hint:'WHACK THE GATE!'});audio.event(e,state);raceView?.event(e,state);
    if(text[e.type]){comicText=text[e.type];comicUntil=state.serverTime+config.visuals.comic_banner_s*1000;}
  }
  hints.observe(state,room?.players.find(p=>p.id===session?.playerId)?.seat);
  snapshot=state;frames.push(state);if(frames.length>config.network.snapshot_buffer_max)frames.shift();
}
function sendInput(){
  if(!online||!room||!['countdown','race'].includes(room.phase)||!session)return;
  const player=room.players.find(p=>p.id===session?.playerId);if(player?.seat===null||player?.seat===undefined)return;
  const controls=[...pointers.values()],left=held.has('a')||controls.includes('left'),right=held.has('d')||controls.includes('right');
  session.seq++;saveSession();send({type:'input',raceId:snapshot?.raceId,seat:player.seat,inputEpoch:session.inputEpoch,seq:session.seq,whackCount:session.whackCount,walk:Number(left)-Number(right),fire:held.has('w')||controls.includes('fire')});
}
function releaseAll(){held.clear();pointers.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));sendInput();}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(!room||!['countdown','race'].includes(room.phase)||!['a','d','w','s'].includes(key)||settingsDialog.open||how.open||e.repeat)return;e.preventDefault();held.add(key);if(key==='s'&&session)session.whackCount++;sendInput();});
window.addEventListener('keyup',e=>{if(held.delete(e.key.toLowerCase()))sendInput();});
window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
setInterval(sendInput,1000/config.network.input_resend_hz);
function updateClock(){
  if(!snapshot)return;
  const serverNow=Date.now()+clockOffset;
  const elapsed=(serverNow-snapshot.startServerTime)/1000;
  const raceTime=elapsed<config.rooms.countdown_s?0:Math.max(0,snapshot.raceTime+Math.min(config.network.clock_max_extrapolation_s,Math.max(0,(serverNow-snapshot.serverTime)/1000)));
  const target=document.querySelector('#race-clock');if(target)target.textContent=`${Math.floor(raceTime/60)}:${(raceTime%60).toFixed(1).padStart(4,'0')}`;
  const countdown=document.querySelector('#countdown');if(countdown)countdown.textContent=elapsed<config.rooms.countdown_s?String(Math.ceil(config.rooms.countdown_s-elapsed)):raceTime<config.rooms.go_banner_s?'GO!':'';
  const own=room?.players.find(p=>p.id===session?.playerId),ownRaft=own?.seat!==null&&own?.seat!==undefined?Math.floor(own.seat/((room?.mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2)/2)):snapshot.rafts[1].progress>snapshot.rafts[0].progress?1:0;
  const animal=snapshot.animals.find(a=>a.seat===own?.seat),raft=snapshot.rafts[ownRaft],fireButton=document.querySelector<HTMLElement>('[data-control="fire"]');
  if(animal&&fireButton){const ch=config.characters[animal.character],value=animal.character==='bear'?animal.stamina/config.characters.bear.stamina_s:animal.character==='frog'?animal.charge:animal.heat;if(fireButton.dataset.character!==animal.character){fireButton.innerHTML='<span class="fire-label"></span><small class="resource-label"></small><meter min="0" max="1"></meter>';fireButton.dataset.character=animal.character;}fireButton.querySelector('.fire-label')!.textContent=ch.fire_label;fireButton.querySelector('.resource-label')!.textContent=animal.lockout>0?(animal.character==='bear'?'TIRED':'OVERHEAT'):animal.heat>=config.heat.warn_at?'HOT':animal.character==='bear'?'STAMINA':animal.character==='frog'?'CHARGE':'HEAT';fireButton.querySelector('meter')!.value=value;fireButton.classList.toggle('hot',animal.heat>=config.heat.warn_at);}
  const resources=document.querySelector('#race-resources');if(resources)resources.textContent=[raft.slipstream?'SLIPSTREAM':'',raft.boost>0?'SPEED BOOST':'',raft.bubble?'BUBBLE SHIELD':'',raft.item==='log'?'LOG · WHACK TO THROW':'',raft.height>0?`BIG AIR ${raft.airTime.toFixed(1)}s`:'',config.release.turbo?`TURBO ${Math.round(raft.turboMeter*100)}%${raft.turbo>0?' · ACTIVE':raft.turboMeter>=1?' · READY':''}`:''].filter(Boolean).join(' · ');
  const rescue=document.querySelector<HTMLButtonElement>('#rescue');if(rescue)rescue.hidden=!(raft.rescueReady&&own?.seat!==null&&own?.seat!==undefined);
  const banner=document.querySelector('#race-banner');if(banner)banner.textContent=snapshot.rafts[ownRaft].stun>0?'STUNNED':serverNow<comicUntil?comicText:snapshot.firstFinishTime!==null?`${snapshot.winner===0?'▲ RED':'● BLUE'} WINS!`:own?.seat===null?(own.bigScreen?'':"You'll join next race"):serverNow<roomBannerUntil?room?.banner??'':'';
  for(const [i,id]of ['red-progress','blue-progress'].entries()){const bar=document.querySelector<HTMLProgressElement>('#'+id);if(bar)bar.value=snapshot.rafts[i].progress/config.course.length;
    const distance=document.querySelector('#'+(i===0?'red':'blue')+'-distance');if(distance)distance.textContent=` ${Math.round(snapshot.rafts[i].progress/config.course.length*100)}% · ${Math.ceil(Math.max(0,config.course.length-snapshot.rafts[i].progress))}u to FINISH`;}
  for(const [id,done,text] of [['walk-hint',hints.walkDone,config.teaching.first_race_hints[0]],['fire-hint',hints.fireDone,config.teaching.first_race_hints[1]],['turbo-hint',hints.turboDone||!config.release.turbo||room?.mode!=='2v2',config.teaching.first_race_hints[2]]] as const){const el=document.querySelector<HTMLElement>('#'+id);if(el){el.textContent=String(text);const dismissed=done||!hints.visible(snapshot.raceId)||own?.seat===null;el.classList.toggle('hint-done',dismissed);el.setAttribute('aria-hidden',String(dismissed));}}
  const dbg=document.querySelector('#race-debug');if(dbg){const r=snapshot.rafts[ownRaft],a=snapshot.animals.find(a=>a.seat===own?.seat);dbg.textContent=`${room?.phase} · tick ${snapshot.tick} · ${snapshot.raceTime.toFixed(2)}s · fps ${raceView?.fps.toFixed(0)??0} · ping ${ping.toFixed(0)}ms\nAVERAGE tick ${snapshot.tickAverageMs.toFixed(3)}ms / WORST tick ${snapshot.tickWorstMs.toFixed(3)}ms\nx ${r.x.toFixed(1)} y ${r.y.toFixed(1)} heading ${(r.heading*180/Math.PI).toFixed(1)}° speed ${Math.hypot(r.vx,r.vy).toFixed(1)}\nphi ${a?.phi.toFixed(1)} · seq sent ${session?.seq??0} / ack ${a?.seq??-1}\n${config.network.sim_hz}Hz sim · ${(snapshotArrivals.length/config.visuals.fps_sample_s).toFixed(0)}Hz received snapshots · ${config.network.input_resend_hz}Hz input · buffer ${config.network.interp_buffer_ms}ms\nOdds ${JSON.stringify(raft.progress<snapshot.rafts[1-ownRaft].progress-config.pickups.catchup_behind_distance?config.pickups.odds_trailing_far:raft.progress>snapshot.rafts[1-ownRaft].progress?config.pickups.odds_leader:config.pickups.odds_neutral)}\nThrust ×${((room?.mode==='1v1'?config.multipliers.impulse_1v1:1)*(r.slow>0?config.multipliers.thrust_slow:1)).toFixed(2)} · triangles ${raceView?.triangles??0} · draw calls ${raceView?.drawCalls??0}\nServer CPU ${serverCpuPercent.toFixed(2)}% core · event loop ${Number(serverMetrics?.eventLoopMeanMs??0).toFixed(2)} / ${Number(serverMetrics?.eventLoopMaxMs??0).toFixed(2)}ms · overruns ${serverMetrics?.overruns??0} · build ${__BUILD_VERSION__}`;}
  return ownRaft;
}
function animation(now:number){
  const dt=Math.min(config.network.clock_max_extrapolation_s,(now-lastFrame)/1000);lastFrame=now;
  const ownRaft=updateClock()??0;
  if(raceView&&snapshot){
    const time=Date.now()+clockOffset-config.network.interp_buffer_ms;let a=frames[0]??snapshot,b=snapshot;
    for(let i=1;i<frames.length;i++){if(frames[i].serverTime>=time){a=frames[i-1];b=frames[i];break;}a=frames[i];}
    const f=b.serverTime>a.serverTime?Math.max(0,Math.min(1,(time-a.serverTime)/(b.serverTime-a.serverTime))):1;
    raceView.draw(interpolate(a,b,f),ownRaft,dt,room?.players.find(p=>p.id===session?.playerId)?.bigScreen===true);audio.update(snapshot);
  }requestAnimationFrame(animation);
}requestAnimationFrame(animation);
function clearRoom(){joinRetry.cancel();pendingJoin=undefined;held.clear();pointers.clear();frames=[];snapshot=undefined;session=undefined;room=undefined;bootId='';saveSession();screen='home';const url=new URL(location.href);url.searchParams.delete(config.rooms.share_link_param);history.replaceState(null,'',url);render();}
function connect(){
  const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);socket=ws;
  ws.onmessage=e=>{
    const m=JSON.parse(e.data) as ServerMessage;
    if(m.type==='hello'){
      if(m.buildVersion&&m.buildVersion!==__BUILD_VERSION__){clearRoom();try{sessionStorage.setItem('raft-rage-restarted','1');}catch{}location.reload();return;}
      clockOffset=m.serverTime-Date.now();
      if(bootId&&bootId!==m.bootId){online=false;clearRoom();notice='The server restarted. Start a new room.';render();}
      bootId=m.bootId;ws.send(JSON.stringify({type:'hello',bootId,protocol:config.network.protocol_version,debug}));
    }else if(m.type==='connected'){
      online=true;reconnectDelay=config.network.reconnect_initial_ms;connection.textContent='River connected';connection.classList.add('online');
      if(session){currentName=session.name;send({type:'resume',...session});}
    }else if(m.type==='reclaim_wait'){showError('');const status=document.querySelector<HTMLElement>('#reclaim-status');if(status)status.textContent=m.message;joinRetry.waiting();
    }else if(m.type==='joined'){
      joinRetry.cancel();pendingJoin=undefined;
      session={code:m.code,name:currentName||session?.name||'',playerId:m.playerId,token:m.token,bootId:m.bootId,inputEpoch:m.inputEpoch,seq:0,whackCount:0};saveSession();screen='lobby';notice='';
    }else if(m.type==='room'){if(m.room.banner!==room?.banner)roomBannerUntil=Date.now()+clockOffset+config.visuals.comic_banner_s*1000;if(/^Jumped (red|blue|both) to (5|20|40|50|68|75|95)%$/.test(m.room.banner)){frames=[];if(raceView){raceView.cameraReady=false;for(const cam of raceView.splitCameras)cam.userData.ready=false;}}room=m.room;if(m.room.simulation)acceptSnapshot(m.room.simulation);if(session){screen='lobby';render();}}
    else if(m.type==='snapshot'){const now=performance.now();snapshotArrivals.push(now);snapshotArrivals=snapshotArrivals.filter(t=>t>=now-config.visuals.fps_sample_s*1000);acceptSnapshot(m.snapshot);updateClock();}
    else if(m.type==='metrics'){
      serverMetrics=m.metrics;
      if(previousMetrics){const wall=Number(m.metrics.wallMs)-Number(previousMetrics.wallMs),cpu=Number(m.metrics.cpuUserUs)+Number(m.metrics.cpuSystemUs)-Number(previousMetrics.cpuUserUs)-Number(previousMetrics.cpuSystemUs);if(wall>0)serverCpuPercent=cpu/(wall*1000)*100;}
      previousMetrics=m.metrics;
    }
    else if(m.type==='error'){
      joinRetry.cancel();pendingJoin=undefined;
      if(m.code==='SERVER_RESTART'||m.code==='ROOM_MISSING'||m.code==='SESSION_MISSING'){
        if(session || m.code==='SERVER_RESTART')clearRoom();
      }showError(m.message);
    }else if(m.type==='pong'){ping=Date.now()-m.clientTime;clockOffset+=(m.serverTime+ping/2-Date.now()-clockOffset)*config.network.clock_offset_blend;}
  };
  ws.onclose=()=>{
    if(socket!==ws)return;online=false;connection.textContent='Reconnecting…';connection.classList.remove('online');
    clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,reconnectDelay*(1+Math.random()*config.network.reconnect_jitter_frac));
    reconnectDelay=Math.min(config.network.reconnect_max_ms,reconnectDelay*config.network.reconnect_factor);
  };
  ws.onerror=()=>{connection.textContent='Reconnecting…';};
}
setInterval(()=>{if(online){send({type:'ping',clientTime:Date.now()});if(debug&&room?.hostId===session?.playerId)send({type:'debug_metrics'});}},config.network.clock_sync_interval_s*1000);
const soundBox=document.querySelector<HTMLInputElement>('#sound')!,sillyBox=document.querySelector<HTMLInputElement>('#silly-sounds')!;soundBox.checked=audio.enabled;sillyBox.checked=audio.silly;soundBox.addEventListener('change',()=>{audio.enabled=soundBox.checked;audio.volume();});sillyBox.addEventListener('change',()=>{audio.silly=sillyBox.checked;});
render();connect();updateOrientation();

