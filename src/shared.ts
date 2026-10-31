export type Config = typeof import('../balance_constants.json');
export type Mode='1v1'|'2v2';
export type Phase='lobby'|'countdown'|'race'|'results';
export interface Snapshot {tick:number;raceTime:number;phase:Exclude<Phase,'lobby'>;startServerTime:number;serverTime:number;tickAverageMs:number;tickWorstMs:number}
export interface PlayerView {id:string;name:string;seat:number|null;connected:boolean;ready:boolean;botDriving:boolean}
export interface RoomView {code:string;hostId:string;mode:'1v1'|'2v2';phase:Phase;simulation?:Snapshot;revision:number;banner:string;players:PlayerView[]}
export type ServerMessage =
  |{type:'hello';bootId:string;protocol:number;serverTime:number}
  |{type:'connected';bootId:string}
  |{type:'joined';bootId:string;code:string;playerId:string;token:string}
  |{type:'room';room:RoomView}
  |{type:'snapshot';snapshot:Snapshot}
  |{type:'pong';serverTime:number;clientTime:number}
  |{type:'left'}
  |{type:'error';code:string;message:string};
