import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAetherOre,regenerateAetherOre,disposeAetherOre} from '../src/render/three/assets/AetherOre.js';
import {exportOre} from '../scripts/export-aether-ore.mjs';

const shape=root=>root.children.filter(n=>n.isMesh).map(n=>({name:n.name,positions:Array.from(n.geometry.attributes.position.array)}));
function inspect(root){
  let count=0;
  root.traverse(n=>{
    if(!n.isMesh)return;
    count++;
    const g=n.geometry,p=g.attributes.position,normal=g.attributes.normal,color=g.attributes.color;
    assert.ok(p.count>0);assert.equal(p.count%3,0);assert.equal(p.count,normal.count);assert.equal(p.count,color.count);
    assert.ok(Array.from(p.array).every(Number.isFinite));assert.ok(Array.from(color.array).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
    assert.ok(g.boundingBox&&!g.boundingBox.isEmpty());assert.ok(g.boundingSphere.radius>0);
    const scale=root.userData.parameters?.scale??1;
    for(let i=0;i<p.count;i+=3){
      const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
      const cross=b.sub(a).cross(c.sub(a));
      assert.ok(cross.length()>scale*scale*1e-10,`${n.name}: degenerate triangle ${i/3}`);
      for(let j=0;j<3;j++){
        const norm=new T.Vector3().fromBufferAttribute(normal,i+j);
        assert.ok(Math.abs(norm.length()-1)<1e-5);assert.ok(cross.dot(norm)>0);
      }
    }
  });
  assert.ok(count>=1&&count<=3);
  const bounds=new T.Box3().setFromObject(root);assert.ok(bounds.min.y>=-1e-6);assert.ok(bounds.max.y>0);
}
test('afloramentos geram superfícies válidas, finitas e apoiadas em diferentes seeds e escalas',()=>{
  for(const seed of ['aether-001','floresta','ruina-35','a','seed:negative:-12'])for(const scale of [.1,1,5])for(const crystalAmount of [0,1]){
    const root=createAetherOre({seed,scale,crystalAmount});inspect(root);disposeAetherOre(root);
  }
});
test('a seed reproduz a forma sem depender da ordem de criação',()=>{
  const a=createAetherOre({id:'A'}),b=createAetherOre({id:'B'}),b2=createAetherOre({id:'B'}),a2=createAetherOre({id:'A'});
  assert.deepEqual(shape(a),shape(a2));assert.deepEqual(shape(b),shape(b2));assert.notDeepEqual(shape(a),shape(b));
  for(const root of [a,b,b2,a2])disposeAetherOre(root);
});
test('cor e desgaste preservam a geometria da rocha; a escala é uniforme',()=>{
  const a=createAetherOre(),b=createAetherOre({weathering:0,crystalColor:'#ffffff'}),c=createAetherOre({scale:2});
  inspect(b);
  assert.deepEqual(shape(a).slice(0,2),shape(b).slice(0,2));
  const p=a.children[0].geometry.attributes.position.array,q=c.children[0].geometry.attributes.position.array;
  assert.equal(p.length,q.length);for(let i=0;i<p.length;i++)assert.equal(q[i],p[i]*2);
  for(const root of [a,b,c])disposeAetherOre(root);
});
test('regeneração preserva identidade, composição e objetos externos e descarta recursos antigos',()=>{
  const scene=new T.Scene(),sentinel=new T.Group(),root=createAetherOre(),attachment=new T.Group();scene.add(root,sentinel);root.add(attachment);
  root.position.set(5,0,-8);root.rotation.y=.3;root.scale.setScalar(.7);
  for(let i=0;i<15;i++){
    const old=root.children.filter(n=>n.isMesh);let geos=0,mats=0;
    for(const m of old){m.geometry.addEventListener('dispose',()=>geos++);m.material.addEventListener('dispose',()=>mats++);}
    regenerateAetherOre(root,{seed:`iteration-${i}`});
    assert.equal(geos,old.length);assert.equal(mats,old.length);assert.equal(root.parent,scene);
    assert.deepEqual(root.position.toArray(),[5,0,-8]);assert.equal(root.rotation.y,.3);assert.equal(root.scale.x,.7);
    assert.equal(attachment.parent,root);assert.equal(scene.children.length,2);
  }
  const previous=shape(root);
  for(const patch of [{scale:0},{scale:Infinity},{weathering:NaN},{crystalAmount:2},{seed:''},{id:'different'},{crystalColor:'bad'}]){
    assert.throws(()=>regenerateAetherOre(root,patch));assert.deepEqual(shape(root),previous);
  }
  disposeAetherOre(root);disposeAetherOre(root);assert.deepEqual(scene.children,[sentinel]);assert.equal(attachment.parent,root);
  assert.throws(()=>regenerateAetherOre(root));
});
test('GLB pode ser reaberto e corresponde ao asset publicado e aos seus parâmetros',async()=>{
  const {buffer,manifest}=await exportOre(),repeat=await exportOre();
  // Exact reproduction is asserted within this runtime. V8 versions may
  // serialize material colors with slightly different final decimal digits.
  assert.deepEqual(Buffer.from(buffer),Buffer.from(repeat.buffer));
  const glb=await readFile(new URL('../public/models/aether-ore.glb',import.meta.url));
  const stored=JSON.parse(await readFile(new URL('../public/models/aether-ore.json',import.meta.url),'utf8'));
  for(const key of ['asset','generatorVersion','threeRevision','units','upAxis','origin','parameters','triangles','materials'])assert.deepEqual(manifest[key],stored[key]);
  assert.equal(stored.bytes,glb.byteLength);assert.equal(manifest.bytes,buffer.byteLength);
  const fresh=await new GLTFLoader().parseAsync(buffer,'');
  const published=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');
  const meshes=root=>{const list=[];root.traverse(n=>{if(n.isMesh)list.push(n);});return list;};
  const generatedMeshes=meshes(fresh.scene),publishedMeshes=meshes(published.scene);
  assert.equal(generatedMeshes.length,publishedMeshes.length);
  for(let i=0;i<generatedMeshes.length;i++){
    const a=generatedMeshes[i],b=publishedMeshes[i];assert.equal(a.name,b.name);
    assert.deepEqual(Object.keys(a.geometry.attributes),Object.keys(b.geometry.attributes));
    for(const key of Object.keys(a.geometry.attributes)){
      const x=a.geometry.attributes[key].array,y=b.geometry.attributes[key].array;assert.equal(x.length,y.length);
      for(let j=0;j<x.length;j++)assert.ok(Math.abs(x[j]-y[j])<1e-6,`${a.name}: ${key}[${j}]`);
    }
    assert.deepEqual(a.geometry.index?.array,b.geometry.index?.array);
    assert.deepEqual(a.matrix.toArray(),b.matrix.toArray());
    for(const key of ['roughness','metalness','emissiveIntensity'])assert.equal(a.material[key],b.material[key]);
    for(const key of ['color','emissive'])a.material[key].toArray().forEach((v,j)=>assert.ok(Math.abs(v-b.material[key].toArray()[j])<1e-12));
  }
  let triangles=0;published.scene.traverse(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;assert.ok(n.material.vertexColors);}});
  assert.equal(triangles,stored.triangles);assert.equal(publishedMeshes.length,stored.materials);
  const size=new T.Box3().setFromObject(published.scene).getSize(new T.Vector3()).toArray();
  size.forEach((v,i)=>{assert.ok(Math.abs(v-stored.size[i])<1e-5);assert.ok(Math.abs(v-manifest.size[i])<1e-5);});
  for(const m of [...generatedMeshes,...publishedMeshes]){m.geometry.dispose();m.material.dispose();}
});
