import type {Point,Wall} from './sweep.ts';
import type { Config } from '../shared.ts';
export const rad=(degrees:number)=>degrees*Math.PI/180;
export const wrap=(radians:number)=>Math.atan2(Math.sin(radians),Math.cos(radians));
export const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export class Course {
  segments:{x:number;y:number;tx:number;ty:number;length:number;start:number;heading:number}[]=[];
  banks:Wall[]=[];
  rocks:{x:number;y:number;radius:number;progress:number}[]=[];
  constructor(readonly config:Config){
    let x=0,y=0,start=0;
    for(const [fraction,angle]of config.course.path_sections){
      const heading=rad(angle),length=fraction*config.course.length,tx=Math.sin(heading),ty=Math.cos(heading);
      this.segments.push({x,y,tx,ty,length,start,heading});x+=tx*length;y+=ty*length;start+=length;
    }
    for(const side of [-1,1]){const points=this.bankPoints(side*config.course.half_width);for(let i=1;i<points.length;i++)this.banks.push({a:points[i-1],b:points[i],side});}
    const left=this.bankPoints(-config.course.half_width),right=this.bankPoints(config.course.half_width);
    this.banks.push({a:left[0],b:right[0],side:0},{a:left.at(-1)!,b:right.at(-1)!,side:0});
    this.rocks=config.course.rock_positions.map(([fraction,lateral,radius])=>({...this.at(fraction*config.course.length,lateral),radius,progress:fraction*config.course.length}));
  }
  /** One shared mitered outline for rendering and collision. End extensions keep the start/finish on water. */
  bankPoints(width:number):Point[]{
    const sections=this.segments,points=sections.map(s=>({x:s.x,y:s.y})),last=sections.at(-1)!;
    points.push({x:last.x+last.tx*last.length,y:last.y+last.ty*last.length});
    points[0].x-=sections[0].tx*this.config.course.bank_end_extension;points[0].y-=sections[0].ty*this.config.course.bank_end_extension;
    points.at(-1)!.x+=last.tx*this.config.course.bank_end_extension;points.at(-1)!.y+=last.ty*this.config.course.bank_end_extension;
    return points.map((p,i)=>{const a=sections[Math.max(0,i-1)],b=sections[Math.min(i,sections.length-1)],nx=a.ty+b.ty,ny=-a.tx-b.tx;
      const scale=width/(nx*b.ty-ny*b.tx);return {x:p.x+nx*scale,y:p.y+ny*scale};});
  }
  /** Render-only placement on the same mitered bank used by collision. */
  atBank(progress:number,width:number){
    const index=this.segments.findIndex(s=>progress<=s.start+s.length),i=index<0?this.segments.length-1:index,s=this.segments[i],points=this.bankPoints(width),a=points[i],b=points[i+1];
    const along=(a.x-s.x)*s.tx+(a.y-s.y)*s.ty,span=(b.x-a.x)*s.tx+(b.y-a.y)*s.ty,t=clamp((progress-s.start-along)/span,0,1);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,heading:s.heading};
  }
  at(progress:number,lateral=0){
    const s=this.segments.find(s=>progress<=s.start+s.length)??this.segments.at(-1)!;
    const d=progress-s.start;
    return {x:s.x+s.tx*d+s.ty*lateral,y:s.y+s.ty*d-s.tx*lateral,heading:s.heading};
  }
  project(x:number,y:number){
    let best={distance:Infinity,x:0,y:0,lateral:0,progress:0,heading:0,tx:0,ty:1};
    for(const s of this.segments){
      const dx=x-s.x,dy=y-s.y,d=clamp(dx*s.tx+dy*s.ty,0,s.length),cx=s.x+s.tx*d,cy=s.y+s.ty*d;
      const distance=(x-cx)**2+(y-cy)**2;
      if(distance<best.distance)best={distance,x:cx,y:cy,lateral:(x-cx)*s.ty-(y-cy)*s.tx,progress:s.start+d,heading:s.heading,tx:s.tx,ty:s.ty};
    }
    return best;
  }
}
