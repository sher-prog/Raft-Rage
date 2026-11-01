export type Config = typeof import('../balance_constants.json');
export type Character='hippo'|'frog'|'bear'|'capybara';
export type Difficulty='chill'|'normal'|'spicy';
export type Item='speed'|'log'|'bubble';
export type Mode='1v1'|'2v2';
export type Phase='lobby'|'countdown'|'race'|'results';
export interface InputState {seq:number;walk:number;fire:boolean;whackCount:number}
export interface AnimalState {character:Character;heat:number;charge:number;stamina:number;lockout:number;pushing:boolean;stats:{thrusts:number;hits:number;blocks:number;close_calls:number;overheats:number};seat:number;raft:number;phi:number;recharge:number;fire:boolean;walk:number;seq:number;whackCount:number;whackPhase:'idle'|'windup'|'cooldown';whackWindup:number;whackCooldown:number}
export interface RaftState {rescueReady?:boolean;height:number;vz:number;airTime:number;boost:number;turbo:number;turboMeter:number;item:Item|null;bubble:boolean;slipstream:boolean;x:number;y:number;heading:number;vx:number;vy:number;omega:number;progress:number;stun:number;slow:number;immunity:number;finishTime:number|null}
export interface GameEvent {id:number;type:string;tick:number;raft:number;seat?:number;x:number;y:number;value?:number}
export interface Snapshot {world:{crates:number[];projectiles:{x:number;y:number;raft:number}[];gateOpen:number};raceId:string;events:GameEvent[];winner:number|null;firstFinishTime:number|null;rafts:RaftState[];animals:AnimalState[];tick:number;raceTime:number;phase:Exclude<Phase,'lobby'>;startServerTime:number;serverTime:number;tickAverageMs:number;tickWorstMs:number}
export interface PlayerView {character?:Character;bigScreen?:boolean;id:string;name:string;seat:number|null;connected:boolean;ready:boolean;botDriving:boolean}
export interface RoomView {difficulty?:Difficulty;code:string;hostId:string;mode:'1v1'|'2v2';phase:Phase;simulation?:Snapshot;revision:number;banner:string;players:PlayerView[]}
export type ServerMessage =
  |{type:'reclaim_wait';message:string}
  |{type:'hello';bootId:string;protocol:number;serverTime:number;buildVersion:string}
  |{type:'connected';bootId:string}
  |{type:'joined';bootId:string;code:string;playerId:string;token:string;inputEpoch:string}
  |{type:'room';room:RoomView}
  |{type:'snapshot';snapshot:Snapshot}
  |{type:'pong';serverTime:number;clientTime:number}
  |{type:'metrics';metrics:Record<string,number|null>}
  |{type:'left'}
  |{type:'error';code:string;message:string};
