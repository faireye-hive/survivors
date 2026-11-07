import {drawRigActor} from './characters/RigRenderer.js';

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
  drawRigActor(c,e,x,y+float,t,{id:'monster.'+e.type});
  if(e.hp>0&&e.hp<e.maxHp){
    const w=Math.max(32,e.radius*2);
    c.fillStyle='#111d27';c.fillRect(x-w/2,y-e.radius*3.6,w,4);
    c.fillStyle=e.boss?'#f2cd7e':'#ed8b91';
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
