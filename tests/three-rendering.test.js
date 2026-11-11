import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {humanoid,creature,animateActor} from '../src/render/three/Models.js';
import {createFortress,createGate} from '../src/render/three/Environment.js';
import {Renderer3D} from '../src/render/three/Renderer3D.js';

function validModel(root){
  let meshes=0;
  root.updateMatrixWorld(true);
  root.traverse(node=>{
    assert.ok(node.matrixWorld.elements.every(Number.isFinite));
    if(node.isMesh){meshes++;assert.ok(node.geometry.attributes.position.count>0);}
  });
  assert.ok(meshes>0);
  const bounds=new T.Box3().setFromObject(root);
  assert.ok(!bounds.isEmpty());assert.ok(bounds.max.y>bounds.min.y);
}
test('um personagem articulado assume as três formas com corpo e pivôs comuns',()=>{
  const heroes=['guardian','mage','ranger'].map(form=>humanoid(form));
  for(const hero of heroes){
    validModel(hero);assert.ok(hero.userData.rig);
    const rig=hero.userData.rig,before=rig.left.position.clone();
    animateActor(hero,{vx:100,vy:0,facing:0,attackPose:.13},.2);
    assert.ok(rig.left.position.equals(before));
    assert.notEqual(rig.left.rotation.x,0);assert.notEqual(rig.armR.rotation.x,0);
  }
  assert.deepEqual(heroes[0].userData.rig.left.position.toArray(),heroes[1].userData.rig.left.position.toArray());
  assert.deepEqual(heroes[1].userData.rig.armR.position.toArray(),heroes[2].userData.rig.armR.position.toArray());
});
test('todas as espécies possuem geometria tridimensional e animação finita',()=>{
  for(const type of ['slime','bat','skeleton','spore','spider','wraith','colossus']){
    const model=creature(type);animateActor(model,{id:7,vx:10,vy:40,hit:.1},2);validModel(model);
    if(['slime','bat','spider','spore','wraith'].includes(type))assert.equal(model.userData.rig,undefined);
  }
});
test('fortalezas e portais materializam edifícios, locais vazios e obra em andamento',()=>{
  const label=()=>new T.Group();
  const fort=createFortress(2,{buildings:{tower:2,lumber:1,quarry:0,wall:1},workers:[{role:'guard'}],integrity:85},label);
  assert.equal(fort.position.x,72);assert.ok(fort.userData.project.fill);assert.equal(fort.userData.workers.length,3);validModel(fort);
  validModel(createGate(label,{name:'Veyra',cost:180,wood:25,stone:12}));
});
test('sincronização remove modelos mortos e expirados sem acumular objetos na cena',()=>{
  const renderer=Object.create(Renderer3D.prototype);renderer.collections=new Map();renderer.scene=new T.Scene();
  renderer.release=root=>renderer.scene.remove(root);
  const a={hp:10},b={hp:5};
  renderer.sync('actors',[a,b],()=>humanoid(),()=>{});assert.equal(renderer.scene.children.length,2);
  a.hp=0;renderer.sync('actors',[a,b],()=>humanoid(),()=>{});assert.equal(renderer.scene.children.length,1);
  renderer.sync('actors',[],()=>humanoid(),()=>{});assert.equal(renderer.scene.children.length,0);
});
