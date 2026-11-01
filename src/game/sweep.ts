export type Point={x:number;y:number};
export type Wall={a:Point;b:Point;side:number;padding?:number};
export type Contact={time:number;nx:number;ny:number;side:number};
/** Earliest contact along a displacement; finite segments include rounded endcaps. */
export function sweepCircle(p:Point,dx:number,dy:number,radius:number,walls:Wall[],circles:{x:number;y:number;radius:number}[],epsilon:number):Contact|undefined{
  let best:Contact|undefined;
  const minX=Math.min(p.x,p.x+dx)-radius,maxX=Math.max(p.x,p.x+dx)+radius,minY=Math.min(p.y,p.y+dy)-radius,maxY=Math.max(p.y,p.y+dy)+radius;
  const offer=(time:number,nx:number,ny:number,side:number)=>{
    if(time< -epsilon||time>1||dx*nx+dy*ny>=-epsilon)return;
    if(!best||time<best.time)best={time:Math.max(0,time),nx,ny,side};
  };
  const circle=(center:Point,r:number,side:number)=>{
    const x=p.x-center.x,y=p.y-center.y,a=dx*dx+dy*dy;if(a<=epsilon*epsilon)return;
    const b=x*dx+y*dy,c=x*x+y*y-r*r,disc=b*b-a*c;if(disc<0)return;
    const time=(-b-Math.sqrt(disc))/a,hx=x+dx*time,hy=y+dy*time,d=Math.hypot(hx,hy);
    if(d>epsilon)offer(time,hx/d,hy/d,side);
  };
  for(const wall of walls){
    const padding=wall.padding??0,wallRadius=radius+padding;
    if(maxX<Math.min(wall.a.x,wall.b.x)-padding||minX>Math.max(wall.a.x,wall.b.x)+padding||maxY<Math.min(wall.a.y,wall.b.y)-padding||minY>Math.max(wall.a.y,wall.b.y)+padding)continue;
    const ex=wall.b.x-wall.a.x,ey=wall.b.y-wall.a.y,length=Math.hypot(ex,ey),tx=ex/length,ty=ey/length;
    const normalX=-ty,normalY=tx,distance=(p.x-wall.a.x)*normalX+(p.y-wall.a.y)*normalY,normalMove=dx*normalX+dy*normalY;
    if(Math.abs(normalMove)>epsilon)for(const sign of [-1,1]){
      const time=(sign*wallRadius-distance)/normalMove,along=(p.x+dx*time-wall.a.x)*tx+(p.y+dy*time-wall.a.y)*ty;
      if(along>=0&&along<=length)offer(time,normalX*sign,normalY*sign,wall.side);
    }
    circle(wall.a,wallRadius,wall.side);circle(wall.b,wallRadius,wall.side);
  }
  for(const obstacle of circles){
    if(maxX<obstacle.x-obstacle.radius||minX>obstacle.x+obstacle.radius||maxY<obstacle.y-obstacle.radius||minY>obstacle.y+obstacle.radius)continue;
    circle(obstacle,radius+obstacle.radius,0);
  }
  return best;
}
