import type {RoomView} from '../shared.ts';
export function lobbyStatus(room:RoomView,seats:number){
 if(room.banner)return room.banner;
 const humans=room.players.filter(p=>p.seat!==null&&p.connected),waiting=humans.some(p=>!p.ready);
 return `${humans.length} of ${seats} seats filled · ${!humans.length?'choose a seat':waiting?'waiting for everyone to Ready':'ready to race'}`;
}
