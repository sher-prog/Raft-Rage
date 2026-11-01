/** Phones with touch still need the pad when their primary pointer reports fine. */
export function useTouchPad(width:number,maxTouchPoints:number,coarse:boolean){return width<=780&&(maxTouchPoints>0||coarse);}
