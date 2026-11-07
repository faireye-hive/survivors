import test from 'node:test';
import assert from 'node:assert/strict';
import {drawRigActor,getRigHandles} from '../src/render/characters/RigRenderer.js';
import {drawPlayer,drawEnemy} from '../src/render/Art.js';
import {RIG_IDS,NODES,newRigProject,newCharacter,validateRigProject,
  sampleCharacter,findClip,RIG_SCHEMA,RIG_VERSION} from '../src/data/Rig2D.js';

function mock(){
  let depth=0,draws=0;
  const c=new Proxy({globalAlpha:1},{
    get(o,k){
      if(k in o)return o[k];
      if(k==='save')return ()=>{depth++;};
      if(k==='restore')return ()=>{depth--;assert.ok(depth>=0);};
      if(k==='createLinearGradient'||k==='createRadialGradient')
        return ()=>({addColorStop(){}});
      return (...args)=>{
        for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),k);
        draws++;
      };
    },set(o,k,v){o[k]=v;return true;}
  });
  return {c,summary:()=>({depth,draws})};
}
test('heróis e monstros compartilham o mesmo Canvas 2D e rig de 14 peças',()=>{
  assert.ok(Object.keys(NODES).length>=14);
  assert.equal(RIG_IDS.length,8);
  const {c,summary}=mock();
  const playerClasses=['guardian','mage','ranger'];
  for(const classId of playerClasses){
    drawPlayer(c,{classId,vx:0,vy:0,facing:0,inv:0},140,190,.5);
    drawRigActor(c,{classId,vx:130,vy:0,attackPose:.2},140,190,.2,{face:'back'});
  }
  for(const type of ['slime','bat','skeleton','wraith','colossus']){
    drawEnemy(c,{type,id:1,radius:16,hp:10,maxHp:10,hit:0},140,190,.5);
  }
  assert.equal(summary().depth,0);
  assert.ok(summary().draws>400);
});
test('pivôs e hierarquia acompanham movimento da cabeça, olhos, mãos e arma',()=>{
  const neutral=getRigHandles({});
  const pose={head:{x:3,rotation:90,scale:1.3},armR:{rotation:35},
    weapon:{rotation:-20},footL:{rotation:15}};
  const joints=getRigHandles(pose);
  assert.equal(Object.keys(joints).length,Object.keys(NODES).length);
  assert.notEqual(joints.eyeL.x,neutral.eyeL.x);
  assert.notEqual(joints.eyeR.y,neutral.eyeR.y);
  // Articulated parts rotate around their fixed pivots.
  assert.equal(joints.armR.x,neutral.armR.x);
  assert.notEqual(joints.weapon.x,neutral.weapon.x);
  assert.equal(joints.footL.y,neutral.footL.y);
  assert.notEqual(joints.footL.rotation,neutral.footL.rotation);
  assert.equal(joints.head.scale,1.3);
});
test('exportação/importação JSON preserva IDs, frames e cores; rejeita payload inválido',()=>{
  const project=newRigProject();
  const copy=newCharacter('hero.guardian','custom.test','Novo Guerreiro');
  copy.clips[0].frames[1].pose.eyeL={x:2,scale:.5};
  project.characters.push(copy);
  const normalized=validateRigProject(JSON.parse(JSON.stringify(project)));
  assert.equal(normalized.schema,RIG_SCHEMA);
  assert.equal(normalized.version,RIG_VERSION);
  assert.equal(normalized.characters.at(-1).id,'custom.test');
  const pose=sampleCharacter(copy,'idle',.6);
  assert.equal(pose.eyeL.x,2);
  assert.throws(()=>validateRigProject({...project,version:999}),/incompatível/);
  const repeated=structuredClone(project);
  repeated.characters[1].id=repeated.characters[0].id;
  assert.throws(()=>validateRigProject(repeated),/ID/);
  const malicious=structuredClone(project);
  malicious.characters[0].clips[0].frames[0].pose.head={__proto__:null,x:Infinity};
  assert.throws(()=>validateRigProject(malicious),/Valor inválido/);
});
test('interpolação temporal de keyframes funciona em loop e pose única',()=>{
  const character=newCharacter('hero.mage');
  const c=findClip(character,'walk');
  const p=sampleCharacter(character,'walk',.175);
  assert.ok(Math.abs(p.legL.rotation)<21);
  assert.ok(Math.abs(p.legR.rotation)<21);
  assert.deepEqual(sampleCharacter(character,'idle',0),
    sampleCharacter(character,'idle',1.2));
  assert.equal(sampleCharacter(character,'attack',.56).weapon,undefined);
  assert.equal(c.loop,true);
});
