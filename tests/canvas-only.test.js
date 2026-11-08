import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Renderer} from '../src/render/Renderer.js';
import {drawPlayer,drawEnemy,drawHazard} from '../src/render/Art.js';
import {drawWildCreature} from '../src/render/characters/WildCreatures.js';

test('o jogo usa Canvas 2D e não inclui uma interface de edição',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const renderer=fs.readFileSync('src/render/Renderer.js','utf8');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const vite=fs.readFileSync('vite.config.js','utf8');
  assert.equal(pkg.dependencies?.three,undefined);
  assert.ok(!html.includes('importmap'));
  assert.ok(!html.includes('warrior-studio'));
  assert.ok(!html.includes('mixamo-reference'));
  assert.ok(!/WebGL|warrior3D|render\/three|\.glb|\.fbx/.test(renderer));
  assert.ok(!/studio|warrior-compare|mixamo/.test(vite));
  assert.ok(renderer.includes('drawPlayer(c,p,w/2,h/2,game.elapsed)'));
  assert.equal(typeof drawPlayer,'function');
  assert.equal(typeof drawEnemy,'function');
  assert.equal(typeof drawWildCreature,'function');
  assert.equal(typeof drawHazard,'function');
  const display=new Renderer();
  assert.equal(typeof display.render,'function');
  assert.equal(display.warrior3D,undefined);
});

test('não restam arquivos de editores ou modelos 3D versionados',()=>{
  for(const path of [
    'warrior-studio.html','warrior-compare.html',
    'src/studio/WarriorStudio.js','src/studio/StageViewport.js',
    'src/studio/WalkReference.js',
    'mixamo-reference-studio.html','src/render/three'
  ])assert.equal(fs.existsSync(path),false,path);
  for(const folder of ['src/render/characters','public','src/data']){
    if(!fs.existsSync(folder))continue;
    for(const name of fs.readdirSync(folder))
      assert.ok(!/\.(glb|gltf|fbx|obj|mtl|zip)$/i.test(name),folder+'/'+name);
  }
});
