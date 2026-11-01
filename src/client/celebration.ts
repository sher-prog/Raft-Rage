import type {Config} from '../shared.ts';
type Piece={x:number;y:number;vx:number;vy:number;angle:number;spin:number;size:number;color:string;shape:number};
/** Screen-space confetti gives the existing win celebration the whole viewport. */
export class VictoryCelebration {
 canvas:HTMLCanvasElement|undefined;context:CanvasRenderingContext2D|undefined;pieces:Piece[]=[];remaining=0;width=0;height=0;drawCount=0;
 constructor(readonly config:Config){}
 resize(){if(!this.canvas||!this.context)return;this.width=innerWidth;this.height=innerHeight;const ratio=Math.min(devicePixelRatio,this.config.visuals.max_pixel_ratio);this.canvas.width=Math.ceil(this.width*ratio);this.canvas.height=Math.ceil(this.height*ratio);this.context.setTransform(ratio,0,0,ratio,0,0);}
 start(low:boolean){
  this.dispose();const v=this.config.visuals,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
  canvas.className='victory-confetti';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);this.canvas=canvas;this.context=ctx;this.remaining=v.celebration_duration_s;this.resize();
  const count=Math.min(v.max_particles,low?Math.ceil(v.celebration_pieces/3):v.celebration_pieces);
  for(let n=0;n<count;n++)this.pieces.push({x:Math.random()*this.width,y:Math.random()*this.height,vx:(Math.random()-.5)*v.celebration_fall_px_s,vy:v.celebration_fall_px_s*(.5+Math.random()),angle:Math.random()*Math.PI,spin:(Math.random()-.5)*6,size:v.confetti_size*(2+Math.random()*3),color:v.confetti_colors[n%v.confetti_colors.length],shape:n%3});
 }
 update(dt:number,reduced:boolean,budget:number){
  if(!this.canvas||!this.context)return;this.remaining-=dt;if(this.remaining<=0){this.dispose();return;}if(this.width!==innerWidth||this.height!==innerHeight)this.resize();
  const ctx=this.context;ctx.clearRect(0,0,this.width,this.height);ctx.globalAlpha=Math.min(1,this.remaining/.6);this.drawCount=Math.min(this.pieces.length,Math.max(0,Math.floor(budget)));
  for(let n=0;n<this.pieces.length;n++){const p=this.pieces[n];if(!reduced){p.x=(p.x+p.vx*dt+this.width)%this.width;p.y+=p.vy*dt;if(p.y>this.height+p.size)p.y=-p.size;p.angle+=p.spin*dt;}if(n>=this.drawCount)continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;ctx.lineWidth=3;
   if(p.shape===0)ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
   else if(p.shape===1){ctx.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5,r=p.size*(k%2?.25:.55);if(k===0)ctx.moveTo(Math.sin(a)*r,Math.cos(a)*r);else ctx.lineTo(Math.sin(a)*r,Math.cos(a)*r);}ctx.closePath();ctx.fill();}
   else{ctx.beginPath();ctx.moveTo(-p.size/2,-p.size);ctx.bezierCurveTo(p.size,-p.size/2,-p.size,p.size/2,p.size/2,p.size);ctx.stroke();}ctx.restore();
  }
 }
 dispose(){this.canvas?.remove();this.canvas=undefined;this.context=undefined;this.pieces=[];this.remaining=0;this.drawCount=0;}
}
