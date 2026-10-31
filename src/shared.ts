export interface Config {
  _version:string;
  network:{protocol_version:number;reconnect_initial_ms:number;reconnect_max_ms:number;reconnect_factor:number;reconnect_jitter_frac:number;heartbeat_interval_s:number;heartbeat_timeout_s:number;handshake_timeout_s:number;stale_input_s:number;max_message_bytes:number;max_buffered_bytes:number;message_burst:number;message_rate_per_s:number;disconnect_to_bot_s:number;clock_sync_interval_s:number;sim_hz:number;snapshot_hz:number;input_resend_hz:number;interp_buffer_ms:number};
  rooms:{code_length:number;code_alphabet:string;share_link_param:string;seats_1v1:number;seats_2v2:number;max_spectators:number;idle_close_min:number;default_mode_solo:'1v1';default_mode_multiplayer:'2v2';maintenance_interval_ms:number;code_attempts_max:number;token_bytes:number;max_rooms:number;max_connections:number;code_blocklist:string[];reclaim_by_name_after_grace:boolean};
  characters:{hippo:{pips:{push:number;turn:number;ease:number}};card_pips_max:number};
  names:{max_chars:number;allowed_pattern:string;blocklist:string[]};
}
export interface PlayerView {id:string;name:string;seat:number|null;connected:boolean;ready:boolean;botDriving:boolean}
export interface RoomView {code:string;hostId:string;mode:'1v1'|'2v2';phase:'lobby';revision:number;banner:string;players:PlayerView[]}
export type ServerMessage =
  |{type:'hello';bootId:string;protocol:number;serverTime:number}
  |{type:'connected';bootId:string}
  |{type:'joined';bootId:string;code:string;playerId:string;token:string}
  |{type:'room';room:RoomView}
  |{type:'pong';serverTime:number;clientTime:number}
  |{type:'left'}
  |{type:'error';code:string;message:string};
