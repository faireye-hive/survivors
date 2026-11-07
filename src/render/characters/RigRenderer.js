import {NODES, RIG_PRESETS, RIG_IDS, newCharacter, readRigProject,
  characterIdForActor, sampleCharacter, findClip, visibleRigNodes, rigNodeDefinition, boundedRigValue} from '../../data/Rig2D.js';
import {actorWalkDirection,resolveWalkAction} from '../../data/WalkGuide.js';

const TAU=Math.PI*2,DEG=Math.PI/180;
const project=readRigProject();
const definitions=new Map(project.characters.map(item=>[item.id,item]));
for(const id of RIG_IDS)if(!definitions.has(id))definitions.set(id,newCharacter(id));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

/** Calculate the same nested joint positions used by rendering and picking. */
export function getRigHandles(pose={},characterOrTemplate='hero.guardian'){
  const result={};
  const visible=visibleRigNodes(characterOrTemplate);
  const visit=id=>{
    if(result[id])return result[id];
    const node=rigNodeDefinition(id,characterOrTemplate),part=pose[id]||{};
    const parent=node.parent?visit(node.parent):{x:0,y:0,rotation:0,scale:1};
    const angle=parent.rotation,scale=parent.scale;
    const px=(node.x+boundedRigValue(id,'x',part.x||0))*scale;
    const py=(node.y+boundedRigValue(id,'y',part.y||0))*scale;
    const cos=Math.cos(angle),sin=Math.sin(angle);
    return result[id]={
      x:parent.x+px*cos-py*sin,y:parent.y+px*sin+py*cos,
      rotation:angle+(part.rotation||0)*DEG,
      scale:scale*(part.scale??1)
    };
  };
  for(const id of visible)visit(id);
  return result;
}
function ell(c,x,y,rx,ry,fill,stroke=null,width=1){
  c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}
}
function path(c,points,fill,stroke=null,width=1){
  c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);
  c.closePath();if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function stroke(c,points,color,width){
  c.beginPath();c.moveTo(...points[0]);for(const xy of points.slice(1))c.lineTo(...xy);
  c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
}
function at(c,joints,id,fn){
  const j=joints[id];
  c.save();c.translate(j.x,j.y);c.rotate(j.rotation);c.scale(j.scale,j.scale);
  fn();c.restore();
}
function body(c,shape,pal){
  const O=pal.outline,S=pal.secondary,P=pal.primary,A=pal.accent;
  if(shape==='slime'){
    c.beginPath();c.moveTo(-18,15);c.bezierCurveTo(-28,-8,-16,-29,0,-31);
    c.bezierCurveTo(18,-32,28,-8,18,15);c.quadraticCurveTo(0,21,-18,15);
    c.fillStyle=P;c.fill();c.strokeStyle=O;c.lineWidth=2.2;c.stroke();
    ell(c,-7,-13,8,6,A);ell(c,8,8,9,4,S);
  }else if(shape==='bat'){
    ell(c,0,0,12,18,P,O,2);ell(c,0,4,7,9,S);
  }else if(shape==='skeleton'){
    ell(c,0,-2,12,17,S,O,2);
    stroke(c,[[-9,-10],[9,-10]],P,3);stroke(c,[[-11,-4],[11,-4]],P,3);
    stroke(c,[[-10,2],[10,2]],P,3);stroke(c,[[0,-13],[0,12]],O,2);
  }else if(shape==='wraith'){
    path(c,[[-14,-16],[14,-16],[18,18],[9,12],[2,21],[-6,13],[-17,20]],P,O,2);
    path(c,[[-7,-10],[7,-10],[10,17],[0,9],[-10,17]],S,null);
  }else if(shape==='colossus'){
    path(c,[[-21,-17],[21,-17],[18,18],[-18,18]],S,O,2.4);
    ell(c,0,-3,20,19,P,O,2);ell(c,0,-2,9,11,S,A,1.5);
    ell(c,0,-5,4,6,A);
  }else{
    // Same silhouette language for ALL three heroes.
    path(c,[[-13,-14],[13,-14],[19,20],[4,16],[-4,16],[-19,20]],S,O,2.3);
    ell(c,0,-2,15,20,P,O,2.2);
    path(c,[[-11,-10],[0,-4],[11,-10],[9,13],[0,17],[-9,13]],S,A,1.5);
    ell(c,0,0,4,5,A,O,.8);
    stroke(c,[[-11,7],[11,7]],A,2);
  }
}
function limb(c,shape,pal,side,leg){
  const O=pal.outline,P=pal.primary,S=pal.secondary;
  if(shape==='slime'){
    ell(c,0,11,leg?6:5,leg?6:8,P,O,1.7);return;
  }
  if(shape==='bat'&&!leg){
    path(c,[[0,0],[side*18,-8],[side*31,-18],[side*27,-1],
      [side*20,-4],[side*12,9]],P,O,2);
    stroke(c,[[0,1],[side*31,-18]],S,2);return;
  }
  if(shape==='wraith'){
    if(!leg){
      path(c,[[0,0],[side*7,9],[side*17,14],[side*14,20],
        [side*4,16],[-side*3,7]],P,O,1.7);
      stroke(c,[[side*2,4],[side*14,15]],pal.accent,1.4);
    }
    return;
  }
  if(shape==='colossus'){
    const length=leg?19:22;
    path(c,[[-6,0],[6,0],[side*9,length*.6],[side*6,length],
      [-side*5,length],[-side*9,length*.6]],P,O,2.1);
    stroke(c,[[-4,6],[3,length*.52],[side*2,length-3]],S,2);
    return;
  }
  const thickness=shape==='colossus'?11:shape==='skeleton'?5:8;
  stroke(c,[[0,1],[side*(leg?1:2),leg?16:17]],O,thickness+3);
  stroke(c,[[0,1],[side*(leg?1:2),leg?16:17]],shape==='skeleton'?pal.skin:P,thickness);
  ell(c,side*2,6,4,4,S);
}
function foot(c,shape,pal){
  if(shape==='slime'||shape==='wraith'||shape==='bat'||shape==='colossus')return;
  ell(c,2,0,shape==='colossus'?12:8,shape==='colossus'?6:5,
    shape==='skeleton'?pal.skin:pal.secondary,pal.outline,1.5);
  stroke(c,[[-2,-1],[5,-1]],pal.accent,1.2);
}
function hand(c,shape,pal){
  if(shape==='slime'||shape==='wraith'||shape==='bat'||shape==='colossus')return;
  ell(c,0,0,shape==='colossus'?7:5,shape==='colossus'?8:6,
    shape==='skeleton'?pal.skin:pal.primary,pal.outline,1.4);
  for(let i=-1;i<=1;i++)stroke(c,[[i*2,3],[i*2,7]],pal.skin,1.1);
}
function head(c,shape,pal,back){
  const O=pal.outline,P=pal.primary,S=pal.secondary,A=pal.accent;
  if(shape==='slime'){
    ell(c,0,0,15,13,P,O,2);ell(c,-5,-4,5,3,A);return;
  }
  if(shape==='bat'){
    path(c,[[-12,-6],[-16,-21],[-3,-13],[3,-13],[16,-21],[12,-6]],S,O,2);
    ell(c,0,0,13,12,P,O,2);return;
  }
  if(shape==='skeleton'){
    ell(c,0,-1,14,14,pal.skin,O,2);
    path(c,[[-5,9],[5,9],[4,15],[-4,15]],pal.skin,O,1.5);return;
  }
  if(shape==='wraith'){
    path(c,[[-15,6],[-13,-10],[0,-19],[13,-10],[15,6],[7,15],[-7,15]],P,O,2);
    ell(c,0,1,10,11,back?S:'#193b49');return;
  }
  if(shape==='colossus'){
    ell(c,0,0,15,15,S,O,2);
    path(c,[[-16,-4],[-21,-16],[-12,-13],[-4,-17],[4,-17],[12,-13],[21,-16],[16,-4]],P,O,2);
    path(c,[[-11,-7],[11,-7],[10,9],[-10,9]],S,A,1.5);return;
  }
  ell(c,0,0,13.5,14,pal.skin,O,2);
  if(shape==='guardian'){
    path(c,[[-14,-4],[-13,-14],[-8,-18],[8,-18],[13,-14],[14,-4],[9,-2],[7,-11],[-7,-11],[-9,-2]],
      P,O,2);
    path(c,[[-4,-18],[0,-23],[4,-18],[2,-10],[-2,-10]],A,O,1.5);
    path(c,[[-13,-2],[-11,10],[-7,11],[-7,-2]],S,O,1.3);
    path(c,[[13,-2],[11,10],[7,11],[7,-2]],S,O,1.3);
  }else if(shape==='mage'){
    path(c,[[-15,8],[-18,-5],[-10,-18],[0,-23],[11,-18],[18,-5],[15,8],[10,2],[8,-8],[-8,-8],[-10,2]],
      P,O,2.1);
    path(c,[[-10,-11],[0,-21],[10,-11]],null,A,1);
  }else{
    path(c,[[-15,9],[-17,-5],[-7,-18],[4,-20],[15,-11],[16,9],[10,1],[9,-9],[-10,-9],[-10,3]],
      S,O,2);
    path(c,[[-9,-10],[4,-14],[10,-7],[-4,-5]],P,null);
  }
  if(back){
    ell(c,0,3,9,7,S);
    stroke(c,[[-8,6],[8,6]],A,1.6);
  }
}
function eye(c,shape,pal){
  const size=shape==='colossus'?3.7:shape==='slime'?3.6:2.5;
  ell(c,0,0,size,size*(shape==='slime'?1.2:1),pal.eyes);
  if(shape==='bat'||shape==='wraith'||shape==='colossus')ell(c,0,0,size*.52,size*.6,pal.accent);
  else ell(c,-.65,-1,1,1,'#ffffff');
}
function mouth(c,shape,pal){
  c.beginPath();c.moveTo(-3,0);c.quadraticCurveTo(0,shape==='skeleton'?-2:3,3,0);
  c.lineCap='round';c.lineWidth=1.5;c.strokeStyle=pal.outline;c.stroke();
  if(shape==='skeleton')stroke(c,[[-3,2],[3,2]],pal.outline,1);
}
function weapon(c,shape,pal){
  const O=pal.outline,A=pal.accent,M=pal.metal;
  if(shape==='guardian'){
    stroke(c,[[0,5],[0,-27]],O,6);stroke(c,[[0,-4],[0,-30]],M,4);
    path(c,[[-4,-25],[0,-35],[4,-25]],M,O,1.2);
    stroke(c,[[-9,-3],[9,-3]],A,4);ell(c,0,8,3,3,A);
  }else if(shape==='mage'){
    stroke(c,[[0,9],[0,-32]],O,6);stroke(c,[[0,8],[0,-32]],'#a47d63',4);
    ell(c,0,-36,8,9,A,M,1.5);ell(c,-2,-38,3,3,'#f3ffff');
  }else if(shape==='ranger'||shape==='skeleton'){
    stroke(c,[[0,6],[0,-11]],O,4);
    path(c,[[-4,-9],[0,-23],[4,-9]],M,O,1.4);
    stroke(c,[[-6,-7],[6,-7]],A,2.5);
  }else if(shape==='colossus'){
    stroke(c,[[0,10],[0,-28]],O,9);stroke(c,[[0,10],[0,-28]],SColor(pal),6);
    ell(c,0,-30,10,13,pal.metal,O,2);ell(c,0,-31,3,4,A);
  }
}
function SColor(pal){return pal.secondary;}
/**
 * Draw a hero or monster using the same 2D hierarchy.
 * The returned geometry is independent of image assets and works in Node mocks.
 */
export function drawRigActor(c,actor,x,y,time=0,options={}){
  const id=options.id||characterIdForActor(actor);
  const character=options.character||definitions.get(id)||definitions.get('monster.slime');
  const shape=RIG_PRESETS[character.template]?.shape||'guardian';
  const pal=character.colors;
  const action=options.action||
    (actor?.hit>0?'hit':actor?.attackPose>0?'attack':
      Math.hypot(actor?.vx||0,actor?.vy||0)>4||actor?.type?'walk':'idle');
  // Restart one-shot clips from the moment combat sets the attack/hit timer.
  const phase=options.time??(
    action==='attack'&&actor?.attackPose>0
      ?(1-clamp(actor.attackPose/.27,0,1))*findClip(character,'attack').duration
      :action==='hit'&&actor?.hit>0
        ?(1-clamp(actor.hit/.12,0,1))*findClip(character,'hit').duration
        :time+(actor?.id?actor.id*.09:0));
  // Directional clips are opt-in: if walk.front/back/left/right does not
  // exist, the original shared "walk" clip remains unchanged.
  const face=options.face||actorWalkDirection(actor);
  const clipAction=resolveWalkAction(character,action,face);
  const pose=options.pose||sampleCharacter(character,clipAction,phase);
  const joints=getRigHandles(pose,character);
  const visible=new Set(visibleRigNodes(character));
  const speed=Math.hypot(actor?.vx||0,actor?.vy||0);
  const flipped=face==='left'||(face!=='right'&&(actor?.vx||0)<-8);
  const scale=(options.scale??1)*(shape==='colossus'?1.65:1);
  c.save();c.translate(x,y);c.scale(flipped?-scale:scale,scale);
  if(options.shadow!==false)ell(c,0,4,shape==='colossus'?32:19,6,'#07151b77');
  if(actor?.inv>0)c.globalAlpha*=.68+.18*Math.cos(time*24);
  if(actor?.hit>0)c.globalAlpha*=.83;
  // Draw only bones that belong to this species. Slimes have ONE jelly
  // silhouette; bats have wings but no legs; wraiths float; colossi are stone,
  // never human bodies with shoes/gloves.
  for(const side of ['L','R'])if(visible.has('leg'+side))
    at(c,joints,'leg'+side,()=>limb(c,shape,pal,side==='L'?-1:1,true));
  for(const side of ['L','R'])if(visible.has('foot'+side))
    at(c,joints,'foot'+side,()=>foot(c,shape,pal));
  if(visible.has('armL'))at(c,joints,'armL',()=>limb(c,shape,pal,-1,false));
  if(visible.has('body'))at(c,joints,'body',()=>body(c,shape,pal));
  if(visible.has('armR'))at(c,joints,'armR',()=>limb(c,shape,pal,1,false));
  for(const side of ['L','R'])if(visible.has('hand'+side))
    at(c,joints,'hand'+side,()=>hand(c,shape,pal));
  if(visible.has('weapon')&&options.equipment!=='unarmed')
    at(c,joints,'weapon',()=>weapon(c,shape,pal));
  // Slime's head joint is a facial anchor inside its blob, not another head.
  if(visible.has('head')&&shape!=='slime')
    at(c,joints,'head',()=>head(c,shape,pal,face==='back'));
  if(face!=='back'){
    for(const id of ['eyeL','eyeR'])if(visible.has(id))
      at(c,joints,id,()=>eye(c,shape,pal));
    if(visible.has('mouth'))at(c,joints,'mouth',()=>mouth(c,shape,pal));
  }
  if(options.showHandles){
    const features=new Set(['eyeL','eyeR','mouth']);
    for(const id of visible){
      const parent=NODES[id].parent;
      if(!parent||features.has(id)||!visible.has(parent))continue;
      const a=joints[parent],b=joints[id];
      stroke(c,[[a.x,a.y],[b.x,b.y]],'#b5dcc67a',.7);
    }
    for(const id of visible){
      const j=joints[id];
      ell(c,j.x,j.y,id===options.selected?2.9:1.7,
        id===options.selected?2.9:1.7,id===options.selected?'#ffd588':'#bdf0f2',OColor(pal),.5);
    }
    const j=joints[options.selected];
    if(j){
      const radius=15;
      c.beginPath();c.arc(j.x,j.y,radius,0,TAU);
      c.strokeStyle='#e7c78bba';c.lineWidth=.9;c.stroke();
      const hx=j.x+Math.cos(j.rotation-Math.PI/2)*radius;
      const hy=j.y+Math.sin(j.rotation-Math.PI/2)*radius;
      stroke(c,[[j.x,j.y],[hx,hy]],'#ffe2a9',1.1);
      ell(c,hx,hy,3.2,3.2,'#ffe5a6','#2f3237',.7);
    }
  }
  c.restore();
  return joints;
}
function OColor(pal){return pal.outline;}
export function findRigCharacter(id){return definitions.get(id);}
