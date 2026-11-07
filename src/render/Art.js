import { drawWarrior } from './characters/Warrior.js';
// Artes dos personagens, inimigos e itens: 100% Canvas 2D, sem PNG/SVG.
const PI2=Math.PI*2;
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,PI2);c.fill();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,PI2);c.fill();}
function polygon(c,points,color){c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);for(const pt of points.slice(1))c.lineTo(...pt);c.closePath();c.fill();}
function line(c,pts,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.stroke();}
export function drawPlayer(c,p,x,y,t,options={}){
  // Guardião desenhado com o rig vetorial de alta definição, isolado por personagem.
  if(p.classId==='guardian')return drawWarrior(c,p,x,y,t,{scale:.46,...options});
  if(p.inv>0&&Math.floor(t*14)%2===0)return;
  c.save();c.translate(x,y);
  const back=options.face==='back'||(options.face!=='front'&&Math.sin(p.facing||0)<-.55);
  const mirror=options.face==='left'||(options.face!=='right'&&p.vx< -8);
  if(mirror)c.scale(-1,1);
  const step=Math.sin(t*11)*Math.min(1,Math.hypot(p.vx,p.vy)/90);
  oval(c,0,7,22,8,'#06121bb5');
  line(c,[[-7,-7],[-8+step*4,11]],'#394b4b',9);line(c,[[7,-7],[8-step*4,11]],'#394b4b',9);
  polygon(c,[[-14,-25],[-20+step*3,5],[0,7],[20-step*3,5],[14,-25]],p.classId==='mage'?'#3d4e80':p.classId==='ranger'?'#285c48':'#71484d');
  oval(c,0,-21,16,18,p.classId==='mage'?'#596da8':p.classId==='ranger'?'#4d8469':'#9aa9a0');
  polygon(c,[[-10,-34],[0,-26],[10,-34],[7,-9],[0,-5],[-7,-9]],p.classId==='mage'?'#2d467e':p.classId==='ranger'?'#244d42':'#d8d8bb');
  oval(c,-15,-19,7,10,'#8fa7a2');oval(c,15,-19,7,10,'#8fa7a2');
  circle(c,0,-41,13,back?'#393f4b':'#c69a7c');
  polygon(c,[[-13,-42],[-10,-53],[3,-56],[12,-49],[13,-41],[4,-49],[-4,-45]],p.classId==='mage'?'#d2ccdf':'#42342f');
  if(back){
    oval(c,0,-41,10,9,p.classId==='mage'?'#756b93':'#324b3e');
    line(c,[[-11,-36],[10,-36]],'#879e95',1.5);
  }else{
    line(c,[[-7,-41],[-3,-41]],'#183b39',2);line(c,[[4,-41],[8,-41]],'#183b39',2);
    circle(c,-4,-41,1.5,'#d9f6e8');circle(c,6,-41,1.5,'#d9f6e8');
  }
  circle(c,0,-20,3,'#f0cf85');
  if(p.classId==='mage'){
    line(c,[[18,-12],[21,-60]],'#886c55',5);
    circle(c,21,-62,10,'#74c3e988');circle(c,21,-62,5,'#dff7ff');
  }else if(p.classId==='ranger'){
    line(c,[[16,-13],[32,-46]],'#e3dcc7',4);
    polygon(c,[[32,-52],[35,-42],[26,-40]],'#99e6b1');
    line(c,[[-17,-14],[-22,-8]],'#d2c6a6',4);
  }else{
    line(c,[[17,-15],[28,-41]],'#846f59',5);line(c,[[28,-41],[38,-63]],'#e3f6ed',6);
    line(c,[[24,-41],[35,-36]],'#e7bd6c',5);
    oval(c,-19,-13,11,15,'#8d9c98');oval(c,-19,-13,7,11,'#386f69');
    line(c,[[-19,-21],[-19,-5]],'#d5c28b',2);
  }
  c.restore();
}
export function drawEnemy(c,e,x,y,t){
  c.save();c.translate(x,y+Math.sin(t*(e.type==='bat'?9:3)+e.id)*2);
  if(e.hit>0)c.globalAlpha=.75;
  oval(c,0,7,e.radius+6,7,'#030c13a0');
  if(e.type==='slime'){
    oval(c,0,-8,18,16,'#3f8a77');oval(c,-3,-13,14,12,'#81c6ae');
    oval(c,-6,-12,4,5,'#142b2c');oval(c,7,-12,4,5,'#142b2c');
    circle(c,-5,-14,1.5,'#fff');circle(c,8,-14,1.5,'#fff');
    line(c,[[-3,-4],[5,-4]],'#296357',2);oval(c,-7,-21,5,2,'#e0ffe280');
  }else if(e.type==='bat'){
    polygon(c,[[-5,-14],[-35,-25],[-25,-5],[-16,-10],[-9,2]],'#80719d');
    polygon(c,[[5,-14],[35,-25],[25,-5],[16,-10],[9,2]],'#80719d');
    oval(c,0,-12,13,14,'#564664');
    polygon(c,[[-10,-20],[-13,-33],[0,-24],[13,-33],[10,-20]],'#8a7ca4');
    circle(c,-5,-15,3,'#ff9aad');circle(c,6,-15,3,'#ff9aad');
  }else if(e.type==='skeleton'){
    line(c,[[-8,-19],[-13,8]],'#e2ddc9',6);line(c,[[8,-19],[13,8]],'#e2ddc9',6);
    line(c,[[-13,-25],[-21,-9]],'#d8d7c6',5);line(c,[[13,-25],[21,-9]],'#d8d7c6',5);
    oval(c,0,-21,13,16,'#e1dfc9');
    for(let i=0;i<3;i++)line(c,[[-9,-27+i*6],[9,-27+i*6]],'#7f8176',2);
    circle(c,0,-44,14,'#e8e1c9');oval(c,-5,-45,4,5,'#202a30');oval(c,6,-45,4,5,'#202a30');
    polygon(c,[[-2,-38],[1,-42],[4,-38]],'#51605c');line(c,[[-7,-34],[7,-34]],'#727b6e',2);
  }else if(e.type==='wraith'){
    polygon(c,[[-15,4],[-20,-32],[-12,-45],[12,-45],[20,-32],[15,4],[6,-5],[0,5],[-6,-5]],'#427e91');
    polygon(c,[[-12,-30],[-9,-47],[0,-56],[9,-47],[12,-30]],'#a8d8d6b0');
    oval(c,0,-36,10,12,'#0c2132');oval(c,-4,-37,3,2,'#a3fff4');oval(c,5,-37,3,2,'#a3fff4');
    line(c,[[-16,-29],[-26,-13]],'#93d9df',5);line(c,[[16,-29],[26,-13]],'#93d9df',5);
  }else{
    c.scale(1.2,1.2);
    polygon(c,[[-26,-15],[-34,-7],[-26,5],[28,5],[34,-18],[22,-34],[-20,-34]],'#566f6c');
    polygon(c,[[-24,-36],[-27,-58],[-13,-71],[1,-63],[16,-71],[27,-56],[24,-36]],'#968d77');
    polygon(c,[[-12,-57],[12,-57],[11,-41],[-11,-41]],'#1a2933');
    circle(c,-5,-49,3,'#ffe1a2');circle(c,6,-49,3,'#ffe1a2');
    polygon(c,[[-25,-58],[-40,-77],[-17,-67]],'#e0b87c');
    polygon(c,[[25,-58],[40,-77],[17,-67]],'#e0b87c');
    circle(c,0,-20,8,'#e6b66c');
    line(c,[[-30,-16],[-38,10]],'#a89e8b',11);line(c,[[30,-16],[38,10]],'#a89e8b',11);
  }
  if(e.hp>0&&e.hp<e.maxHp){
    const w=Math.max(30,e.radius*2);
    c.fillStyle='#111d27';c.fillRect(-w/2,-e.radius*3.8,w,4);
    c.fillStyle=e.boss?'#f2cd7e':'#ed8b91';c.fillRect(-w/2,-e.radius*3.8,w*Math.max(0,e.hp/e.maxHp),4);
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
