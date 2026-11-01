import type {Config,GameEvent,Snapshot} from '../shared.ts';
/** Original, gesture-unlocked browser synthesis. No downloaded sounds or tracking. */
export class RiverAudio {
  warned=new Set<number>();
  context:AudioContext|undefined;master:GainNode|undefined;enabled:boolean;silly:boolean;nextBeat=0;beat=0;state:Snapshot|undefined;
  constructor(readonly config:Config){this.enabled=config.audio.enabled_default;this.silly=config.audio.silly_default;}
  unlock(){if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.connect(this.context.destination);}void this.context.resume();this.volume();}
  volume(){if(this.context&&this.master)this.master.gain.setTargetAtTime(this.enabled&&!document.hidden?this.config.audio.master_gain:0,this.context.currentTime,.03);}
  tone(frequency:number,duration:number,wave:OscillatorType='triangle',gain=1,slide=frequency){const c=this.context,m=this.master;if(!c||!m||!this.enabled||c.state!=='running')return;const o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.setValueAtTime(frequency,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),c.currentTime+duration);g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(gain,c.currentTime+.008);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
  noise(duration:number,gain:number){const c=this.context,m=this.master;if(!c||!m||!this.enabled)return;const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();s.buffer=buffer;filter.type='lowpass';filter.frequency.value=600;g.gain.value=gain;s.connect(filter);filter.connect(g);g.connect(m);s.start();s.onended=()=>{s.disconnect();filter.disconnect();g.disconnect();};}
  event(e:GameEvent,state:Snapshot){if(!this.enabled)return;const a=state.animals.find(a=>a.seat===e.seat),t=this.config.audio.effect_s;
    if(e.type==='shot'&&this.silly){const char=a?.character??'hippo',f=char==='frog'?220:char==='bear'?70:char==='capybara'?145:110;this.tone(f,t,'sawtooth',.45,f/2);this.noise(t,.25);}
    else if(e.type.startsWith('pickup')){this.tone(440,t,'sine',.5,880);}
    else if(e.type==='hit'||e.type==='chomp'){this.noise(t,.7);this.tone(100,t,'square',.3,45);}
    else if(e.type==='block'||e.type==='bubble_block')this.tone(760,t,'triangle',.5,1200);
    else if(e.type==='overheat'||e.type==='tired'){this.noise(t,.35);this.tone(180,t*2,'sawtooth',.3,55);}
    else if(['sync','turbo_start','launch','finish'].includes(e.type)){[0,4,7].forEach(n=>this.tone(220*2**(n/12),t*2,'triangle',.15,880*2**(n/12)));}
  }
  update(state:Snapshot){this.state=state;for(const animal of state.animals){if(animal.heat<this.config.heat.warn_at)this.warned.delete(animal.seat);else if(!this.warned.has(animal.seat)){this.warned.add(animal.seat);this.noise(this.config.audio.effect_s,.3);}}const c=this.context,a=this.config.audio;if(!c||!this.enabled||document.hidden||!['race','countdown'].includes(state.phase))return;if(c.currentTime<this.nextBeat)return;const progress=Math.max(...state.rafts.map(r=>r.progress))/this.config.course.length,tempo=a.music_tempo_start+(a.music_tempo_end-a.music_tempo_start)*progress;this.nextBeat=c.currentTime+a.beat_s/tempo;const note=a.notes[this.beat%a.notes.length];this.tone(a.base_frequency*2**(note/12),a.beat_s*.8,'triangle',a.music_gain);if(this.beat%2===0)this.tone(a.base_frequency/2,.09,'sine',a.music_gain*2);this.beat++;}
}
