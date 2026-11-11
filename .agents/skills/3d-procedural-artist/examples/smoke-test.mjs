// Node-only structural smoke test, no render: validates the generator's APIs and stage consistency.
// Run from this directory: node smoke-test.mjs
import assert from 'node:assert/strict';
import {createFortress,setFortressProgress,disposeFortress} from './fortress-generator.js';
class Vector3 {
  constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
  set(x,y,z){Object.assign(this,{x,y,z});return this;}
  copy(b){return this.set(b.x,b.y,b.z);}
  clone(){return new Vector3(this.x,this.y,this.z);}
  add(b){return this.set(this.x+b.x,this.y+b.y,this.z+b.z);}
  sub(b){return this.set(this.x-b.x,this.y-b.y,this.z-b.z);}
  multiplyScalar(s){return this.set(this.x*s,this.y*s,this.z*s);}
  length(){return Math.hypot(this.x,this.y,this.z);}
  normalize(){return this.multiplyScalar(1/this.length());}
}
class Obj {
  constructor(){this.children=[];this.userData={};this.position=new Vector3();this.rotation={x:0,y:0,z:0};this.quaternion={setFromUnitVectors(){}};this.visible=true;this.matrix={};}
  add(m){this.children.push(m);m.parent=this;}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(v=>v!==this);}
  updateMatrix(){}
  traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}
}
class Geo{
  constructor(...args){this.args=args;this.attrs={};Geo.all.push(this);}
  setAttribute(k,v){this.attrs[k]=v;}
  computeVertexNormals(){}computeBoundingBox(){}computeBoundingSphere(){}translate(){return this;}dispose(){this.disposed=true;}
}Geo.all=[];
class Shape{moveTo(){}lineTo(){}closePath(){}absarc(){}}
class Mesh extends Obj{constructor(geo,mat){super();this.geometry=geo;this.material=mat;}}
class InstancedMesh extends Mesh{setMatrixAt(){}}
class Mat{constructor(cfg){this.cfg=cfg;}dispose(){this.disposed=true;}}
class Attr{constructor(array,items){this.array=array;this.itemSize=items;}}
const T={Group:Obj,Mesh,InstancedMesh,MeshStandardMaterial:Mat,BoxGeometry:Geo,PlaneGeometry:Geo,
  CylinderGeometry:Geo,ExtrudeGeometry:Geo,BufferGeometry:Geo,Shape,Object3D:Obj,Vector3,
  Float32BufferAttribute:Attr};
const base=createFortress(T,{size:22,seed:7,progress:0});
assert.equal(base.userData.progress,0);
assert.ok(base.userData.stageGroups.length>15);
assert.ok(base.userData.stageGroups.every(x=>typeof x.userData.revealAt==='number'));
assert.ok(base.userData.stageGroups.some(x=>!x.visible));
setFortressProgress(base,.6);const state=base.userData.stageGroups.map(x=>x.visible);
setFortressProgress(base,.6);assert.deepEqual(base.userData.stageGroups.map(x=>x.visible),state);
setFortressProgress(base,1);assert.ok(base.userData.stageGroups.every(x=>x.visible));
for(const g of Geo.all){
  if(g.attrs.position){
    assert.equal(g.attrs.position.array.length%9,0,'Geometry must contain complete triangles');
    assert.equal(g.attrs.position.array.length/3*2,g.attrs.uv.array.length,'UVs and vertices must match');
    assert.ok(g.attrs.position.array.every(Number.isFinite),'Positions must be finite');
  }
}
const count=Geo.all.length;
assert.ok(count>30,'Expected detailed procedural assembly');
disposeFortress(base);
assert.ok(Geo.all.every(g=>g.disposed));
console.log('OK: deterministic stage API, complete mesh buffers, disposal,',count,'geometry objects.');
console.log('Reminder: no actual image was rendered in this test.');