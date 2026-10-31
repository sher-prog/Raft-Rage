import type{GameEvent}from'../shared.ts';
export class EventDeduper{
  raceId='';seen=new Set<number>();maximum=0;
  constructor(readonly limit:number){}
  consume(raceId:string,events:GameEvent[]){
    if(this.raceId!==raceId){this.raceId=raceId;this.seen.clear();this.maximum=0;}
    const fresh:GameEvent[]=[];
    for(const event of events){
      if(event.id<=this.maximum-this.limit||this.seen.has(event.id))continue;
      this.maximum=Math.max(this.maximum,event.id);this.seen.add(event.id);fresh.push(event);
    }
    for(const id of this.seen)if(id<=this.maximum-this.limit)this.seen.delete(id);
    return fresh;
  }
}
