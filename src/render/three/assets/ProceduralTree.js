import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Organic deciduous trees for the survival camera. Y-up, meters, ground-level pivot.
// Shape, foliage distribution and tint have independent seeded random streams.
const DEFAULTS = Object.freeze({
  seed:'grove-001',id:'tree-001',height:3.5,age:.75,canopySpread:1,
  leafDensity:.85,lean:.2,leafColor:'#568557',quality:'game'
});
function validate(input={}){
  const p={...DEFAULTS,...input};
  for(const k of ['id','seed'])if(typeof p[k]!=='string'||p[k].length<1||p[k].length>128)throw new TypeError(`${k} must be 1–128 characters`);
  for(const [k,min,max] of [['height',1.5,8],['age',0,1],['canopySpread',.6,1.5],['leafDensity',0,1],['lean',0,1]]){
    if(!Number.isFinite(p[k])||p[k]<min||p[k]>max)throw new RangeError(`${k} must be ${min}–${max}`);
  }
  if(typeof p.leafColor!=='string'||!/^#[0-9a-f]{6}$/i.test(p.leafColor))throw new TypeError('leafColor must be #RRGGBB');
  if(!['game','hero'].includes(p.quality))throw new TypeError('quality must be game or hero');
  return p;
}
function random(seed,id,stream){
  const key=JSON.stringify([seed,id,stream]);let s=2166136261;
  for(let i=0;i<key.length;i++)s=Math.imul(s^key.charCodeAt(i),16777619)>>>0;
  return ()=>{s=(s+0x6D2B79F5)>>>0;let x=Math.imul(s^(s>>>15),1|s);x^=x+Math.imul(x^(x>>>7),61|x);return ((x^(x>>>14))>>>0)/4294967296;};
}
const clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0);
function geometryFromFaces(faces){
  const positions=[],uvs=[],colors=[];
  for(const face of faces){
    for(let i=0;i<3;i++){
      positions.push(...face.vertices[i].toArray());uvs.push(...face.uvs[i]);colors.push(...face.color.toArray());
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();geo.computeBoundingSphere();geo.computeBoundingBox();
  return geo;
}
function barkTube(points,radii,sides,rng,color){
  const basis=new T.Vector3(),other=new T.Vector3(),tangent=new T.Vector3(),ring=[];
  for(let k=0;k<points.length;k++){
    tangent.copy(points[Math.min(k+1,points.length-1)]).sub(points[Math.max(0,k-1)]).normalize();
    if(tangent.lengthSq()===0)tangent.copy(up);
    const axis=Math.abs(tangent.z)<.92?new T.Vector3(0,0,1):new T.Vector3(1,0,0);
    basis.crossVectors(tangent,axis).normalize();other.crossVectors(tangent,basis).normalize();
    const vertices=[];
    for(let i=0;i<sides;i++){
      const a=i*2*Math.PI/sides,rad=radii[k]*(1+.035*Math.cos(3*a+k*.7));
      vertices.push(points[k].clone().addScaledVector(basis,Math.cos(a)*rad).addScaledVector(other,Math.sin(a)*rad));
    }
    ring.push(vertices);
  }
  const faces=[];
  for(let k=0;k<points.length-1;k++)for(let i=0;i<sides;i++){
    const j=(i+1)%sides;
    const shade=.79+rng()*.24+(i%3===0?.06:0);
    const tint=color.clone().multiplyScalar(shade);
    const a=ring[k][i],b=ring[k][j],c=ring[k+1][j],d=ring[k+1][i];
    // Local ring order is clockwise when viewed from the tip; these wind outward.
    faces.push({vertices:[a,c,d],uvs:[[i/sides,k],[j/sides,k+1],[i/sides,k+1]],color:tint});
    faces.push({vertices:[a,b,c],uvs:[[i/sides,k],[j/sides,k],[j/sides,k+1]],color:tint});
  }
  return geometryFromFaces(faces);
}
function foliageLobe(center,radii,rng,color,detail){
  let geo=new T.IcosahedronGeometry(1,detail);
  if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}
  const positions=geo.attributes.position,colors=new Float32Array(positions.count*3);
  const phase=rng()*6.28318;
  for(let i=0;i<positions.count;i++){
    const v=new T.Vector3().fromBufferAttribute(positions,i);
    // Coherent low-frequency folds keep neighboring vertices connected.
    const ripple=1+.095*Math.sin(v.x*5+v.z*3+phase)+.07*Math.cos(v.y*6-v.z*4+phase);
    v.multiply(new T.Vector3(radii.x,radii.y,radii.z)).multiplyScalar(ripple).add(center);
    positions.setXYZ(i,v.x,v.y,v.z);
    const light=clamp(.78+(v.y-center.y)/(radii.y*3)+rng()*.18,.56,1.2);
    const c=color.clone().multiplyScalar(light);
    colors.set([clamp(c.r,0,1),clamp(c.g,0,1),clamp(c.b,0,1)],i*3);
  }
  geo.setAttribute('color',new T.BufferAttribute(colors,3));
  geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
  return geo;
}
function combine(geometries){
  if(!geometries.length)return null;
  const merged=mergeGeometries(geometries,false);
  for(const g of geometries)g.dispose();
  if(!merged)throw new Error('Could not merge procedural tree geometry');
  merged.computeBoundingBox();merged.computeBoundingSphere();return merged;
}
function makeMesh(geometry,name,roughness){
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness:0,flatShading:true});
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.generatedBy='procedural-tree-v1';mesh.userData.ownGeometry=true;mesh.userData.ownMaterial=true;
  return mesh;
}
function build(p){
  const shape=random(p.seed,p.id,'skeleton'),barkRand=random(p.seed,p.id,'bark'),leafRand=random(p.seed,p.id,'foliage'),tintRand=random(p.seed,p.id,'tint');
  const height=p.height,h=height/3.5,lean=p.lean;
  const trunkColor=new T.Color('#76604c'),bark=[],leaves=[];
  const trunk=[new T.Vector3(0,0,0),new T.Vector3(.06*lean*h,height*.23,.025*h),new T.Vector3(.17*lean*h,height*.49,-.04*h),new T.Vector3(.11*lean*h,height*.74,.055*h),new T.Vector3(-.05*lean*h,height*.93,.02*h)];
  const radius=(.17+.07*p.age)*h;
  bark.push(barkTube(trunk,[radius*1.28,radius, radius*.76,radius*.43,radius*.10],p.quality==='hero'?9:7,barkRand,trunkColor));
  // Buttress roots follow the ground and make the trunk visibly anchored.
  for(let i=0;i<4;i++){
    const ang=(i+.16*shape())*Math.PI/2,dir=new T.Vector3(Math.cos(ang),0,Math.sin(ang));
    bark.push(barkTube([
      new T.Vector3(0,.35*h,0),dir.clone().multiplyScalar(.19*h).add(new T.Vector3(0,.17*h,0)),
      dir.clone().multiplyScalar(.48*h).add(new T.Vector3(0,.035*h,0))
    ],[radius*.47,radius*.31,.02*h],5,barkRand,trunkColor));
  }
  const branches=[];
  const branchCount=6+Math.round(p.age*2);
  for(let i=0;i<branchCount;i++){
    const az=i*2.39996+(shape()-.5)*.30;
    const radial=new T.Vector3(Math.cos(az),0,Math.sin(az));
    const level=.43+i/(branchCount-1)*.38;
    const start=trunk[2].clone().lerp(trunk[3],clamp((level-.49)/(.74-.49),0,1));start.y=height*level;
    const reach=(.55+shape()*.45)*p.canopySpread*h*(1-(level-.43)*.32);
    const mid=start.clone().addScaledVector(radial,reach*.53).add(new T.Vector3(0,reach*.52,0));
    const end=start.clone().addScaledVector(radial,reach).add(new T.Vector3(0,reach*(.67+shape()*.3),0));
    bark.push(barkTube([start,mid,end],[radius*(.52-i*.022),radius*.28,.015*h],p.quality==='hero'?7:5,barkRand,trunkColor));
    branches.push({end,radial,reach});
  }
  const crownColor=new T.Color(p.leafColor);
  const count=Math.round((7+p.age*5)*p.leafDensity);
  for(let i=0;i<count;i++){
    const b=branches[i%branches.length],jitter=(leafRand()-.5)*.40*h;
    const center=b.end.clone().addScaledVector(b.radial,jitter).add(new T.Vector3(0,(leafRand()-.5)*.35*h,0));
    const scale=(.39+leafRand()*.22)*p.canopySpread*h;
    const dims=new T.Vector3(scale*(1+.22*leafRand()),scale*(.84+.2*leafRand()),scale*(.82+.24*leafRand()));
    const color=crownColor.clone().lerp(new T.Color('#99ac62'),tintRand()*.20).multiplyScalar(.90+tintRand()*.20);
    leaves.push(foliageLobe(center,dims,leafRand,color,p.quality==='hero'?1:0));
  }
  if(count>0){
    const center=new T.Vector3(-.045*lean*h,height*.89,0),r=.52*p.canopySpread*h;
    leaves.push(foliageLobe(center,new T.Vector3(r,r*.85,r),leafRand,crownColor,p.quality==='hero'?1:0));
  }
  const result=[makeMesh(combine(bark),'Bark · curved trunk, branches and roots',.98)];
  if(leaves.length)result.push(makeMesh(combine(leaves),'Crown · asymmetric foliage masses',.91));
  return result;
}
function release(children){for(const node of children){node.removeFromParent();node.geometry.dispose();node.material.dispose();}}
/** Procedural, seed-stable, low-poly deciduous tree. Owns all mesh resources. */
export function createProceduralTree(input={}){
  const p=validate(input),root=new T.Group();root.name='Procedural broadleaf tree';root.add(...build(p));
  root.userData={assetId:'procedural-tree-v1',generatorVersion:1,units:'meters',upAxis:'Y',parameters:p};return root;
}
/** Regenerates generated meshes without changing the root's identity, transform or attachments. */
export function regenerateProceduralTree(root,patch={}){
  if(root?.userData?.assetId!=='procedural-tree-v1'||root.userData.disposed)throw new Error('Invalid/disposed procedural tree');
  if(patch.id!==undefined&&patch.id!==root.userData.parameters.id)throw new Error('Tree identity cannot change');
  const p=validate({...root.userData.parameters,...patch}),next=build(p),old=root.children.filter(c=>c.userData.generatedBy==='procedural-tree-v1');
  root.add(...next);release(old);root.userData.parameters=p;return root;
}
export function disposeProceduralTree(root){
  if(!root||root.userData.disposed)return;
  if(root.userData.assetId!=='procedural-tree-v1')throw new Error('Not a procedural tree');
  release(root.children.filter(c=>c.userData.generatedBy==='procedural-tree-v1'));
  root.removeFromParent();root.userData.disposed=true;
}