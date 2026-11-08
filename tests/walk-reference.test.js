import test from 'node:test';
import assert from 'node:assert/strict';
import {newCharacter,validateRigProject,RIG_SCHEMA,RIG_VERSION} from '../src/data/Rig2D.js';
import {getRigHandles,drawRigActor} from '../src/render/characters/RigRenderer.js';
import {WALK_DIRECTIONS,walkGuidePose,createDirectionalWalkClip,
  walkGuideClipId,resolveWalkAction,actorWalkDirection} from '../src/data/WalkGuide.js';

test('as quatro direções mantêm as poses aprovadas para o jogo',()=>{
  assert.deepEqual(WALK_DIRECTIONS,['front','back','left','right']);
  const hero=newCharacter('hero.guardian');
  const ids=new Set(hero.clips.map(c=>c.id));
  assert.equal(hero.clips.length,8);
  for(const direction of WALK_DIRECTIONS){
    const id=walkGuideClipId(direction);
    const clip=hero.clips.find(c=>c.id===id);
    assert.ok(clip&&clip.loop);
    assert.equal(clip.frames.length,5);
    assert.deepEqual(clip.frames.map(f=>f.time),[0,.2,.4,.6,.8]);
    assert.deepEqual(clip.frames[4].pose,clip.frames[0].pose);
    assert.equal(resolveWalkAction(hero,'walk',direction),id);
    assert.equal(resolveWalkAction(hero,'attack',direction),'attack');
    assert.ok(ids.has(id));
    assert.notEqual(walkGuidePose(direction,0).legL.rotation,
      walkGuidePose(direction,2).legL.rotation);
    assert.deepEqual(createDirectionalWalkClip(direction),clip);
  }
  const data={schema:RIG_SCHEMA,version:RIG_VERSION,characters:[hero]};
  assert.deepEqual(validateRigProject(JSON.parse(JSON.stringify(data))),data);
});
test('a direção no jogo segue o vetor de movimento',()=>{
  assert.equal(actorWalkDirection({vx:0,vy:120}),'front');
  assert.equal(actorWalkDirection({vx:0,vy:-120}),'back');
  assert.equal(actorWalkDirection({vx:-100,vy:0}),'left');
  assert.equal(actorWalkDirection({vx:100,vy:0}),'right');
  const hero=newCharacter('hero.guardian');
  let depth=0;
  const c=new Proxy({globalAlpha:1},{
    get(o,k){
      if(k in o)return o[k];
      if(k==='save')return ()=>depth++;
      if(k==='restore')return ()=>depth--;
      return ()=>{};
    },
    set(o,k,v){o[k]=v;return true;}
  });
  const actual=drawRigActor(c,{classId:'guardian',vx:120,vy:0},0,0,0,
    {character:hero,action:'walk',face:'right',time:0,shadow:false});
  const expected=getRigHandles(walkGuidePose('right',0),hero);
  assert.equal(actual.legL.rotation,expected.legL.rotation);
  assert.equal(actual.armR.rotation,expected.armR.rotation);
  assert.equal(depth,0);
});
