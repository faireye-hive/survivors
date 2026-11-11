import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mountWarriorTemplate,releaseWarriorActor} from '../src/render/three/assets/WarriorActor.js';

function template(){
  const scene=new T.Group(),bone=new T.Bone();bone.name='Joint';
  const geometry=new T.BoxGeometry(.2,.2,.2),count=geometry.attributes.position.count;
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(count*4),4));
  const weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const mesh=new T.SkinnedMesh(geometry,new T.MeshStandardMaterial());mesh.add(bone);mesh.bind(new T.Skeleton([bone]));scene.add(mesh);
  const animations=['Idle','Walk','Attack'].map(name=>new T.AnimationClip(name,1,[new T.QuaternionKeyframeTrack('Joint.quaternion',[0,1],[0,0,0,1,0,Math.sin(.4),0,Math.cos(.4)])]));
  return {scene,animations};
}
function root(){const r=new T.Group(),model=new T.Group();r.add(model);r.userData.model=model;r.userData.rig={};return r;}

test('menu e jogo compartilham malhas mas têm esqueletos e animação independentes',()=>{
  const source=template(),a=root(),b=root();mountWarriorTemplate(a,source);mountWarriorTemplate(b,source);
  const boneA=a.getObjectByName('Joint'),boneB=b.getObjectByName('Joint');assert.notEqual(boneA,boneB);
  assert.equal(a.userData.asset,'fantasy-warrior');assert.equal(a.userData.rig,undefined);
  a.userData.animateWarrior({vx:10},0);a.userData.animateWarrior({vx:10},.1);
  assert.notDeepEqual(boneA.quaternion.toArray(),boneB.quaternion.toArray());
  const before=boneB.quaternion.clone();releaseWarriorActor(a);b.userData.animateWarrior({},0);b.userData.animateWarrior({},.1);
  assert.ok(!boneB.quaternion.equals(before));releaseWarriorActor(b);
});
test('carregamento atrasado não ressuscita personagem descartado nem apaga fallback inválido',()=>{
  const a=root(),old=a.userData.model;releaseWarriorActor(a);assert.equal(mountWarriorTemplate(a,template()),false);assert.equal(a.userData.model,old);
  const b=root(),previous=b.userData.model;assert.throws(()=>mountWarriorTemplate(b,{...template(),animations:[]}));assert.equal(b.userData.model,previous);
});
