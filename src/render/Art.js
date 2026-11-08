import {drawRigActor} from './characters/RigRenderer.js';
import {drawWildCreature} from './characters/WildCreatures.js';

// Shared Canvas 2D art style: heroes and monsters use the same articulated rig.
const PI2=Math.PI*2;
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,PI2);c.fill();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,PI2);c.fill();}
function polygon(c,points,color){c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);for(const pt of points.slice(1))c.lineTo(...pt);c.closePath();c.fill();}
function line(c,pts,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.stroke();}
export function drawPlayer(c,p,x,y,t,options={}){
  return drawRigActor(c,p,x,y,t,{...options,id:'hero.'+p.classId});
}
export function drawEnemy(c,e,x,y,t){
  c.save();
  const float=e.type==='bat'||e.type==='wraith'?Math.sin(t*7+e.id)*3:Math.sin(t*3+e.id)*1.2;
  if(!drawWildCreature(c,e,x,y+float,t)){
    drawRigActor(c,e,x,y+float,t,{
      id:'monster.'+e.type,
      scale:e.miniBoss?1.85:e.boss?1.23:e.elite?1.2:1
    });
  }
  if((e.boss||e.miniBoss)&&e.rushWarmup>0){
    // Amber focus ring telegraphs the upcoming lunge. The center arrow
    // points along the boss's current facing direction.
    const q=Math.max(0,Math.min(1,e.rushWarmup/(e.miniBoss?.55:.7)));
    c.strokeStyle='#ffe3a3';c.lineWidth=2.4+Math.sin(t*20)*.55;
    c.setLineDash([8,5]);
    c.beginPath();c.arc(x,y,e.radius*(1.2+(1-q)*.5),0,PI2);c.stroke();
    c.setLineDash([]);
    c.fillStyle='#f9cc8399';
    c.beginPath();c.arc(x,y-e.radius*3.25,4+(1-q)*3,0,PI2);c.fill();
  }
  if((e.boss||e.miniBoss)&&e.rushTime>0){
    c.strokeStyle='#ffdca37a';c.lineWidth=3;
    c.beginPath();c.arc(x,y,e.radius*1.4,0,PI2);c.stroke();
  }
  if(e.boss&&e.novaWarmup>0){
    // Radial volley wind-up: two rings warn before the projectiles launch.
    const pulse=1-e.novaWarmup/.85;
    c.strokeStyle='#f2b9e7';c.lineWidth=2.6;
    for(const size of [1.35,1.95]){
      c.beginPath();c.arc(x,y,e.radius*(size+pulse*.32),0,PI2);c.stroke();
    }
  }
  if(e.miniBoss){
    c.strokeStyle='#8bdcdbbb';c.lineWidth=2.3;
    c.beginPath();c.ellipse(x,y-15,e.radius*1.24,e.radius*1.48,0,0,PI2);c.stroke();
  }
  if(e.elite){
    c.strokeStyle='#e8c88588';c.lineWidth=1.5;
    c.beginPath();c.ellipse(x,y-19,e.radius*1.9,e.radius*2.5,0,0,PI2);c.stroke();
  }
  if(e.hp>0&&(e.hp<e.maxHp||e.miniBoss)){
    const w=Math.max(32,e.radius*2);
    c.fillStyle='#111d27';c.fillRect(x-w/2,y-e.radius*3.6,w,4);
    c.fillStyle=e.boss?'#f2cd7e':e.miniBoss?'#77dfd5':e.elite?'#f5d196':'#ed8b91';
    c.fillRect(x-w/2,y-e.radius*3.6,w*Math.max(0,e.hp/e.maxHp),4);
  }
  c.restore();
}
export function drawDrop(c,d,x,y,t){
  c.save();c.translate(x,y+Math.sin(t*4+d.x*.1)*3);
  oval(c,0,8,11,5,'#08131b88');
  if(d.kind==='heal'){
    circle(c,0,-6,11,'#ba657b');circle(c,-4,-10,4,'#eab3c2');
    line(c,[[-5,-6],[5,-6]],'#fff4e8',3);line(c,[[0,-11],[0,-1]],'#fff4e8',3);
  }else if(d.kind==='relic'){
    circle(c,0,-9,15,'#8e6d3f88');
    const points=Array.from({length:10},(_,i)=>{
      const a=i*Math.PI/5-Math.PI/2,r=i%2?6:13;
      return [Math.cos(a)*r,Math.sin(a)*r-9];
    });
    polygon(c,points,'#f1c67e');
    polygon(c,points.map(([px,py])=>[px*.57,py*.62-3.5]),'#fff3c6');
    circle(c,-2,-13,2,'#ffffff');
  }else{
    c.scale(d.value>30?1.3:1,d.value>30?1.3:1);
    polygon(c,[[0,-19],[8,-8],[5,4],[-5,4],[-8,-8]],'#47bccc');
    polygon(c,[[0,-19],[8,-8],[0,2]],'#a7f7ea');line(c,[[0,-19],[0,2]],'#e9ffff',1);
  }c.restore();
}
export function drawProjectile(c,p,x,y){
  c.save();c.translate(x,y);c.rotate(Math.atan2(p.vy,p.vx));
  if(p.kind==='dagger'){
    oval(c,-12,0,16,4,'#aae6c055');polygon(c,[[18,0],[-2,-5],[-7,0],[-2,5]],'#eff8dc');
    line(c,[[-8,0],[-15,0]],'#d9b783',4);
  }else{
    oval(c,-12,0,20,8,'#7bdaee55');circle(c,0,0,10,'#5bbcf3b0');
    circle(c,0,0,6,'#b1ebfd');circle(c,0,0,3,'#fff');
  }c.restore();
}
export function drawEffect(c,fx,x,y){
  const f=Math.max(0,fx.life/fx.duration);c.save();c.translate(x,y);c.globalAlpha=f;
  if(fx.kind==='slash'){
    c.rotate(fx.angle);
    c.strokeStyle='#f3dda1';c.lineWidth=11*f;c.beginPath();c.arc(0,0,fx.radius,-.9,.9);c.stroke();
    c.strokeStyle='#fffbe6';c.lineWidth=3*f;c.beginPath();c.arc(0,0,fx.radius+4,-.8,.8);c.stroke();
  }else if(fx.kind==='aura'){
    c.strokeStyle='#8affdb';c.lineWidth=6*f;c.beginPath();c.arc(0,0,fx.radius*(1.25-f*.25),0,PI2);c.stroke();
    c.strokeStyle='#d4c5f9';c.lineWidth=2*f;c.beginPath();c.arc(0,0,fx.radius*.7,0,PI2);c.stroke();
  }c.restore();
}

/** Spore pools telegraph before dealing damage. Draw behind enemies. */
export function drawHazard(c,h,x,y,t=0){
  if(h.life<=0)return;
  const warning=h.warmup>0;
  const opacity=warning?.22+.12*Math.sin(t*12):.32+.08*Math.sin(t*5);
  c.save();c.translate(x,y);
  c.globalAlpha=Math.max(.08,Math.min(.52,opacity));
  c.fillStyle=warning?'#d8c180':'#a3cc78';
  c.beginPath();c.ellipse(0,0,h.radius,h.radius*.65,0,0,PI2);c.fill();
  c.globalAlpha=warning?.85:.66;
  c.strokeStyle=warning?'#ffe29d':'#d4ef9f';
  c.lineWidth=warning?2:3;
  c.setLineDash(warning?[6,5]:[]);
  c.beginPath();c.ellipse(0,0,h.radius,h.radius*.65,0,0,PI2);c.stroke();
  c.setLineDash([]);
  if(!warning){
    for(let i=0;i<7;i++){
      const a=i*PI2/7+t*.8;
      circle(c,Math.cos(a)*h.radius*.72,Math.sin(a)*h.radius*.38-4,
        2+(i%3),'#dcf4ab');
    }
  }
  c.restore();
}

/** Enemy radial magic projectiles; never confused with the hero's shots. */
export function drawEnemyShot(c,shot,x,y,t){
  c.save();c.translate(x,y);
  const r=shot.radius||7;
  const glow=.6+Math.sin(t*12+x*.05)*.2;
  c.globalAlpha=glow;
  oval(c,0,0,r*2,r*2,'#ce72d866');
  c.globalAlpha=1;
  circle(c,0,0,r,'#e5a0e9');
  circle(c,-r*.2,-r*.25,r*.48,'#fff0ff');
  c.restore();
}
