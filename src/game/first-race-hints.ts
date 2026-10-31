import type {Snapshot} from '../shared.ts';

/** Visit-local teaching: spectators do not consume their first playable race. */
export class FirstRaceHints {
  raceId='';walkDone=false;fireDone=false;initialPhi:number|undefined;
  observe(state:Snapshot,seat:number|null|undefined){
    if(seat===null||seat===undefined||state.phase==='results')return;
    const animal=state.animals.find(a=>a.seat===seat);if(!animal)return;
    if(!this.raceId){this.raceId=state.raceId;this.initialPhi=animal.phi;}
    if(state.raceId!==this.raceId)return;
    // +180 and -180 are the same stern position, not a walking action.
    if(animal.seq>=0&&this.initialPhi!==undefined&&((animal.phi-this.initialPhi+180)%360+360)%360-180!==0)this.walkDone=true;
    if(state.events.some(e=>e.type==='shot'&&e.seat===seat))this.fireDone=true;
  }
  visible(raceId:string){return this.raceId===raceId;}
}
