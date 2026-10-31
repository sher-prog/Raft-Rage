export type Config = typeof import('../balance_constants.json');
export type Mode='1v1'|'2v2';
export type Phase='lobby'|'countdown'|'race'|'results';
export interface InputState {seq:number;walk:number;fire:boolean;whackCount:number}
export interface AnimalState {seat:number;raft:number;phi:number;recharge:number;fire:boolean;walk:number;seq:number;whackCount:number}
export interface RaftState {x:number;y:number;heading:number;vx:number;vy:number;omega:number;progress:number;stun:number;slow:number;immunity:number;finishTime:number|null}
export interface Snapshot {rafts:RaftState[];animals:AnimalState[];tick:number;raceTime:number;phase:Exclude<Phase,'lobby'>;startServerTime:number;serverTime:number;tickAverageMs:number;tickWorstMs:number}
export interface PlayerView {id:string;name:string;seat:number|null;connected:boolean;ready:boolean;botDriving:boolean}
export interface RoomView {code:string;hostId:string;mode:'1v1'|'2v2';phase:Phase;simulation?:Snapshot;revision:number;banner:string;players:PlayerView[]}
export type ServerMessage =
  |{type:'hello';bootId:string;protocol:number;serverTime:number}
  |{type:'connected';bootId:string}
  |{type:'joined';bootId:string;code:string;playerId:string;token:string;inputEpoch:string}
  |{type:'room';room:RoomView}
  |{type:'snapshot';snapshot:Snapshot}
  |{type:'pong';serverTime:number;clientTime:number}
  |{type:'left'}
  |{type:'error';code:string;message:string};
