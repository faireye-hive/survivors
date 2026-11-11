import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// v1: FNV-1a (UTF-16 code units), then Mulberry32. Streams are keyed by
// semantic identity, so surface controls never consume shape randomness.
function random(seed, id, channel) {
  const text=JSON.stringify([seed,id,channel]);
  let state=2166136261;
  for(let i=0;i<text.length;i++)state=Math.imul(state^text.charCodeAt(i),16777619)>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let n=Math.imul(state^(state>>>15),1|state);
    n^=n+Math.imul(n^(n>>>7),61|n);
    return ((n^(n>>>14))>>>0)/4294967296;
  };
}
function parameters(input={}) {
  const p={seed:'aether-001',id:'ore-001',scale:1,weathering:.65,crystalAmount:.75,crystalColor:'#73d6c4',...input};
  for(const key of ['seed','id']){
    if(typeof p[key]!=='string'||!p[key].length||p[key].length>128)throw new TypeError(`${key}: use uma string de 1 a 128 caracteres`);
  }
  for(const [key,min,max] of [['scale',.1,5],['weathering',0,1],['crystalAmount',0,1]]){
    if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw new RangeError(`${key}: intervalo ${min}–${max}`);
  }
  if(typeof p.crystalColor!=='string'||!/^#[0-9a-f]{6}$/i.test(p.crystalColor))throw new TypeError('crystalColor: use #RRGGBB');
  return p;
}

// Intersect half-spaces, rather than jittering every vertex of a sphere.
// Each plane creates a broad fracture face; the bottom remains truly flat.
function fracturedBlock(rng,width,height,depth) {
  const planes=[
    new T.Plane(new T.Vector3(0,-1,0),0),
    new T.Plane(new T.Vector3(.18+rng()*.2,1,-.18+rng()*.12).normalize(),-height),
  ];
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const normal=new T.Vector3(Math.cos(a)/width,(rng()-.35)*.56/height,Math.sin(a)/depth).normalize();
    const reach=1/Math.hypot(Math.cos(a)/width,Math.sin(a)/depth);
    planes.push(new T.Plane(normal,-reach*(.83+rng()*.15)));
  }
  // Two oblique cuts make a broken shoulder instead of an even domed crown.
  for(const side of [-1,1]){
    const n=new T.Vector3(side*.55,.85,.2+(.2*rng())).normalize();
    planes.push(new T.Plane(n,-(height*.7+width*.28)));
  }
  const points=[],cross=new T.Vector3(),point=new T.Vector3();
  for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){
    const a=planes[i],b=planes[j],c=planes[k];
    cross.crossVectors(b.normal,c.normal);
    const determinant=a.normal.dot(cross);
    if(Math.abs(determinant)<1e-8)continue;
    point.copy(cross).multiplyScalar(-a.constant)
      .addScaledVector(new T.Vector3().crossVectors(c.normal,a.normal),-b.constant)
      .addScaledVector(new T.Vector3().crossVectors(a.normal,b.normal),-c.constant)
      .divideScalar(determinant);
    if(planes.every(p=>p.distanceToPoint(point)<1e-6)&&!points.some(p=>p.distanceToSquared(point)<1e-10))points.push(point.clone());
  }
  const geometry=new ConvexGeometry(points);
  return geometry;
}
function setColors(geometry,faceColor) {
  const p=geometry.attributes.position,n=geometry.attributes.normal,colors=new Float32Array(p.count*3);
  const center=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<p.count;i+=3){
    center.set(0,0,0);
    for(let j=0;j<3;j++)center.add(new T.Vector3().fromBufferAttribute(p,i+j));
    center.multiplyScalar(1/3);normal.fromBufferAttribute(n,i);
    const color=faceColor(center,normal,i/3);
    // glTF vertex colors are bounded data, even when users choose white crystals.
    color.r=T.MathUtils.clamp(color.r,0,1);color.g=T.MathUtils.clamp(color.g,0,1);color.b=T.MathUtils.clamp(color.b,0,1);
    for(let j=0;j<3;j++)color.toArray(colors,(i+j)*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  return geometry;
}
function merge(pieces) {
  const result=mergeGeometries(pieces,false);
  for(const piece of pieces)piece.dispose();
  if(!result)throw new Error('Falha ao combinar a geometria do minério');
  result.computeBoundingBox();result.computeBoundingSphere();return result;
}
function strata(geometry) {
  const p=geometry.attributes.position,n=geometry.attributes.normal,positions=[];
  const level=v=>v.y-.1*v.x+.16*v.z;
  function clip(vertices,bound,keepAbove) {
    const result=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length],da=level(a)-bound,db=level(b)-bound;
      const inside=keepAbove?da>=0:da<=0,nextInside=keepAbove?db>=0:db<=0;
      if(inside)result.push(a);
      if(inside!==nextInside)result.push(a.clone().lerp(b,da/(da-db)));
    }
    return result;
  }
  for(let i=0;i<p.count;i+=3){
    const normal=new T.Vector3().fromBufferAttribute(n,i);
    if(normal.y>.8||normal.y<-.2)continue;
    const triangle=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));
    for(const height of [.25,.53]){
      const polygon=clip(clip(triangle,height,true),height+.012,false);
      for(let j=1;j<polygon.length-1;j++){
        const face=[polygon[0],polygon[j],polygon[j+1]];
        if(new T.Vector3().subVectors(face[1],face[0]).cross(new T.Vector3().subVectors(face[2],face[0])).lengthSq()<1e-14)continue;
        for(const v of face)positions.push(...v.clone().addScaledVector(normal,.0015).toArray());
      }
    }
  }
  if(!positions.length)return null;
  const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.computeVertexNormals();
  return setColors(result,()=>new T.Color('#8b9c97'));
}
function mesh(geometry,material,name) {
  const node=new T.Mesh(geometry,material);node.name=name;
  node.castShadow=true;node.receiveShadow=true;
  node.userData.ownGeometry=true;node.userData.ownMaterial=true;node.userData.generatedBy='aether-ore-v1';
  return node;
}
function crystalGeometry(radius,height,rng) {
  const sides=6,points=[];
  const tipX=(rng()-.5)*radius*.6,tipZ=(rng()-.5)*radius*.6;
  for(let i=0;i<sides;i++){
    const angle=i*Math.PI/3;
    points.push(new T.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius));
    points.push(new T.Vector3(Math.cos(angle)*radius*.88,height*(.65+rng()*.08),Math.sin(angle)*radius*.88));
  }
  // An off-center termination preserves the prismatic body and sharp facets.
  points.push(new T.Vector3(tipX,height,tipZ));
  return new ConvexGeometry(points);
}
function build(p) {
  const parts=[],pieces=[],rng=random(p.seed,p.id,'mass');
  const stoneBase=new T.Color('#697d80'),stoneLight=new T.Color('#acb5ab'),stoneDark=new T.Color('#394b51');
  const blocks=[
    {x:-.33,z:-.12,w:.67,h:.91,d:.58,angle:-.18},
    {x:.38,z:.12,w:.53,h:.66,d:.57,angle:.24},
    {x:-.18,z:.48,w:.58,h:.3,d:.34,angle:-.12},
    {x:.38,z:-.5,w:.37,h:.4,d:.3,angle:.34},
  ];
  for(let i=0;i<blocks.length;i++){
    const b=blocks[i],shape=fracturedBlock(rng,b.w*(.92+rng()*.15),b.h*(.9+rng()*.2),b.d);
    shape.rotateY(b.angle+(rng()-.5)*.13);shape.translate(b.x,0,b.z);
    setColors(shape,(center,normal)=>{
      // Coplanar faces keep the same shade; variation follows strata and exposure.
      const stratum=Math.sin(center.y*10+.5)*.025;
      const face=.82+normal.y*.11+normal.z*.04+stratum;
      const color=stoneBase.clone().lerp(stoneLight,Math.max(0,normal.y)*.27);
      color.lerp(stoneDark,Math.max(0,1-center.y/.27)*.25*p.weathering);
      return color.multiplyScalar(face);
    });pieces.push(shape);
    const bands=strata(shape);if(bands)pieces.push(bands);
  }
  // Detached scree stays low and subordinate to the primary silhouette.
  for(let i=0;i<7;i++){
    const r=random(p.seed,p.id,`scree:${i}`),a=i*2.399+.3;
    const shape=fracturedBlock(r,.08+r()*.07,.045+r()*.065,.065+r()*.06);
    shape.rotateY(r()*Math.PI);shape.translate(Math.cos(a)*(1+r()*.13),0,Math.sin(a)*(.7+r()*.16));
    setColors(shape,(_,normal)=>stoneBase.clone().multiplyScalar(.8+normal.y*.18));pieces.push(shape);
  }
  const stone=mesh(merge(pieces),new T.MeshStandardMaterial({vertexColors:true,roughness:.97,metalness:0,flatShading:true}),'Fractured slate');
  parts.push(stone);stone.updateMatrixWorld(true);

  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0);
  const support=(x,z)=>{
    ray.set(new T.Vector3(x,2,z),down);
    return ray.intersectObject(stone,false)[0];
  };
  const crystals=[];
  const count=Math.round(p.crystalAmount*11);
  for(let i=0;i<count;i++){
    const r=random(p.seed,p.id,`crystal:${i}`);
    const z=-.34+i/10*.78,x=.065+z*.22+(r()-.5)*.2;
    const hit=support(x,z);if(!hit)continue;
    const height=(i===3?.8:.22+r()*.4),radius=(i===3?.115:.055+r()*.045);
    const shape=crystalGeometry(radius,height,r);
    const axis=new T.Vector3((r()-.5)*.8,.85+r()*.25,(r()-.5)*.6).normalize();
    shape.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,axis));
    shape.translate(hit.point.x,hit.point.y-.045,hit.point.z);
    setColors(shape,(_,normal)=>{
      const base=new T.Color(p.crystalColor);
      base.lerp(new T.Color('#d2f5e3'),Math.max(0,normal.y)*.52);
      return base.multiplyScalar(.7+Math.abs(normal.x)*.25+Math.max(0,normal.z)*.25);
    });crystals.push(shape);
  }
  if(crystals.length)parts.push(mesh(merge(crystals),new T.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:.08,flatShading:true,emissive:p.crystalColor,emissiveIntensity:.13}),'Exposed aether vein'));

  // Small surface islands on upward, sheltered faces; no floating green blobs.
  const moss=[],surface=stone.geometry.attributes.position,normals=stone.geometry.attributes.normal;
  for(let i=0;i<surface.count;i+=3){
    const normal=new T.Vector3().fromBufferAttribute(normals,i);
    if(normal.y<.45)continue;
    const r=random(p.seed,p.id,`moss:${i/3}`);
    const center=new T.Vector3();
    const vertices=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(surface,i+j));
    for(const vertex of vertices)center.add(vertex);center.multiplyScalar(1/3);
    if(center.x>-.14||center.y<.22||r()>p.weathering*.75)continue;
    const patch=new T.BufferGeometry(),points=[];
    for(const v of vertices)points.push(...v.lerp(center,.08+r()*.14).addScaledVector(normal,.004).toArray());
    patch.setAttribute('position',new T.Float32BufferAttribute(points,3));patch.computeVertexNormals();
    setColors(patch,()=>new T.Color('#667c4c').lerp(new T.Color('#9aa16a'),r()*.55));moss.push(patch);
  }
  if(moss.length)parts.push(mesh(merge(moss),new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true}),'Sheltered lichen'));
  for(const node of parts){
    node.geometry.scale(p.scale,p.scale,p.scale);node.geometry.computeBoundingBox();node.geometry.computeBoundingSphere();
  }
  return parts;
}
function release(children) {
  for(const node of children){node.removeFromParent();node.geometry.dispose();node.material.dispose();}
}

/** Y-up, meters, right-handed; origin on the ground. Each root owns its resources. */
export function createAetherOre(input={}) {
  const root=new T.Group();root.name='Afloramento de Éter';
  const p=parameters(input);
  root.add(...build(p));
  root.userData={assetId:'aether-ore-v1',generatorVersion:1,units:'meters',upAxis:'Y',parameters:p};
  return root;
}
/** Keep the caller-owned root, transform and parent unchanged. Invalid inputs are atomic. */
export function regenerateAetherOre(root,patch={}) {
  if(root.userData.assetId!=='aether-ore-v1'||root.userData.disposed)throw new Error('Modelo de minério inválido ou descartado');
  if(patch.id!==undefined&&patch.id!==root.userData.parameters.id)throw new Error('O ID do asset deve permanecer estável');
  const p=parameters({...root.userData.parameters,...patch}),next=build(p),previous=root.children.filter(n=>n.userData.generatedBy==='aether-ore-v1');
  root.add(...next);release(previous);root.userData.parameters=p;return root;
}
export function disposeAetherOre(root) {
  if(root.userData.disposed)return;
  release(root.children.filter(n=>n.userData.generatedBy==='aether-ore-v1'));root.removeFromParent();root.userData.disposed=true;
}
