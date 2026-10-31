import type {Snapshot} from '../shared.ts';

/** Visit-local teaching: spectators do not consume their first playable race. */
export class FirstRaceHints {
  raceId='';walkDone=false;fireDone=false;initialPhi:number|undefined;
  observe(state:Snapshot,seat:number|null|undefined){
    if(seat===null||seat===undefined||state.phase==='results')return;
    const animal=state.animals.find(a=>a.seat===seat);if(!animal)return;
    if(!this.raceId){this.raceId=state.raceId;this.initialPhi=animal.phi;}
    if(state.raceId!==this.raceId)return;
    if(animal.seq>=0&&this.initialPhi!==undefined&&animal.phi!==this.initialPhi)this.walkDone=true;
    if(state.events.some(e=>e.type==='shot'&&e.seat===seat))this.fireDone=true;
  }
  visible(raceId:string){return this.raceId===raceId;}
}
