import type { Config, Mode, Snapshot } from '../shared.ts';
export class Simulation {
  tick=0;
  readonly dt:number;
  readonly countdownTicks:number;
  tickAverageMs=0;tickWorstMs=0;tickTotalMs=0;tickCount=0;
  constructor(readonly config:Config,readonly mode:Mode,readonly startServerTime=Date.now()){
    this.dt=1/config.network.sim_hz;
    this.countdownTicks=Math.round(config.rooms.countdown_s*config.network.sim_hz);
  }
  get phase():Snapshot['phase']{return this.tick<this.countdownTicks?'countdown':'race';}
  get raceTime(){return Math.max(0,(this.tick-this.countdownTicks)*this.dt);}
  step(){this.tick++;}
  snapshot():Snapshot{return {tick:this.tick,raceTime:this.raceTime,phase:this.phase,startServerTime:this.startServerTime,serverTime:Date.now(),tickAverageMs:this.tickAverageMs,tickWorstMs:this.tickWorstMs};}
}
