/**
 * Canvas-only skeletal walk reference. Every drawn stroke is generated here,
 * rather than embedding or tracing an existing sprite sheet.
 */
import {getRigHandles} from '../render/characters/RigRenderer.js';
import {WALK_DIRECTIONS,walkGuidePose} from '../data/WalkGuide.js';

const TAU=Math.PI*2;
const LEFT='#80d7ed',RIGHT='#efc587',SPINE='#d6e5dd',JOINT='#edf5ed';
const get=(j,n)=>j[n];
function segment(c,a,b,color,width=2){
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
  c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.stroke();
}
function dot(c,p,color,r=1.8){
  c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.fillStyle=color;c.fill();
}
function midpoint(a,b,k=.5,offset=0){
  return {x:a.x+(b.x-a.x)*k+offset,y:a.y+(b.y-a.y)*k};
}
function skeleton(c,direction,frame){
  const j=getRigHandles(walkGuidePose(direction,frame),'hero.guardian');
  const profile=direction==='left'||direction==='right';
  const facingLeft=direction==='left';
  const body=get(j,'body'),head=get(j,'head');
  const neck=midpoint(body,head,.72);
  const pelvis={x:body.x,y:body.y+12};
  // Ground line stays at the same world Y as the rendered procedural character.
  segment(c,{x:-23,y:3},{x:23,y:3},'#8aa7a395',.8);
  c.setLineDash([2,2]);segment(c,{x:0,y:-70},{x:0,y:8},'#c8e8cb30',.6);c.setLineDash([]);
  // Opposing arms and legs make the two contact frames visually distinct.
  for(const [side,color] of [['L',LEFT],['R',RIGHT]]){
    const shoulder=get(j,'arm'+side),hand=get(j,'hand'+side);
    const bend=profile?(side==='L'?-2:2):(side==='L'?-1:1);
    const elbow=midpoint(shoulder,hand,.52,bend);
    segment(c,shoulder,elbow,color,2.5);
    segment(c,elbow,hand,color,2.5);
    dot(c,shoulder,JOINT);dot(c,elbow,color,1.7);dot(c,hand,color,2.2);
  }
  segment(c,neck,body,SPINE,3.3);
  segment(c,get(j,'armL'),get(j,'armR'),SPINE,2.7);
  segment(c,get(j,'legL'),get(j,'legR'),SPINE,2.4);
  segment(c,body,pelvis,SPINE,3);
  for(const [side,color] of [['L',LEFT],['R',RIGHT]]){
    const hip=get(j,'leg'+side),foot=get(j,'foot'+side);
    const knee=midpoint(hip,foot,.55,profile?(side==='L'?-2:2):0);
    segment(c,hip,knee,color,3);
    segment(c,knee,foot,color,3);
    dot(c,hip,JOINT);dot(c,knee,color,2);dot(c,foot,color,2.5);
    const toe=direction==='left'?-4:direction==='right'?4:side==='L'?-2:2;
    segment(c,foot,{x:foot.x+toe,y:foot.y+1},color,2);
  }
  // Front/back/side silhouettes are distinct and match the chosen direction.
  c.beginPath();
  c.ellipse(head.x,head.y,profile?7:8,profile?9:9,0,0,TAU);
  c.fillStyle=direction==='back'?'#678c92':'#94bbbf';c.fill();
  c.lineWidth=1.7;c.strokeStyle=SPINE;c.stroke();
  if(direction==='front'){
    dot(c,{x:head.x-3,y:head.y-1},'#182e39',1.3);
    dot(c,{x:head.x+3,y:head.y-1},'#182e39',1.3);
    segment(c,{x:head.x-2,y:head.y+4},{x:head.x+2,y:head.y+4},'#182e39',1);
  }else if(direction==='back'){
    c.beginPath();c.arc(head.x,head.y,6.5,Math.PI*1.03,Math.PI*1.96);
    c.strokeStyle='#274450';c.lineWidth=2.2;c.stroke();
  }else{
    const sign=facingLeft?-1:1;
    segment(c,{x:head.x+sign*6,y:head.y-1},{x:head.x+sign*10,y:head.y+1},SPINE,2);
    dot(c,{x:head.x+sign*4,y:head.y-2},'#152f3b',1.2);
  }
}
export function drawWalkReference(c,direction,frame,x,y,scale=1,opacity=1){
  if(!WALK_DIRECTIONS.includes(direction)||!Number.isInteger(frame)||frame<0||frame>3)
    throw Error('Referência de caminhada desconhecida');
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(scale)||scale<=0)
    throw Error('Parâmetros da referência inválidos');
  c.save();
  c.translate(x,y);
  c.scale(scale*(direction==='left'?-1:1),scale);
  c.globalAlpha*=Math.max(0,Math.min(1,opacity));
  skeleton(c,direction,frame);
  c.restore();
}
