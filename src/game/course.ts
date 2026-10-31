import type { Config } from '../shared.ts';
export const rad=(degrees:number)=>degrees*Math.PI/180;
export const wrap=(radians:number)=>Math.atan2(Math.sin(radians),Math.cos(radians));
export const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export class Course {
  segments:{x:number;y:number;tx:number;ty:number;length:number;start:number;heading:number}[]=[];
  rocks:{x:number;y:number;radius:number;progress:number}[]=[];
  constructor(readonly config:Config){
    let x=0,y=0,start=0;
    for(const [fraction,angle]of config.course.path_sections){
      const heading=rad(angle),length=fraction*config.course.length,tx=Math.sin(heading),ty=Math.cos(heading);
      this.segments.push({x,y,tx,ty,length,start,heading});x+=tx*length;y+=ty*length;start+=length;
    }
    this.rocks=config.course.rock_positions.map(([fraction,lateral,radius])=>({...this.at(fraction*config.course.length,lateral),radius,progress:fraction*config.course.length}));
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
