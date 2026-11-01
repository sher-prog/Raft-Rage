/** Fixed UX contract: name reclaim retries once a second, for at most six seconds. */
export class JoinRetry {
  deadline=0;timer:ReturnType<typeof setTimeout>|undefined;
  request:()=>void;expired:()=>void;
  constructor(request:()=>void,expired:()=>void){this.request=request;this.expired=expired;}
  waiting(){
    if(!this.deadline)this.deadline=Date.now()+6000;
    clearTimeout(this.timer);
    const remaining=this.deadline-Date.now();
    if(remaining<=0){this.cancel();this.expired();return;}
    this.timer=setTimeout(()=>this.request(),Math.min(1000,remaining));
  }
  cancel(){clearTimeout(this.timer);this.timer=undefined;this.deadline=0;}
}
