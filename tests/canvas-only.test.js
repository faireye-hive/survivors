import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Renderer } from '../src/render/Renderer.js';
import { drawPlayer } from '../src/render/Art.js';

test('o jogo e o ateliê utilizam exclusivamente Canvas 2D',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const studio=fs.readFileSync('warrior-studio.html','utf8');
  const renderer=fs.readFileSync('src/render/Renderer.js','utf8');
  const editor=fs.readFileSync('src/studio/WarriorStudio.js','utf8');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const vite=fs.readFileSync('vite.config.js','utf8');
  assert.equal(pkg.dependencies?.three,undefined);
  assert.ok(!html.includes('importmap'));
  assert.ok(!html.includes('mixamo-reference'));
  assert.ok(!html.includes('warrior-compare'));
  assert.ok(!studio.includes('hero-3d'));
  assert.ok(editor.includes("getContext('2d')"));
  assert.ok(editor.includes('drawPlayer('));
  assert.ok(!/WebGL|warrior3D|render\/three|\.glb|\.fbx/.test(renderer));
  assert.ok(!/mixamo|compare|animationStudio/.test(vite));
  assert.ok(renderer.includes('drawPlayer(c,p,w/2,h/2,game.elapsed)'));
  assert.equal(typeof drawPlayer,'function');
  const display=new Renderer();
  assert.equal(typeof display.render,'function');
  assert.equal(display.warrior3D,undefined);
});
test('não resta módulo, modelo ou exportador 3D versionado',()=>{
  for(const path of ['src/render/three','public/models','scripts','src/studio']){
    if(!fs.existsSync(path))continue;
    const names=fs.readdirSync(path);
    for(const name of names){
      assert.ok(!/\.(glb|gltf|fbx|obj|mtl|zip)$/i.test(name),path+'/'+name);
      assert.ok(!/mixamo|tpose|rigviewport|compare|animationdata|sculpt|refined/i.test(name),path+'/'+name);
    }
  }
  for(const path of ['warrior-compare.html','mixamo-reference-studio.html',
    'warrior-animation-studio.html','src/render/three/WarriorStage.js']){
    assert.equal(fs.existsSync(path),false,path);
  }
});
