/**
 * Additional enemies are hand-drawn with primitive Canvas 2D shapes.
 * No editor, imported sprites, 3D models, or extra dependencies.
 */
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function tint(color,amount){
  const match=/^#([\da-f]{6})$/i.exec(color||'');
  if(!match)return color;
  const value=Number.parseInt(match[1],16);
  return '#'+[value>>16,(value>>8)&255,value&255]
    .map(channel=>Math.round(clamp(amount>=0?channel+(255-channel)*amount:channel*(1+amount),0,255))
      .toString(16).padStart(2,'0')).join('');
}
function surface(c,color,x,y,rx,ry){
  if(rx<7||ry<8||!/^#[\da-f]{6}$/i.test(color||'')||!c.createLinearGradient)return color;
  const g=c.createLinearGradient(x-rx*.7,y-ry,x+rx*.7,y+ry);
  if(!g?.addColorStop)return color;
  g.addColorStop(0,tint(color,.3));g.addColorStop(.36,tint(color,.08));
  g.addColorStop(.75,color);g.addColorStop(1,tint(color,-.34));
  return g;
}
function ell(c,x,y,rx,ry,color,stroke='#1b2931',lineWidth=1.8){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
  c.fillStyle=surface(c,color,x,y,rx,ry);c.fill();
  if(stroke){c.lineWidth=lineWidth;c.strokeStyle=stroke;c.stroke();}
}
function line(c,points,color,width=2){
  c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);
  c.lineJoin='round';c.lineCap='round';c.lineWidth=width;
  c.strokeStyle=color;c.stroke();
}
function spider(c,e,t){
  const sway=Math.sin(t*8+e.id*.5)*3;
  const shell=e.elite?'#bb81c2':'#74549f';
  const dark=e.elite?'#614675':'#3b375a';
  // Four pairs of legs, arched sideways: no humanoid arms or feet.
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const py=-10+i*8,reach=24+(i===0||i===3?1:7);
      line(c,[[side*6,py],[side*(14+i*2),py-9+sway*(i%2?1:-1)],
        [side*reach,py+6+sway*.25]],'#222b3d',5);
      line(c,[[side*7,py],[side*(14+i*2),py-9+sway*(i%2?1:-1)],
        [side*reach,py+6+sway*.25]],dark,3);
    }
  }
  ell(c,2,-9,16,15,shell);
  ell(c,-9,-5,11,10,'#9878b2');
  ell(c,6,-14,8,5,'#cbb0d7',null);
  ell(c,-14,-10,3.2,4.5,'#f2dfbc',null);
  ell(c,-6,-10,3.2,4.5,'#f2dfbc',null);
  ell(c,-14,-10,1.5,2.8,'#2b3046',null);
  ell(c,-6,-10,1.5,2.8,'#2b3046',null);
  for(const [dx,dy] of [[-7,3],[0,4],[8,2]])ell(c,dx,dy,1.8,2.2,'#e5c9ec',null);
}
function spore(c,e,t){
  const bounce=Math.sin(t*4+e.id*.7)*1.8;
  const base=e.elite?'#c77d71':'#8c9d63';
  const shade=e.elite?'#77445a':'#4f6552';
  // Mushroom creature with a single stalk: no limbs or human skeleton.
  ell(c,0,2,13,6,'#111f24aa',null);
  ell(c,0,-9+bounce,9,20,'#ddd1a5');
  ell(c,-3,-7+bounce,4,13,'#f3e1b5',null);
  c.beginPath();
  c.moveTo(-21,-17+bounce);
  c.bezierCurveTo(-21,-40+bounce,-8,-47+bounce,0,-46+bounce);
  c.bezierCurveTo(9,-47+bounce,24,-36+bounce,22,-18+bounce);
  c.quadraticCurveTo(0,-13+bounce,-21,-17+bounce);
  c.fillStyle=surface(c,base,0,-32,22,15);c.fill();c.strokeStyle='#29382d';c.lineWidth=2;c.stroke();
  ell(c,-7,-32+bounce,4,3.1,'#e3d3a4',null);
  ell(c,6,-37+bounce,5,3.5,'#f0dfbc',null);
  ell(c,12,-24+bounce,3,2.5,'#ecdab1',null);
  ell(c,0,-19+bounce,18,4.1,shade,null);
  for(const dx of [-4,5]){
    ell(c,dx,-12+bounce,2.5,3.2,'#2d453b',null);
    ell(c,dx-.6,-13+bounce,.8,1,'#fff8e2',null);
  }
  line(c,[[-2,-4+bounce],[0,-2+bounce],[2,-4+bounce]],'#72594c',1.3);
  if(e.elite)for(let i=0;i<3;i++){
    const a=t*1.4+i*TAU/3;
    ell(c,Math.sin(a)*21,-24+Math.cos(a)*7,2.4,2.4,'#e7c89a',null);
  }
}
export function drawWildCreature(c,e,x,y,t){
  if(e.type!=='spider'&&e.type!=='spore')return false;
  c.save();
  c.translate(x,y);
  const size=e.miniBoss?1.85:e.elite?1.2:1;
  c.scale(size,size);
  c.globalAlpha*=e.hit>0?.85:1;
  if(e.elite||e.miniBoss){
    c.strokeStyle=e.miniBoss?'#7adad9bb':'#f4d79799';c.lineWidth=1.6;
    c.beginPath();c.ellipse(0,-14,35,37,0,0,TAU);c.stroke();
  }
  if(e.type==='spider')spider(c,e,t);
  else spore(c,e,t);
  c.restore();
  return true;
}
