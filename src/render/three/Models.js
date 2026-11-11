import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {attachDetailedWarrior} from './assets/WarriorActor.js';

// Shared low-poly geometry: every character is a lit, articulated 3D model.
const geometries=new Map(),materials=new Map();
export function geometry(kind){
  if(!geometries.has(kind))geometries.set(kind,{
    box:()=>new T.BoxGeometry(1,1,1),sphere:()=>new T.IcosahedronGeometry(1,1),
    smooth:()=>new T.SphereGeometry(1,16,12),cone:()=>new T.ConeGeometry(1,1,7),
    cylinder:()=>new T.CylinderGeometry(1,1,1,10),crystal:()=>new T.OctahedronGeometry(1),
    ring:()=>new T.TorusGeometry(1,.055,5,40),plane:()=>new T.PlaneGeometry(1,1)
  }[kind]());
  return geometries.get(kind);
}
export function material(color,glow=false){
  const key=color+':'+glow;
  if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.8,metalness:glow?.35:.12,flatShading:true,emissive:glow?color:0,emissiveIntensity:glow?.75:0}));
  return materials.get(key);
}
export function part(parent,kind,color,position=[0,0,0],scale=[1,1,1],glow=false){
  const m=new T.Mesh(geometry(kind),material(color,glow));m.position.set(...position);m.scale.set(...scale);
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function group(parent,position=[0,0,0]){const g=new T.Group();g.position.set(...position);parent?.add(g);return g;}
// Merge rigid surfaces per joint, keeping the skeleton animated while reducing
// a creature from dozens of draw calls to one call per moving part.
export function compileModel(root){
  if(root.userData.compiled||root.userData.dynamic)return root;
  for(const child of [...root.children])if(child.isGroup)compileModel(child);
  const buckets=new Map();
  for(const child of root.children.filter(o=>o.isMesh&&!o.isInstancedMesh)){
    const glow=child.material.emissiveIntensity>0,key=glow?child.material.uuid:'solid';
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);
  }
  for(const [key,meshes] of buckets){
    if(meshes.length<2)continue;
    const pieces=meshes.map(mesh=>{
      mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);
      if(key==='solid'){
        const colors=new Float32Array(g.attributes.position.count*3),color=mesh.material.color;
        for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
        g.setAttribute('color',new T.BufferAttribute(colors,3));
      }
      return g;
    });
    let mat=meshes[0].material;
    if(key==='solid'){
      if(!materials.has('vertex'))materials.set('vertex',new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.8,metalness:.12}));
      mat=materials.get('vertex');
    }
    const merged=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();
    if(!merged)continue;
    const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.ownGeometry=true;
    for(const old of meshes){root.remove(old);if(old.userData.ownGeometry)old.geometry.dispose();if(old.userData.ownMaterial)old.material.dispose();}root.add(mesh);
  }
  root.userData.compiled=true;return root;
}
function limb(parent,x,color,leg=false){
  const g=group(parent,[x,leg?.78:1.43,0]);
  part(g,'box',color,[0,leg?-.3:-.24,0],leg?[.23,.58,.26]:[.22,.48,.25]);
  part(g,'box',leg?'#323e44':'#bd946e',[0,leg?-.61:-.5,leg?.1:0],leg?[.27,.2,.4]:[.2,.18,.22]);
  if(!leg)part(g,'sphere',color,[0,-.02,0],[.2,.2,.22]);return g;
}
export function humanoid(type='guardian'){
  const root=group(),model=group(root);root.userData.model=model;
  const palettes={guardian:['#819aa6','#263c53','#d7b477'],mage:['#536bb2','#26375f','#8ee4ee'],ranger:['#3b826b','#23483c','#c5d58b'],skeleton:['#d8d3b8','#666e66','#b58b62'],colossus:['#647c77','#374d4c','#f1b968']};
  const [primary,dark,accent]=palettes[type]||palettes.guardian;
  const bone=type==='skeleton',stone=type==='colossus';
  const left=limb(model,-.19,bone?primary:dark,true),right=limb(model,.19,bone?primary:dark,true);
  const armL=limb(model,-.43,primary),armR=limb(model,.43,primary);
  part(model,'box',primary,[0,1.15,0],[bone?.43:.67,.7,.39]);
  part(model,'box',dark,[0,.86,0],[.69,.12,.43]);part(model,'box',accent,[0,.86,.235],[.16,.12,.05]);
  const head=group(model,[0,1.83,0]);
  part(head,'sphere',bone?primary:stone?dark:'#d1a180',[0,0,0],[.29,.33,.27]);
  for(const x of [-.105,.105])part(head,'box',bone?'#24353c':stone?accent:'#213036',[x,.025,.25],[bone?.095:.055,.055,.035],stone);
  if(type==='guardian'){
    part(head,'sphere',primary,[0,.17,-.035],[.33,.26,.3]);
    part(head,'box',accent,[0,.27,.02],[.075,.4,.24]);
    for(const x of [-.27,.27])part(head,'box',dark,[x,-.06,.04],[.12,.34,.27]);
    const shield=part(armL,'sphere',dark,[-.08,-.34,.18],[.32,.43,.1]);
    part(shield,'box',accent,[0,0,1],[.2,1.4,.25]);
    const sword=group(armR,[0,-.52,.04]);
    part(sword,'box','#e4eeeb',[0,.3,.08],[.075,.85,.07]);part(sword,'cone','#e4eeeb',[0,.77,.08],[.055,.17,.055]);
    part(sword,'box',accent,[0,-.1,.08],[.35,.07,.12]);
    part(model,'box',accent,[0,1.3,.23],[.12,.32,.04]);
  }else if(type==='mage'){
    part(model,'cone',primary,[0,.74,0],[.54,1.2,.43]);
    const cape=part(model,'cone',dark,[0,1.07,-.16],[.58,1.15,.32]);cape.rotation.x=-.12;
    part(head,'cone',primary,[0,.42,-.02],[.4,.8,.36]);part(head,'cylinder',accent,[0,.13,0],[.39,.07,.36]);
    part(head,'crystal',accent,[0,.28,.25],[.09,.13,.06],true);
    part(armR,'cylinder','#7d5841',[0,-.24,.07],[.045,1.5,.045]);
    part(armR,'crystal',accent,[0,.58,.07],[.17,.26,.17],true);
    part(model,'crystal',accent,[0,1.29,.28],[.1,.13,.045],true);
  }else if(type==='ranger'){
    part(head,'sphere',dark,[0,.13,-.09],[.36,.38,.3]);
    part(head,'box',primary,[0,-.1,.22],[.44,.13,.1]);
    const strap=part(model,'box','#9b7550',[0,1.19,.23],[.09,.78,.06]);strap.rotation.z=-.65;
    const quiver=part(model,'cylinder','#715339',[.23,1.35,-.29],[.13,.65,.13]);quiver.rotation.z=-.3;
    for(const x of [.12,.22,.32])part(model,'cylinder',accent,[x,1.76,-.29],[.018,.45,.018]);
    for(const arm of [armL,armR]){part(arm,'box','#e1e8d7',[0,-.65,.1],[.055,.4,.075]);part(arm,'box',accent,[0,-.48,.1],[.2,.05,.12]);}
    const cloak=part(model,'cone',dark,[0,1.12,-.2],[.48,.9,.25]);cloak.rotation.x=-.2;
  }else if(bone){
    for(let i=0;i<3;i++)part(model,'box','#eee7c9',[0,1.03+i*.15,.23],[.5,.055,.075]);
    part(head,'box','#ece4c5',[0,-.25,.1],[.3,.1,.22]);
  }else if(stone){
    for(const arm of [armL,armR])part(arm,'sphere',primary,[0,.02,0],[.34,.33,.3]);
    part(model,'crystal',accent,[0,1.21,.28],[.19,.26,.13],true);
    for(const x of [-.24,.24])part(head,'cone',primary,[x,.32,0],[.13,.42,.15]);
    root.scale.setScalar(1.8);
  }
  root.userData.rig={left,right,armL,armR,head,type};compileModel(root);
  return type==='guardian'?attachDetailedWarrior(root):root;
}
export function creature(type){
  if(['skeleton','colossus'].includes(type))return humanoid(type);
  const root=group(),model=group(root);root.userData.model=model;
  if(type==='slime'){
    part(model,'smooth','#55b99a',[0,.36,0],[.55,.48,.5]);
    part(model,'smooth','#a5efd0',[-.16,.6,.21],[.13,.065,.075]);
    for(const x of [-.16,.16])part(model,'sphere','#143e38',[x,.38,.44],[.055,.085,.04]);
  }else if(type==='bat'){
    part(model,'sphere','#6c548a',[0,.9,0],[.25,.34,.22]);
    for(const x of [-.14,.14])part(model,'cone','#a18bb6',[x,1.18,0],[.11,.35,.1]);
    const wings=[];for(const side of [-1,1]){
      const wing=group(model,[side*.15,1,0]);
      const m=part(wing,'cone','#8e70ad',[side*.38,0,0],[.48,.08,.35]);m.rotation.z=side*.1;wings.push(wing);
    }
    for(const x of [-.1,.1])part(model,'sphere','#ffb1a6',[x,.98,.21],[.045,.05,.025],true);
    root.userData.wings=wings;
  }else if(type==='spider'){
    part(model,'sphere','#775493',[0,.34,-.13],[.44,.3,.5]);part(model,'sphere','#9c72b2',[0,.29,.3],[.3,.23,.27]);
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const leg=group(model,[side*.25,.3,-.3+i*.19]);
      const upper=part(leg,'box','#4a375f',[side*.27,0,0],[.6,.07,.075]);upper.rotation.z=side*.45;
      const lower=part(leg,'box','#3b304c',[side*.53,-.12,.05],[.075,.4,.075]);lower.rotation.z=side*.4;
    }
    for(const x of [-.12,.12])part(model,'sphere','#eab5c9',[x,.33,.54],[.06,.06,.035],true);
  }else if(type==='spore'){
    part(model,'cylinder','#d7c69e',[0,.44,0],[.19,.8,.18]);
    part(model,'sphere','#8fa264',[0,.96,0],[.58,.3,.55]);
    for(const [x,z] of [[-.22,.25],[.18,.2],[0,-.28]])part(model,'sphere','#e4d7ab',[x,1.2,z],[.09,.035,.08]);
    for(const x of [-.08,.08])part(model,'sphere','#364b36',[x,.51,.17],[.035,.05,.03]);
  }else{
    part(model,'cone','#285a70',[0,.8,0],[.49,1.4,.4]);
    part(model,'sphere','#397d91',[0,1.4,0],[.36,.4,.3]);
    part(model,'sphere','#112e40',[0,1.38,.18],[.25,.27,.16]);
    for(const x of [-.1,.1])part(model,'sphere','#a0f9eb',[x,1.4,.31],[.065,.05,.035],true);
    for(const x of [-.4,.4])part(model,'cone','#42899b',[x,1.05,0],[.13,.7,.17]);
  }
  root.userData.type=type;return compileModel(root);
}
export function animateActor(root,actor,time){
  const model=root.userData.model,rig=root.userData.rig;
  const moving=Math.hypot(actor.vx||0,actor.vy||0)>4;
  const phase=time*10+(actor.id||0),stride=moving?Math.sin(phase)*.65:Math.sin(time*2)*.025;
  model.rotation.y=Math.PI/2-(actor.facing??Math.atan2(actor.vy||0,actor.vx||0));
  model.position.y=moving?Math.abs(Math.sin(phase))*.045:Math.sin(time*2)*.015;
  if(root.userData.animateWarrior){
    model.position.y=0;root.userData.animateWarrior(actor,time);
  }else if(rig){
    rig.left.rotation.x=stride;rig.right.rotation.x=-stride;
    rig.armL.rotation.x=-stride*.6;rig.armR.rotation.x=stride*.6;
    if(actor.attackPose>0)rig.armR.rotation.x=-1.6*Math.sin((1-actor.attackPose/.27)*Math.PI);
  }else if(root.userData.type==='slime'){
    model.scale.set(1+Math.sin(phase)*.06,1-Math.sin(phase)*.08,1+Math.sin(phase)*.04);
  }else if(['bat','wraith'].includes(root.userData.type))model.position.y+=.16+Math.sin(time*5+(actor.id||0))*.12;
  if(root.userData.wings)root.userData.wings.forEach((w,i)=>w.rotation.z=Math.sin(time*17)*(i?1:-1)*.65);
  root.visible=!(actor.inv>0&&Math.floor(time*18)%2===0);
}
export function disposeModelResources(){for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();geometries.clear();materials.clear();}
