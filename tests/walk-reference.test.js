import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,validateRigProject,RIG_SCHEMA,RIG_VERSION} from '../src/data/Rig2D.js';
import {getRigHandles,drawRigActor} from '../src/render/characters/RigRenderer.js';
import {drawWalkReference} from '../src/studio/WalkReference.js';
import {WALK_DIRECTIONS,WALK_FRAME_LABELS,walkGuidePose,createDirectionalWalkClip,
  walkGuideClipId,resolveWalkAction,isWalkRig,actorWalkDirection} from '../src/data/WalkGuide.js';

function fakeCanvas(){
  let depth=0,draws=0;
  const c=new Proxy({globalAlpha:1},{
    get(obj,key){
      if(key in obj)return obj[key];
      if(key==='save')return ()=>{depth++;};
      if(key==='restore')return ()=>{depth--;assert.ok(depth>=0);};
      return (...args)=>{
        for(const arg of args)if(typeof arg==='number')
          assert.ok(Number.isFinite(arg),key);
        draws++;
      };
    },
    set(obj,key,value){obj[key]=value;return true;}
  });
  return {c,stats:()=>({depth,draws})};
}

test('guia disponibiliza quatro quadros por direção, com o fechamento correto',()=>{
  assert.deepEqual(WALK_DIRECTIONS,['front','back','left','right']);
  assert.equal(WALK_FRAME_LABELS.length,4);
  const ids=new Set();
  for(const direction of WALK_DIRECTIONS){
    const id=walkGuideClipId(direction);
    assert.ok(!ids.has(id));ids.add(id);
    const poses=[0,1,2,3].map(n=>walkGuidePose(direction,n));
    assert.ok(poses[0].legL.rotation!==poses[2].legL.rotation);
    assert.ok(poses[1].body.y!==poses[0].body.y);
    assert.ok(poses[0].armL.rotation*poses[0].legL.rotation<0);
    const clip=createDirectionalWalkClip(direction);
    assert.equal(clip.id,id);
    assert.equal(clip.loop,true);
    assert.equal(clip.frames.length,5);
    assert.deepEqual(clip.frames.map(f=>f.time),[0,.2,.4,.6,.8]);
    assert.deepEqual(clip.frames[4].pose,clip.frames[0].pose);
    assert.equal(clip.duration,.8);
  }
  assert.equal(ids.size,4);
  assert.throws(()=>walkGuidePose('diagonal',0),/Direção desconhecida/);
  assert.throws(()=>walkGuidePose('front',4),/Quadro desconhecido/);
});

test('cada direção tem sua própria animação e exporta JSON compatível',()=>{
  const hero=newCharacter('hero.guardian');
  const original=structuredClone(hero.clips.find(c=>c.id==='walk'));
  // Approved directional clips are now bundled by default.
  assert.equal(hero.clips.length,8);
  assert.equal(new Set(hero.clips.map(c=>c.id)).size,8);
  for(const direction of WALK_DIRECTIONS){
    assert.equal(resolveWalkAction(hero,'walk',direction),'walk.'+direction);
    assert.equal(resolveWalkAction(hero,'attack',direction),'attack');
  }
  assert.deepEqual(hero.clips.find(c=>c.id==='walk'),original,'a caminhada existente foi preservada');
  const raw={schema:RIG_SCHEMA,version:RIG_VERSION,characters:[hero]};
  const result=validateRigProject(JSON.parse(JSON.stringify(raw)));
  assert.equal(result.characters[0].clips.length,8);
  assert.deepEqual(result.characters[0].clips.find(c=>c.id==='walk.right').frames[4].pose,
    result.characters[0].clips.find(c=>c.id==='walk.right').frames[0].pose);
  const bare=newCharacter('hero.mage');
  bare.clips=bare.clips.filter(c=>!c.id.startsWith('walk.'));
  assert.equal(resolveWalkAction(bare,'walk','left'),'walk');
});

test('guia humanoide só é aplicado a personagens com braços e pernas',()=>{
  for(const id of ['hero.guardian','hero.mage','hero.ranger','monster.skeleton','monster.colossus'])
    assert.equal(isWalkRig(newCharacter(id)),true,id);
  for(const id of ['monster.slime','monster.bat','monster.wraith'])
    assert.equal(isWalkRig(newCharacter(id)),false,id);
  assert.equal(actorWalkDirection({vx:0,vy:100}),'front');
  assert.equal(actorWalkDirection({vx:0,vy:-100}),'back');
  assert.equal(actorWalkDirection({vx:-100,vy:0}),'left');
  assert.equal(actorWalkDirection({vx:100,vy:0}),'right');
});

test('dezesseis esqueletos de referência renderizam em Canvas 2D isolado',()=>{
  const {c,stats}=fakeCanvas();
  for(const direction of WALK_DIRECTIONS)
    for(let i=0;i<4;i++)drawWalkReference(c,direction,i,40,75,1.15,.55);
  assert.equal(stats().depth,0);
  assert.ok(stats().draws>500);
});

test('jogo escolhe o clip direcional, sem modificar a pose base walk',()=>{
  const hero=newCharacter('hero.guardian');
  const {c,stats}=fakeCanvas();
  const actual=drawRigActor(c,{classId:'guardian',vx:130,vy:0,inv:0},0,0,0,
    {character:hero,action:'walk',face:'right',time:0,shadow:false});
  const expected=getRigHandles(walkGuidePose('right',0),hero);
  assert.equal(actual.legL.rotation,expected.legL.rotation);
  assert.equal(actual.armR.rotation,expected.armR.rotation);
  assert.equal(stats().depth,0);
});

test('editor apresenta painel 4 × 4, overlay removível e criação não destrutiva',()=>{
  const html=fs.readFileSync('warrior-studio.html','utf8');
  const studio=fs.readFileSync('src/studio/WarriorStudio.js','utf8');
  for(const key of ['reference-grid','reference-overlay','reference-opacity',
    'reference-apply','reference-caption']){
    assert.ok(html.includes('id="'+key+'"'),key);
  }
  assert.ok(studio.includes('for(const direction of WALK_DIRECTIONS)'));
  assert.ok(studio.includes('for(let frame=0;frame<4;frame++)'));
  assert.ok(studio.includes("drawWalkReference(c,state.face,frame,0,0"));
  assert.ok(studio.includes('if(handles&&state.referenceOverlay&&isWalkRig(selected))'),
    'o PNG não deve conter guia');
  assert.ok(studio.includes("if(existing!==-1&&!confirm("),
    'antes de substituir uma animação existente, deve confirmar');
  assert.ok(studio.includes("state.clipId=id;state.time=replacement.duration*state.referenceFrame/4"));
});
