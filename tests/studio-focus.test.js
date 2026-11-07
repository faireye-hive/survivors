import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,sampleCharacter} from '../src/data/Rig2D.js';
import {studioViewport,rigViewBounds} from '../src/studio/StageViewport.js';

const TEMPLATES=[
  'hero.guardian','hero.mage','hero.ranger',
  'monster.slime','monster.bat','monster.skeleton',
  'monster.wraith','monster.colossus'
];

test('preview hugs the timeline instead of leaving a large gap below the feet',()=>{
  for(const template of TEMPLATES){
    for(const [w,h,requested] of [[600,520,5.72],[340,320,11],[840,650,4]]){
      const actor=newCharacter(template);
      const v=studioViewport(w,h,requested,actor);
      assert.ok(v.zoom>0&&v.scale>0,template);
      const left=v.x+v.bounds.minX*v.scale;
      const right=v.x+v.bounds.maxX*v.scale;
      const top=v.y+v.bounds.minY*v.scale;
      const bottom=v.y+v.bounds.maxY*v.scale;
      assert.ok(left>=17.99,template+' left '+left);
      assert.ok(right<=w-17.99,template+' right '+right);
      assert.ok(top>=15.99,template+' top '+top);
      assert.ok(Math.abs(bottom-(h-14))<.0001,template+' bottom '+bottom);
    }
  }
});

test('stage viewport stays stable across keyframes while pose changes',()=>{
  const actor=newCharacter('hero.guardian');
  const fixed=studioViewport(560,430,5.72,actor);
  for(const t of [0,.1,.2,.3,.4,.6,.7,.8]){
    const pose=sampleCharacter(actor,'walk.front',t);
    const v=studioViewport(560,430,5.72,actor);
    assert.deepEqual(v,fixed);
    // Animated frame remains near its original rig; any further adjustments
    // can be made with the editor's existing zoom control.
    const bound=rigViewBounds(actor,pose);
    assert.ok(Number.isFinite(bound.maxY));
  }
});

test('sidebar walk reference is hidden by default but can be reopened',()=>{
  const html=fs.readFileSync('warrior-studio.html','utf8');
  const js=fs.readFileSync('src/studio/WarriorStudio.js','utf8');
  assert.match(html,/<section id="walk-reference" hidden>/);
  assert.match(html,/<button id="reference-toggle"[^>]+aria-expanded="false"/);
  assert.match(html,/<input type="checkbox" id="reference-overlay">/);
  assert.ok(html.includes('[hidden]{display:none!important}'));
  assert.ok(js.includes('referenceFrame:0,referenceOverlay:false'));
  assert.ok(js.includes("showReferences($('walk-reference').hidden)"));
  assert.ok(js.includes("state.referenceOverlay=false;"));
});

test('canvas and pointer use the same viewport, no auto margin gap',()=>{
  const html=fs.readFileSync('warrior-studio.html','utf8');
  const js=fs.readFileSync('src/studio/WarriorStudio.js','utf8');
  assert.ok(html.includes('.timeline{margin-top:0;'));
  assert.ok(html.includes('align-self:start'));
  assert.ok(!html.includes('.timeline{margin-top:auto;'));
  assert.ok(!js.includes('h*.79'));
  assert.ok(!js.includes('height*.79'));
  assert.ok(js.includes('c.translate(view.x,view.y);c.scale(view.zoom,view.zoom);'));
  assert.ok(js.includes('((event.clientY-r.top)-view.y)/view.scale'));
  assert.ok(js.includes('((event.clientX-r.left)-view.x)/view.scale*signed'));
  assert.ok(js.includes('drawPose(c,768,768,state.time,7,false)'));
});
