import * as T from 'three';
import {geometry,material,part,group,humanoid,compileModel} from './Models.js';
import {hash2} from '../../core/math.js';
import {SITE_POSITIONS,SITE_DEFS,WORKERS,WORKER_Y,REGIONS} from '../../storage/Campaign.js';
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
function roof(parent,x,y,z,width=1,depth=1){
  const m=part(parent,'cone','#8b5940',[x,y,z],[width,.8,depth]);m.geometry=new T.ConeGeometry(1,1,4);m.rotation.y=Math.PI/4;m.userData.ownGeometry=true;return m;
}
function house(parent,x=0,z=0,width=1.4){
  part(parent,'box','#bdad83',[x,.67,z],[width,1.32,1.2]);
  roof(parent,x,1.65,z,width*.85,1.05);
  part(parent,'box','#4e3f30',[x,.42,z+.61],[.4,.84,.04]);
  for(const side of [-1,1])part(parent,'box','#e9c77e',[x+side*width*.32,.85,z+.62],[.23,.32,.035],true);
  part(parent,'box','#6e4e37',[x,1.28,z+.63],[width+.1,.1,.08]);
}
function tower(parent,x,z,level=1){
  part(parent,'box','#738278',[x,.85,z],[.9,1.7,.85]);
  part(parent,'box','#a7ad93',[x,1.65,z],[1.15,.2,1.1]);
  for(const a of [-.42,.42])for(const b of [-.4,.4])part(parent,'box','#a7ad93',[x+a,1.92,z+b],[.25,.4,.25]);
  part(parent,'box','#2b4042',[x,1.13,z+.44],[.16,.36,.02]);
  const pole=part(parent,'cylinder','#725137',[x,2.3,z],[.025,1.1,.025]);
  part(parent,'box','#c77c5e',[x+.23,2.65,z],[.45,.25,.035]);
  if(level>1)part(parent,'crystal','#84e0d9',[x,2.02,z],[.15,.25,.15],true);
}
export function createFortress(index,fort,label){
  const root=group();root.position.x=index*FORTRESS_BOUNDS.spacing/UNIT;
  const halfWidth=FORTRESS_BOUNDS.halfWidth/UNIT,halfDepth=FORTRESS_BOUNDS.halfDepth/UNIT;
  part(root,'box','#827b58',[0,-.025,0],[12.3,.15,6.8]);
  part(root,'box','#b59d6a',[1,.07,0],[7.5,.08,.7]);
  house(root,0,-.2,1.85);
  for(const z of [-halfDepth,halfDepth])for(let x=-halfWidth+.2;x<=halfWidth-.2;x+=.4){
    const height=z>0?.45:.95;
    part(root,'cylinder','#7c6141',[x,height*.5,z],[.09,height,.09]);
    part(root,'cone','#ba9363',[x,height+.09,z],[.1,.18,.1]);
  }
  for(const x of [-halfWidth,halfWidth])for(let z=-halfDepth+.3;z<=halfDepth-.3;z+=.4){
    if(x>0&&Math.abs(z)<.9)continue;
    part(root,'cylinder','#795f40',[x,.4,z],[.09,.8,.09]);
  }
  for(const [key,pos] of Object.entries(SITE_POSITIONS)){
    const x=pos.x/UNIT,z=pos.y/UNIT,level=fort.buildings[key]||0;
    part(root,'cylinder','#667265',[x,.09,z],[.91,.16,.78]);
    if(level){
      if(key==='tower')tower(root,x,z,level);
      if(key==='lumber'){
        house(root,x,z,1.1);
        for(let i=0;i<4;i++){const log=part(root,'cylinder','#916b42',[x-.5+i*.28,.28,z+.9],[.13,.85,.13]);log.rotation.x=Math.PI/2;}
      }
      if(key==='quarry'){
        for(let i=0;i<5;i++)part(root,'sphere','#91a39a',[x+(i%3-1)*.35,.2+(i%2)*.1,z+(i%2)*.3],[.33,.3,.3]);
        part(root,'box','#765940',[x,.8,z],[1.2,.12,.13]);
        for(const a of [-.55,.55])part(root,'box','#765940',[x+a,.45,z],[.12,.9,.13]);
      }
      if(key==='wall')for(let i=0;i<5;i++)part(root,'box',i%2?'#75867e':'#94a18c',[x-.6+i*.3,.5,z],[.3,1,.55]);
    }else{
      const ring=part(root,'ring','#9acbb3',[x,.2,z],[.72,.72,.72],true);ring.rotation.x=-Math.PI/2;
      for(const a of [-.55,.55])for(const b of [-.45,.45])part(root,'box','#b9a078',[x+a,.35,z+b],[.075,.6,.075]);
    }
    const shortName={tower:'Torre',lumber:'Madeireira',quarry:'Pedreira',wall:'Muralha'}[key];
    const title=label(`${shortName} · ${level?'Nv. '+level:'Construir'}`,2.8,.27);
    title.position.set(x,.3,z+.95);root.add(title);
    if(!level){const def=SITE_DEFS[key],cost=label(`${def.wood} MAD · ${def.stone} PED`,2.6,.2);cost.position.set(x,.08,z+1.22);root.add(cost);}
  }
  const name=label(REGIONS[index]?.name||'Fortaleza',4,.35);name.position.set(0,.4,3.9);root.add(name);
  const workers=[];
  for(const [role,def] of Object.entries(WORKERS)){
    const hired=fort.workers.some(w=>w.role===role),actor=humanoid(role==='guard'?'guardian':'ranger');actor.scale.setScalar(.66);
    actor.position.set(def.x/UNIT,.1,WORKER_Y/UNIT);root.add(actor);workers.push(actor);
    const title=label(`${def.name} · ${hired?'Contratado':def.gold+' ouro'}`,2,.22);title.position.copy(actor.position).add(new T.Vector3(0,1.65,0));root.add(title);
  }
  const project=group(root);project.visible=false;project.userData.dynamic=true;
  part(project,'box','#233d3c',[0,0,0],[1.8,.15,.04]);
  const fill=part(project,'box','#f5cc78',[0,0,.04],[1.7,.1,.04],true);
  root.userData.project={root:project,fill};root.userData.workers=workers;
  const integrity=label(`Fortaleza · ${Math.round(fort.integrity)}%`,2.8,.22);integrity.position.set(0,2.5,-.2);root.add(integrity);
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
