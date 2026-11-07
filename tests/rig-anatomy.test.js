import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getRigHandles,drawRigActor} from '../src/render/characters/RigRenderer.js';
import {RIG_IDS,NODES,visibleRigNodes,rigOffsetRange,boundedRigValue,
  newRigProject,validateRigProject} from '../src/data/Rig2D.js';

test('monstros possuem anatomia específica, não corpo humano com pés e mãos extras',()=>{
  const expected={
    'monster.slime':['body','head','eyeL','eyeR','mouth'],
    'monster.bat':['body','head','eyeL','eyeR','mouth','armL','armR'],
    'monster.wraith':['body','head','eyeL','eyeR','armL','armR'],
    'monster.skeleton':['body','head','eyeL','eyeR','mouth','armL','handL','armR','handR','legL','legR'],
    'monster.colossus':['body','head','eyeL','eyeR','mouth','armL','armR','legL','legR']
  };
  for(const [id,nodes] of Object.entries(expected)){
    assert.deepEqual(visibleRigNodes(id),nodes,id);
    const handles=getRigHandles({},id);
    assert.deepEqual(Object.keys(handles),nodes,id);
    assert.ok(!nodes.includes('footL'),id+' não deve ter sapatos');
    assert.ok(!nodes.includes('footR'),id+' não deve ter sapatos');
    assert.ok(!nodes.includes('weapon'),id+' não recebe espada de humano');
    for(const joint of Object.values(handles)){
      assert.ok(Number.isFinite(joint.x)&&Number.isFinite(joint.y));
    }
  }
  assert.equal(visibleRigNodes('hero.guardian').length,Object.keys(NODES).length);
});
test('girar uma parte mantém o pivô conectado e movimenta os descendentes',()=>{
  const before=getRigHandles({},'hero.guardian');
  const after=getRigHandles({armR:{rotation:75}},'hero.guardian');
  assert.equal(after.armR.x,before.armR.x);
  assert.equal(after.armR.y,before.armR.y);
  assert.notEqual(after.handR.x,before.handR.x);
  assert.notEqual(after.weapon.y,before.weapon.y);
  const beforeLength=Math.hypot(before.handR.x-before.armR.x,before.handR.y-before.armR.y);
  const afterLength=Math.hypot(after.handR.x-after.armR.x,after.handR.y-after.armR.y);
  assert.ok(Math.abs(beforeLength-afterLength)<1e-8);
  const head=getRigHandles({head:{rotation:42}},'hero.guardian');
  assert.equal(head.head.x,before.head.x);
  assert.equal(head.head.y,before.head.y);
  assert.notEqual(head.eyeL.y,before.eyeL.y);
});
test('translações não desmontam juntas; rosto conserva ajuste fino',()=>{
  assert.deepEqual(rigOffsetRange('handL','x'),[0,0]);
  assert.deepEqual(rigOffsetRange('armR','y'),[0,0]);
  assert.deepEqual(rigOffsetRange('eyeL','x'),[-4,4]);
  assert.equal(boundedRigValue('armL','x',75),0);
  assert.equal(boundedRigValue('eyeL','x',99),4);
  const base=getRigHandles({},'hero.guardian');
  const corrupt=getRigHandles({armR:{x:80,y:-90},handR:{x:90,y:90}},'hero.guardian');
  assert.equal(base.armR.x,corrupt.armR.x);
  assert.equal(base.handR.y,corrupt.handR.y);
  const imported=newRigProject();
  imported.characters[0].clips[0].frames[0].pose.armL={x:40,rotation:33};
  const clean=validateRigProject(imported);
  assert.equal(clean.characters[0].clips[0].frames[0].pose.armL.x,0);
  assert.equal(clean.characters[0].clips[0].frames[0].pose.armL.rotation,33);
});
test('editor permite rotação visual e não manipula juntas por deslocamento livre',()=>{
  const js=fs.readFileSync('src/studio/WarriorStudio.js','utf8');
  const html=fs.readFileSync('warrior-studio.html','utf8');
  for(const token of ['tool-rotate','tool-move','rotation-dial','rotation-value']){
    assert.ok(html.includes('id="'+token+'"'),token);
  }
  assert.ok(js.includes('rotationKnob'));
  assert.ok(js.includes('rigOffsetRange'));
  assert.ok(js.includes("getRigHandles(currentPose(),character())"));
  assert.ok(js.includes("boundedRigValue(d.selected,'rotation',degrees)"));
  assert.ok(!js.includes("frame.pose[state.selected].x=round(clamp(nx,-90,90)"));
  assert.ok(html.includes('Cada espécie tem peças próprias'));
});
test('renderer aceita todas as espécies sem recorrer a rig humano invisível',()=>{
  let count=0,depth=0;
  const c=new Proxy({globalAlpha:1},{
    get(obj,k){
      if(k in obj)return obj[k];
      if(k==='save')return ()=>{depth++};
      if(k==='restore')return ()=>{depth--};
      return (...args)=>{for(const v of args)
        if(typeof v==='number')assert.ok(Number.isFinite(v),k);count++};
    },
    set(obj,k,v){obj[k]=v;return true}
  });
  for(const type of ['slime','bat','skeleton','wraith','colossus']){
    drawRigActor(c,{type,id:3,hit:0},100,120,2,{showHandles:true,selected:'body'});
  }
  assert.ok(count>100);
  assert.equal(depth,0);
  assert.equal(RIG_IDS.length,8);
});
