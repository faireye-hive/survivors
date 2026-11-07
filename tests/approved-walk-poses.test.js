import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_WALK_TEMPLATES,APPROVED_WALK_MIGRATION,RIG_STORAGE,
  newCharacter,newRigProject,readRigProject,storeRigProject,
  upgradeApprovedWalks,validateRigProject,RIG_SCHEMA,RIG_VERSION
} from '../src/data/Rig2D.js';
import {WALK_DIRECTIONS,createDirectionalWalkClip} from '../src/data/WalkPoseData.js';
import {resolveWalkAction} from '../src/data/WalkGuide.js';

// Exact rotation/time values copied from the user's 2026-11-07 rig2d JSON.
// Rows: body.y, body.rotation, head.rotation, legL, legR, armL, armR,
// footL, footR. The same poses were supplied for five biped templates.
const FRONT_BACK=[
  [0,-1,-2,-17.28,17.28,14,-14,3.2,-3.2],
  [-2.2,0,1.5,2.56,-5.76,-2.8,6.3,-6.4,3.84],
  [0,1,2,17.28,-17.28,-14,14,-3.2,3.2],
  [-2.2,0,-1.5,-5.76,2.56,6.3,-2.8,3.84,-6.4],
  [0,-1,-2,-17.28,17.28,14,-14,3.2,-3.2]
];
const LEFT_RIGHT=[
  [0,-2,-1.3,-27,27,20,-20,5,-5],
  [-2.2,0,0.9750000000000001,4,-9,-4,9,-10,6],
  [0,2,1.3,27,-27,-20,20,-5,5],
  [-2.2,0,-0.9750000000000001,-9,4,9,-4,6,-10],
  [0,-2,-1.3,-27,27,20,-20,5,-5]
];
function frameValues(p){
  return [p.body.y,p.body.rotation,p.head.rotation,
    p.legL.rotation,p.legR.rotation,p.armL.rotation,p.armR.rotation,
    p.footL.rotation,p.footR.rotation];
}
test('as 100 poses direcionais aprovadas correspondem exatamente ao arquivo enviado',()=>{
  assert.deepEqual(APPROVED_WALK_TEMPLATES,[
    'hero.guardian','hero.mage','hero.ranger','monster.skeleton','monster.colossus'
  ]);
  assert.deepEqual(WALK_DIRECTIONS,['front','back','left','right']);
  let compared=0;
  for(const template of APPROVED_WALK_TEMPLATES){
    const char=newCharacter(template);
    assert.equal(char.clips.length,8);
    assert.equal(new Set(char.clips.map(c=>c.id)).size,8);
    for(const direction of WALK_DIRECTIONS){
      const clip=char.clips.find(c=>c.id==='walk.'+direction);
      const approved=createDirectionalWalkClip(direction);
      assert.deepEqual(clip,approved);
      assert.equal(clip.duration,.8);
      assert.equal(clip.loop,true);
      assert.deepEqual(clip.frames.map(f=>f.time),[0,.2,.4,.6,.8]);
      const expected=direction==='front'||direction==='back'?FRONT_BACK:LEFT_RIGHT;
      for(let i=0;i<5;i++){
        assert.deepEqual(frameValues(clip.frames[i].pose),expected[i],
          template+' '+direction+' pose '+i);
        compared++;
      }
      assert.equal(resolveWalkAction(char,'walk',direction),'walk.'+direction);
    }
  }
  assert.equal(compared,100);
  for(const template of ['monster.slime','monster.bat','monster.wraith']){
    const char=newCharacter(template);
    assert.equal(char.clips.length,4,'não inserir animação de bípede em '+template);
  }
});
test('projeto padrão e exportação JSON incluem 8 personagens, sem IDs duplicados',()=>{
  const project=newRigProject();
  assert.equal(project.characters.length,8);
  assert.equal(project.schema,RIG_SCHEMA);
  assert.equal(project.version,RIG_VERSION);
  const safe=validateRigProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(safe,project);
  assert.equal(safe.characters.filter(c=>c.clips.length===8).length,5);
  assert.equal(safe.characters.filter(c=>c.clips.length===4).length,3);
});
test('migração adiciona somente walk direction ausentes, sem trocar edições salvas',()=>{
  const project=newRigProject();
  const hero=project.characters.find(c=>c.id==='hero.guardian');
  const before=hero.clips.find(c=>c.id==='walk.front');
  before.frames[0].pose.head.rotation=37;
  hero.colors.accent='#123456';
  hero.clips=hero.clips.filter(c=>c.id!=='walk.left'&&c.id!=='walk.back');
  const custom=newCharacter('hero.guardian','custom.test','Meu herói');
  custom.clips=custom.clips.filter(c=>!c.id.startsWith('walk.'));
  project.characters.push(custom);
  assert.equal(upgradeApprovedWalks(project),true);
  assert.equal(hero.clips.find(c=>c.id==='walk.front').frames[0].pose.head.rotation,37);
  assert.equal(hero.clips.find(c=>c.id==='walk.back').frames[0].pose.head.rotation,-2);
  assert.equal(hero.colors.accent,'#123456');
  assert.equal(custom.clips.length,4);
  assert.equal(upgradeApprovedWalks(project),false);
  assert.doesNotThrow(()=>validateRigProject(project));
});
test('migração do navegador é aditiva e roda apenas uma vez',()=>{
  const old=globalThis.localStorage;
  const initial=newRigProject();
  const guardian=initial.characters.find(c=>c.id==='hero.guardian');
  guardian.clips=guardian.clips.filter(c=>c.id!=='walk.back');
  const data=new Map([[RIG_STORAGE,JSON.stringify(initial)]]);
  globalThis.localStorage={
    getItem:key=>data.get(key)??null,
    setItem:(key,value)=>data.set(key,value)
  };
  try{
    const restored=readRigProject();
    assert.ok(restored.characters[0].clips.some(c=>c.id==='walk.back'));
    assert.equal(data.get(APPROVED_WALK_MIGRATION),'1');
    assert.equal(JSON.parse(data.get(RIG_STORAGE)).characters[0].clips.length,8);
    // After the first migration users may intentionally delete or edit
    // a clip. Reload must never overwrite their edits.
    const clip=restored.characters[0].clips.find(c=>c.id==='walk.front');
    clip.frames[0].pose.head.rotation=44;
    restored.characters[0].clips=restored.characters[0].clips.filter(c=>c.id!=='walk.back');
    storeRigProject(restored);
    const again=readRigProject();
    assert.equal(again.characters[0].clips.find(c=>c.id==='walk.front').frames[0].pose.head.rotation,44);
    assert.equal(again.characters[0].clips.some(c=>c.id==='walk.back'),false);
  }finally{
    if(old===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
});
