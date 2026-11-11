import * as T from 'three';
import {geometry,material,part,group,humanoid,compileModel} from './Models.js';
import {hash2} from '../../core/math.js';
import {SITE_POSITIONS,WORKERS,WORKER_Y,REGIONS} from '../../storage/Campaign.js';
import {FORTRESS_BOUNDS} from '../../world/FortressBounds.js';

export const UNIT=50;
const TILE=96/UNIT,SPAN=55,COUNT=SPAN*SPAN,HALF=(SPAN-1)/2;
const matrix=new T.Matrix4(),rotation=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
function stamp(mesh,index,x,y,z,sx,sy,sz,angle=0,color){
  position.set(x,y,z);scale.set(sx,sy,sz);rotation.setFromAxisAngle(new T.Vector3(0,1,0),angle);
  matrix.compose(position,rotation,scale);mesh.setMatrixAt(index,matrix);
  if(color)mesh.setColorAt(index,new T.Color(color));
}
function instances(parent,kind,color,count,shadow=true){
  const mesh=new T.InstancedMesh(geometry(kind),material(color),count);
  mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.frustumCulled=false;parent.add(mesh);return mesh;
}
export class Terrain{
  constructor(scene){
    this.root=group(scene);this.center='';
    this.floor=instances(this.root,'box','#ffffff',COUNT,false);
    this.trunks=instances(this.root,'cylinder','#624b36',COUNT);
    this.leaves=instances(this.root,'cone','#487951',COUNT*2);
    this.rocks=instances(this.root,'sphere','#76877a',COUNT);
    this.grass=instances(this.root,'cone','#5d8b51',COUNT*4,false);
    this.crystals=instances(this.root,'crystal','#8d80bb',COUNT);
    this.ruins=instances(this.root,'box','#889081',COUNT);
  }
  update(game){
    const px=Math.floor(game.player.x/96/3)*3,py=Math.floor(game.player.y/96/3)*3;
    const key=px+':'+py+':'+game.campaign.region;if(key===this.center)return;this.center=key;
    let f=0,t=0,l=0,r=0,g=0,c=0,u=0;
    const colors={sanctuary:'#456848',meadow:'#3c6143',grove:'#31503e',ruins:'#4e5b50',blight:'#3a414c'};
    for(let dy=-HALF;dy<=HALF;dy++)for(let dx=-HALF;dx<=HALF;dx++){
      const tx=px+dx,ty=py+dy,cell=game.world.tileAt(tx,ty),x=(tx+.5)*TILE,z=(ty+.5)*TILE;
      const rng=i=>hash2(tx*7+i,ty*11-i,173+i);
      const col=new T.Color(colors[cell.kind]);col.multiplyScalar(.93+rng(1)*.14);
      stamp(this.floor,f++,x,-.15,z,TILE+.015,.3,TILE+.015,0,col);
      const inFort=game.campaign.fortresses.some((_,i)=>Math.abs(x-i*36)<6.4&&Math.abs(z)<3.8);
      if(inFort||Math.hypot(x-(game.campaign.region*36+9),z)<1)continue;
      for(let i=0;i<3;i++)stamp(this.grass,g++,x+(rng(i+20)-.5)*TILE,.12,z+(rng(i+30)-.5)*TILE,.07,.24+rng(i+10)*.15,.08,rng(i)*6);
      if(cell.kind==='grove'&&rng(2)>.32){
        const h=1.6+rng(3)*1.3;
        stamp(this.trunks,t++,x,h*.35,z,.13,h*.7,.13);
        stamp(this.leaves,l++,x,h*.75,z,.8,h*.9,.8,0,rng(4)>.5?'#3b7252':'#568557');
        stamp(this.leaves,l++,x,h*1.02,z,.58,h*.6,.58);
      }else if(cell.kind==='ruins'&&rng(3)>.55){
        stamp(this.ruins,u++,x,.35,z,.4,.7+rng(4),.5,rng(5)*6);
      }else if(cell.kind==='blight'&&rng(3)>.5){
        stamp(this.crystals,c++,x,.5,z,.23,.7,.23,rng(4)*6);
      }else if(rng(4)>.87)stamp(this.rocks,r++,x,.2,z,.3+rng(5)*.3,.2+rng(6)*.25,.35,rng(7)*6);
    }
    for(const [mesh,count] of [[this.floor,f],[this.trunks,t],[this.leaves,l],[this.rocks,r],[this.grass,g],[this.crystals,c],[this.ruins,u]]){
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
  }
  destroy(){for(const mesh of this.root.children)mesh.dispose?.();this.root.removeFromParent();}
}
const palette={stone:'#858c81',stoneLight:'#b4b5a1',mortar:'#555d57',wood:'#765039',woodLight:'#ae8250',roof:'#514650',iron:'#343b3a',blueprint:'#9dceb8'};
function materialPbr(color,roughness=.9,metalness=0){const m=new T.MeshStandardMaterial({color,roughness,metalness,flatShading:true});m.userData.ownMaterial=true;return m;}
function customMesh(parent,geo,color,x=0,y=0,z=0,opts={}){
  const m=new T.Mesh(geo,materialPbr(color,opts.roughness??.9,opts.metalness??0));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.ownGeometry=true;m.userData.ownMaterial=true;parent.add(m);return m;
}
function phase(parent,threshold){const g=group(parent);g.userData.revealAt=threshold;return g;}
function roofPanel(corners,thickness=.11){
  const lower=corners.map(p=>[p[0],p[1]-thickness,p[2]]),verts=[...corners,...lower];
  const faces=[[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]],positions=[],uv=[];
  for(const f of faces)for(const i of [0,1,2,0,2,3])positions.push(...verts[f[i]]);
  for(let i=0;i<6;i++)uv.push(0,0,1,0,1,1,0,0,1,1,0,1);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function timberRoof(parent,width,depth,eave,peak,color=palette.roof){
  const x=width/2+.18,z=depth/2+.18;
  customMesh(parent,roofPanel([[0,peak,z],[0,peak,-z],[-x,eave,-z],[-x,eave,z]]),color);
  customMesh(parent,roofPanel([[x,eave,z],[x,eave,-z],[0,peak,-z],[0,peak,z]]),color);
  const ridge=part(parent,'cylinder',palette.wood,[0,peak,0],[.09,depth+.5,.09]);ridge.rotation.x=Math.PI/2;
  for(const side of [-1,1])for(const end of [-1,1]){
    const a=new T.Vector3(0,peak,end*z),b=new T.Vector3(side*x,eave,end*z),v=b.clone().sub(a),beam=part(parent,'box',palette.wood,[0,0,0],[.11,v.length(),.12]);
    beam.position.copy(a.clone().add(b).multiplyScalar(.5));beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());
  }
}
function cottage(parent,x,z,kind='house',progress=1){
  const root=group(parent,[x,0,z]),base=phase(root,.12),frame=phase(root,.33),walls=phase(root,.53),cover=phase(root,.76),details=phase(root,.9);root.name=kind==='house'?'Player shelter':kind==='storage'?'Resource depot':'Production workshop';
  root.userData.setProgress=p=>{for(const g of [base,frame,walls,cover,details])g.visible=p>=g.userData.revealAt;root.userData.progress=p;};
  const w=kind==='house'?2.15:1.8,d=kind==='house'?1.7:1.45,h=1.12,front=d/2;
  part(base,'box','#645f51',[0,.13,0],[w+.16,.26,d+.16]);
  for(const sx of [-1,1])for(const sz of [-1,1])part(frame,'box',palette.wood,[sx*(w/2-.08),h/2+.24,sz*(d/2-.08)],[.14,h,.14]);
  for(const y of [.42,h+.24])for(const side of [-1,1])part(frame,'box',palette.woodLight,[0,y,side*(d/2-.08)],[w,.1,.1]);
  part(walls,'box','#c4b693',[-w/2+.06,.77,0],[.12,.93,d-.24]);part(walls,'box','#c4b693',[w/2-.06,.77,0],[.12,.93,d-.24]);
  part(walls,'box','#c4b693',[0,.77,-d/2+.06],[w-.22,.93,.12]);
  const door=.42,sideW=(w-.24-door)/2;
  for(const sx of [-1,1])part(walls,'box','#c4b693',[sx*(door/2+sideW/2),.77,front-.06],[sideW,.93,.12]);
  const gable=new T.Shape();gable.moveTo(-w/2,.98);gable.lineTo(w/2,.98);gable.lineTo(0,1.72);gable.closePath();
  const gg=new T.ExtrudeGeometry(gable,{depth:.13,bevelEnabled:false});gg.translate(0,0,-.065);customMesh(walls,gg,'#baa981',0,0,-d/2+.06);
  const gf=gg.clone();customMesh(walls,gf,'#baa981',0,0,d/2-.06);
  timberRoof(cover,w+.22,d+.2,1.45,1.83);
  for(const sx of [-1,1]){
    part(details,'box',palette.woodLight,[sx*door/2,.68,front+.035],[.09,.84,.13]);
    part(details,'box',palette.woodLight,[0,1.1,front+.035],[door+.1,.1,.13]);
  }
  part(details,'box',kind==='house'?palette.wood:palette.iron,[0,.58,front+.05],[door-.08,.68,.05],kind!=='house');
  for(const sx of [-1,1]){
    part(details,'box',palette.wood,[sx*.63,.78,front+.035],[.34,.34,.09]);
    part(details,'box','#e8c77d',[sx*.63,.78,front+.09],[.22,.22,.035],true);
  }
  if(kind==='storage'){
    for(let i=0;i<3;i++){const log=part(details,'cylinder',i%2?palette.woodLight:palette.wood,[.34,.21+i*.12,-.3],[.13,.82,.13]);log.rotation.z=Math.PI/2;}
    part(details,'box',palette.iron,[0,.43,front+.12],[.035,.16,.04]);
  }else if(kind==='workshop'){
    const wheel=part(details,'cylinder','#77553a',[.69,.58,-.48],[.34,.12,.34]);wheel.rotation.x=Math.PI/2;
    part(details,'box',palette.wood,[.48,.32,-.48],[.68,.12,.12]);
    part(details,'box',palette.iron,[.48,.57,-.48],[.08,.46,.08],true);
  }
  root.userData.setProgress(progress);return root;
}
function octagonalTower(parent,x,z,level=1,progress=1){
  const root=group(parent,[x,0,z]),base=phase(root,.12),shaft=phase(root,.34),walk=phase(root,.66),teeth=phase(root,.86);root.name='Octagonal watchtower';
  root.userData.setProgress=p=>{for(const g of [base,shaft,walk,teeth])g.visible=p>=g.userData.revealAt;root.userData.progress=p;};
  const sides=8,rot=Math.PI/8;
  customMesh(base,new T.CylinderGeometry(.66,.78,.25,sides),palette.mortar,0,.125,0);
  customMesh(shaft,new T.CylinderGeometry(.53,.67,1.48,sides),palette.stone,0,.98,0);
  customMesh(shaft,new T.CylinderGeometry(.57,.53,.16,sides),palette.stoneLight,0,1.78,0);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+rot,r=.56;
    part(walk,'box',palette.woodLight,[Math.sin(a)*r,1.9,Math.cos(a)*r],[.18,.12,.18]).rotation.y=a;
    part(teeth,'box',palette.stoneLight,[Math.sin(a)*.56,2.12,Math.cos(a)*.56],[.2,.35,.22]).rotation.y=a;
  }
  const slit=part(shaft,'box','#263a3a',[0,1.02,.535],[.12,.34,.025]);
  if(level>1)part(teeth,'crystal','#83ded1',[0,2.43,0],[.15,.24,.15],true);
  root.userData.setProgress(progress);return root;
}
function makeWallRun(parent,length,x,z,rotation,progress=1){
  const root=group(parent,[x,0,z]);root.rotation.y=rotation;root.name='Crenellated stone wall';
  const base=phase(root,.12),body=phase(root,.32),trim=phase(root,.57),teeth=phase(root,.76);
  root.userData.setProgress=p=>{for(const g of [base,body,trim,teeth])g.visible=p>=g.userData.revealAt;root.userData.progress=p;};
  part(base,'box',palette.mortar,[0,.12,0],[length+.14,.24,.68]);
  const shape=new T.Shape();shape.moveTo(-length/2,0);shape.lineTo(length/2,0);shape.lineTo(length/2,1.32);shape.lineTo(-length/2,1.32);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1});geo.translate(0,0,-.24);customMesh(body,geo,palette.stone,0,.2,0);
  for(const yy of [.58,1.05])part(trim,'box',palette.mortar,[0,yy,0],[length,.035,.51]);
  const count=Math.max(2,Math.floor(length/.62));
  for(let i=0;i<count;i++){
    const xx=-length/2+(i+.5)*length/count;
    if(i%3===0){part(trim,'box',palette.stoneLight,[xx,.84,.255],[.035,.38,.035]);part(trim,'box',palette.stoneLight,[xx,.84,-.255],[.035,.38,.035]);}
    if(i%4===1){const buttress=part(trim,'box',palette.stoneLight,[xx,.54,.34],[.27,.68,.28]);buttress.rotation.z=.08;}
  }
  part(teeth,'box',palette.stoneLight,[0,1.62,0],[length+.15,.16,.63]);
  for(let i=0;i<count;i+=2){const xx=-length/2+(i+.5)*length/count;part(teeth,'box',palette.stoneLight,[xx,1.85,0],[Math.min(.38,length/count*.7),.34,.52]);}
  root.userData.setProgress(progress);return root;
}
function archGate(parent,x,z,rotation=0){
  const root=group(parent,[x,0,z]);root.rotation.y=rotation;root.name='Open arched gate';
  const shape=new T.Shape(),w=.58,r=.43,spring=1.1,h=1.95;
  shape.moveTo(-w,0);shape.lineTo(-r,0);shape.lineTo(-r,spring);shape.absarc(0,spring,r,Math.PI,0,true);shape.lineTo(r,0);shape.lineTo(w,0);shape.lineTo(w,h);shape.lineTo(-w,h);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.42,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,curveSegments:8});g.translate(0,0,-.21);customMesh(root,g,palette.stoneLight,0,0,0);
  for(const side of [-1,1]){
    part(root,'box',palette.wood,[side*.21,.58,.23],[.24,1.05,.08]);
    for(const y of [.28,.72,1.1])part(root,'box',palette.iron,[side*.21,y,.28],[.26,.045,.04],true);
    part(root,'sphere',palette.iron,[side*.2,.58,.31],[.055,.055,.045],true);
  }
  part(root,'box',palette.stoneLight,[0,1.97,0],[1.38,.17,.62]);return root;
}
export function createFortress(index,fort,label){
  const root=group();root.name='Procedural medieval fortress';root.position.x=index*FORTRESS_BOUNDS.spacing/UNIT;root.userData.assetId='survival-fortress-v2';root.userData.category='fortification';root.userData.units='meters';
  const halfWidth=FORTRESS_BOUNDS.halfWidth/UNIT,halfDepth=FORTRESS_BOUNDS.halfDepth/UNIT;
  part(root,'box','#827b58',[0,-.12,0],[12.15,.12,6.65]);
  part(root,'box','#ad9c75',[0,-.045,0],[8.6,.045,4.7]);
  // Permanent timber palisade and open gateway keep the starting fort legible.
  const palisade=group(root);root.userData.palisade=palisade;
  for(const z of [-halfDepth,halfDepth])for(let x=-halfWidth+.12;x<=halfWidth-.12;x+=.38){
    part(palisade,'cylinder',palette.wood,[x,.48,z],[.07,.96,.07]);
    part(palisade,'cone',palette.woodLight,[x,1.01,z],[.08,.18,.08]);
  }
  for(const x of [-halfWidth,halfWidth])for(let z=-halfDepth+.14;z<=halfDepth-.14;z+=.38){
    if(x>0&&Math.abs(z)<.78)continue;
    part(palisade,'cylinder',palette.wood,[x,.48,z],[.07,.96,.07]);
  }
  const wallLevel=fort.buildings.wall||0,wallProject=fort.project?.type==='wall'?
    Math.min(1,fort.project.progress/fort.project.required):null;
  if(wallLevel||wallProject!==null){
    const p=wallLevel?1:wallProject??1;
    palisade.visible=p<.2&&!wallLevel;
    // Four solid modular runs; the east side is split around a real walk-through gate.
    root.userData.constructionAssets=[];
    root.userData.constructionAssets.push(makeWallRun(root,halfWidth*2,0,-halfDepth,0,p),makeWallRun(root,halfWidth*2,0,halfDepth,0,p));
    root.userData.constructionAssets.push(makeWallRun(root,halfDepth*2,-halfWidth,0,Math.PI/2,p));
    root.userData.constructionAssets.push(makeWallRun(root,halfDepth-.88,halfWidth,-(halfDepth+.88)/2,Math.PI/2,p));
    root.userData.constructionAssets.push(makeWallRun(root,halfDepth-.88,halfWidth,(halfDepth+.88)/2,Math.PI/2,p));
  }
  archGate(root,halfWidth,0,Math.PI/2);
  root.userData.constructionAssets??=[];
  for(const [key,pos] of Object.entries(SITE_POSITIONS)){
    const x=pos.x/UNIT,z=pos.y/UNIT,level=fort.buildings[key]||0,project=fort.project?.type===key;
    const progress=level?1:project?Math.min(1,fort.project.progress/fort.project.required):0;
    if(key==='house'){
      if(level||project){const asset=cottage(root,x,z,'house',progress);if(project)root.userData.constructionAssets.push(asset);}
    }else if(key==='tower'){
      if(level||project){for(const [tx,tz] of [[-halfWidth,-halfDepth],[halfWidth,-halfDepth],[-halfWidth,halfDepth],[halfWidth,halfDepth]]){const asset=octagonalTower(root,tx,tz,level||1,progress);if(project)root.userData.constructionAssets.push(asset);}}
    }else if(key==='lumber'){
      if(level||project){const asset=cottage(root,x,z,'storage',progress);if(project)root.userData.constructionAssets.push(asset);}
    }else if(key==='quarry'){
      if(level||project){const asset=cottage(root,x,z,'workshop',progress);if(project)root.userData.constructionAssets.push(asset);}
    }else if(key==='wall'){
      // Stone perimeter geometry is created above, with its opening aligned to the eastern path.
    }
    if(!level){
      const ring=part(root,'ring',palette.blueprint,[x,.08,z],[.56,.56,.56],true);ring.rotation.x=-Math.PI/2;
      for(const sx of [-1,1])for(const sz of [-1,1])part(root,'box',palette.blueprint,[x+sx*.49,.16,z+sz*.37],[.055,.34,.055]);
    }
  }
  const materialPiles=[];
  if(fort.project){
    const pos=SITE_POSITIONS[fort.project.type],pile=group(root,[pos.x/UNIT+.82,.04,pos.y/UNIT+.18]);
    const woodFraction=Number.isFinite(fort.project.woodRequired)?fort.project.woodDelivered/fort.project.woodRequired:fort.project.progress/fort.project.required;
    const stoneFraction=Number.isFinite(fort.project.stoneRequired)?fort.project.stoneDelivered/fort.project.stoneRequired:fort.project.progress/fort.project.required;
    for(let i=0;i<6;i++){
      const log=group(pile,[0,0,Math.floor(i/2)*.2]);part(log,'cylinder',i%2?palette.woodLight:palette.wood,[0,.08,0],[.12,.72,.12]).rotation.z=Math.PI/2;
      const threshold=(i+1)/6;log.visible=woodFraction>=threshold;materialPiles.push({mesh:log,kind:'wood',threshold});
      const block=group(pile,[.38,.02,Math.floor(i/2)*.22]);part(block,'sphere',i%2?palette.stoneLight:palette.stone,[0,.11,0],[.23,.23,.23]);
      block.visible=stoneFraction>=threshold;materialPiles.push({mesh:block,kind:'stone',threshold});
    }
  }
  root.userData.materialPiles=materialPiles;
  const workers=[];
  for(const [role,def] of Object.entries(WORKERS))if(fort.workers.some(w=>w.role===role)){
    const actor=humanoid(role==='guard'?'guardian':'ranger');actor.scale.setScalar(.5);actor.userData.workerRole=role;actor.userData.home=[def.x/UNIT,WORKER_Y/UNIT];
    part(actor,'box',role==='miner'?'#818f92':'#9b7046',[.24,1.32,-.22],[.26,.3,.22]);
    actor.position.set(def.x/UNIT,.1,WORKER_Y/UNIT);root.add(actor);workers.push(actor);
  }
  const projectBar=group(root);projectBar.visible=false;projectBar.userData.dynamic=true;
  part(projectBar,'box','#233d3c',[0,0,0],[1.8,.15,.04]);
  const fill=part(projectBar,'box','#f5cc78',[0,0,.04],[1.7,.1,.04],true);
  root.userData.project={root:projectBar,fill};root.userData.workers=workers;
  return compileModel(root);
}
export function createGate(label,next){
  const root=group();
  part(root,'cylinder','#728781',[0,.08,0],[.9,.2,.65]);
  const ring=part(root,'ring','#7ae5d5',[0,1.15,0],[.72,1.1,.72],true);
  const portal=part(root,'sphere','#183b47',[0,1.15,0],[.61,1,.06],true);
  const title=label('Passagem · '+next.name,3.6,.27);title.position.set(0,2.95,0);root.add(title);
  const cost=label(`${next.cost} ouro · ${next.wood} madeira · ${next.stone} pedra`,3.8,.2);cost.position.set(0,2.3,0);root.add(cost);
  root.userData.ring=ring;root.userData.portal=portal;return root;
}
export function disposeEnvironment(root){root.traverse(o=>{if(o.userData.ownGeometry)o.geometry.dispose();});}
