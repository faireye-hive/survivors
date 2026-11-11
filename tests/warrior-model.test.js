import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function readGLB(name){
  const bytes=readFileSync(new URL(`../public/models/warrior/${name}.glb`,import.meta.url));
  assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.toString('utf8',20,20+length));
  const binary=bytes.subarray(28+length);
  return {json,binary};
}

for(const name of ['fantasy-warrior','fantasy-warrior-high']){
  test(`${name}: geometria finita, UVs e texturas PBR incorporadas`,()=>{
    const {json,binary}=readGLB(name);
    assert.equal(json.meshes.length,1);assert.equal(json.animations?.length||0,0);
    const material=json.materials[0];assert.ok(material.pbrMetallicRoughness.baseColorTexture);
    assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture);
    for(const im of json.images){assert.ok(Number.isInteger(im.bufferView));assert.equal(im.mimeType,'image/png');assert.equal(im.uri,undefined);}
    for(const prim of json.meshes[0].primitives){
      const position=json.accessors[prim.attributes.POSITION];
      assert.ok(Number.isInteger(prim.attributes.TEXCOORD_0));
      assert.ok(position.min.every(Number.isFinite));assert.ok(position.max.every(Number.isFinite));
      assert.ok(Math.abs(position.max[1]-position.min[1]-1.85)<.015,'Y-up, 1.85 meters');
      assert.ok(Math.abs(position.min[1])<.002,'feet grounded');
      const view=json.bufferViews[position.bufferView],offset=(view.byteOffset||0)+(position.byteOffset||0),stride=view.byteStride||12;
      for(let i=0;i<position.count;i++)for(let c=0;c<3;c++)assert.ok(Number.isFinite(binary.readFloatLE(offset+i*stride+c*4)));
      const indices=json.accessors[prim.indices],iv=json.bufferViews[indices.bufferView];
      const io=(iv.byteOffset||0)+(indices.byteOffset||0),bytes=indices.componentType===5125?4:2;
      for(let i=0;i<indices.count;i++){
        const index=bytes===4?binary.readUInt32LE(io+i*bytes):binary.readUInt16LE(io+i*bytes);
        assert.ok(index<position.count);
      }
    }
  });
}

test('versão otimizada preserva normal map e reduz ao menos 60% dos triângulos',()=>{
  const low=readGLB('fantasy-warrior').json,high=readGLB('fantasy-warrior-high').json;
  const count=j=>j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0);
  assert.ok(count(low)<count(high)*.4);assert.ok(count(low)>30000);
  assert.ok(low.materials[0].normalTexture);
  assert.equal(high.materials[0].normalTexture,undefined);
});

test('asset de jogo incorpora rig, três clipes e texturas com orçamento próprio',()=>{
  const {json,binary}=readGLB('fantasy-warrior-game');
  assert.equal(json.skins.length,1);assert.equal(json.skins[0].joints.length,19);
  assert.deepEqual(json.animations.map(a=>a.name).sort(),['Attack','Idle','Walk']);
  const prim=json.meshes[0].primitives[0];assert.ok(Number.isInteger(prim.attributes.JOINTS_0));assert.ok(Number.isInteger(prim.attributes.WEIGHTS_0));
  for(const im of json.images){const v=json.bufferViews[im.bufferView],offset=v.byteOffset||0;
    assert.ok(binary.readUInt32BE(offset+16)<=2048);assert.ok(binary.readUInt32BE(offset+20)<=2048);
  }
  const w=json.accessors[prim.attributes.WEIGHTS_0],v=json.bufferViews[w.bufferView],offset=(v.byteOffset||0)+(w.byteOffset||0),stride=v.byteStride||16;
  for(let i=0;i<w.count;i++){let total=0;for(let c=0;c<4;c++)total+=binary.readFloatLE(offset+i*stride+c*4);assert.ok(Math.abs(total-1)<1e-4);}
});
