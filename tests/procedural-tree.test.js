import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createProceduralTree,regenerateProceduralTree,disposeProceduralTree} from '../src/render/three/assets/ProceduralTree.js';

function generated(root){return root.children.filter(c=>c.userData.generatedBy==='procedural-tree-v1');}
function signature(root){return generated(root).map(c=>Array.from(c.geometry.attributes.position.array));}
function inspect(root){
  const meshes=generated(root);assert.ok(meshes.length>=1&&meshes.length<=2);
  const bounds=new T.Box3().setFromObject(root);assert.ok(bounds.max.y>root.userData.parameters.height*.6);
  assert.ok(bounds.min.y>-.09);assert.ok(bounds.min.x<bounds.max.x&&bounds.min.z<bounds.max.z);
  for(const mesh of meshes){
    const geo=mesh.geometry,p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,col=geo.attributes.color;
    assert.ok(p.count>0&&p.count%3===0&&p.count===n.count&&p.count===uv.count&&p.count===col.count);
    for(const attr of [p,n,uv,col])assert.ok(Array.from(attr.array).every(Number.isFinite));
    assert.ok(col.array.every(v=>v>=0&&v<=1));
    assert.ok(geo.boundingBox&&!geo.boundingBox.isEmpty());assert.ok(geo.boundingSphere.radius>0);
    for(let i=0;i<p.count;i+=3){
      const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
      const cross=b.sub(a).cross(c.sub(a));assert.ok(cross.lengthSq()>1e-12,'No degenerate triangles');
    }
  }
}
test('Tree meshes are finite, grounded and have complete render attributes',()=>{
  for(const seed of ['grove-001','ancient-oak','windy','negative:-100'])for(const age of [0,.6,1])for(const quality of ['game','hero']){
    const tree=createProceduralTree({seed,age,quality});inspect(tree);disposeProceduralTree(tree);
  }
});
test('The same seed and ID always reproduce the same shape, independent of build order',()=>{
  const a=createProceduralTree({seed:'abc',id:'a'}),b=createProceduralTree({seed:'abc',id:'b'});
  const b2=createProceduralTree({seed:'abc',id:'b'}),a2=createProceduralTree({seed:'abc',id:'a'});
  assert.deepEqual(signature(a),signature(a2));assert.deepEqual(signature(b),signature(b2));
  assert.notDeepEqual(signature(a),signature(b));
  for(const tree of [a,b,b2,a2])disposeProceduralTree(tree);
});
test('Changing leaf color keeps the shape unchanged and zero density produces a bare tree',()=>{
  const a=createProceduralTree(),b=createProceduralTree({leafColor:'#ffffff'}),bare=createProceduralTree({leafDensity:0});
  assert.deepEqual(signature(a),signature(b));assert.equal(generated(bare).length,1);inspect(bare);
  for(const tree of [a,b,bare])disposeProceduralTree(tree);
});
test('Regeneration releases previous buffers, leaves attachments intact, and is atomic on invalid inputs',()=>{
  const scene=new T.Scene(),tree=createProceduralTree(),other=new T.Object3D();scene.add(tree);tree.add(other);
  tree.position.set(4,1,-9);tree.rotation.y=1.7;tree.scale.setScalar(.8);
  for(let i=0;i<12;i++){
    let disposed=0;const old=generated(tree);
    for(const m of old){m.geometry.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);}
    regenerateProceduralTree(tree,{seed:`fresh-${i}`,leafDensity:i%3/3});
    assert.equal(disposed,old.length*2);assert.equal(tree.parent,scene);assert.equal(other.parent,tree);
    assert.deepEqual(tree.position.toArray(),[4,1,-9]);assert.equal(tree.rotation.y,1.7);assert.equal(tree.scale.x,.8);
  }
  const before=signature(tree);
  for(const patch of [{height:0},{height:Infinity},{age:NaN},{leafDensity:2},{seed:''},{id:'changed'}, {leafColor:'bad'}, {quality:'ultra'}]){
    assert.throws(()=>regenerateProceduralTree(tree,patch));assert.deepEqual(signature(tree),before);
  }
  disposeProceduralTree(tree);disposeProceduralTree(tree);assert.equal(tree.parent,null);assert.equal(generated(tree).length,0);
  assert.throws(()=>regenerateProceduralTree(tree));
});
test('Game quality uses a bounded triangle budget and stable parameters',()=>{
  const tree=createProceduralTree({height:8,age:1,canopySpread:1.5,leafDensity:1,quality:'game'});
  const tris=generated(tree).reduce((sum,m)=>sum+m.geometry.attributes.position.count/3,0);
  assert.ok(tris<1800,`Too expensive for terrain instancing: ${tris} triangles`);
  assert.equal(tree.userData.parameters.height,8);inspect(tree);disposeProceduralTree(tree);
});