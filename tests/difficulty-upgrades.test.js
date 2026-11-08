import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {threatAt,THREAT_STAGES} from '../src/data/difficulty.js';
import {ENCOUNTERS} from '../src/data/encounters.js';
import {ENEMIES} from '../src/data/enemies.js';
import {spawnEnemy,updateEnemies} from '../src/systems/Enemies.js';
import {STAT_UPGRADES} from '../src/data/upgrades.js';
import {WEAPONS} from '../src/data/weapons.js';
import {createChoices,applyChoice} from '../src/systems/Progression.js';
import {UPGRADE_ICON_PATHS,createUpgradeIcon} from '../src/ui/UpgradeIcons.js';

function game(t=0){
  return {
    width:800,height:600,elapsed:t,spawnTimer:10,state:'playing',
    player:{x:0,y:0,radius:16,hp:140,maxHp:140,armor:1,inv:0,
      might:1,speed:200,magnet:75,xp:0,nextXp:300,level:1},
    enemies:[],hazards:[],drops:[],projectiles:[],effects:[],particles:[],
    floatTexts:[],weapons:[{id:'blade',level:1,cooldown:.2}],upgrades:{},
    bossFlags:{first:true,second:true},
    encountersSeen:new Set(ENCOUNTERS.map(e=>e.id)),
    audio:{play(){}},burst(){},addText(){},
    finish(){this.state='lost'}
  };
}

test('ameaça aumenta em 4 fases e mantém uma evolução sem saltos bruscos de atributos',()=>{
  assert.deepEqual(THREAT_STAGES.map(s=>s.at),[0,75,210,360]);
  assert.deepEqual([0,74,75,209,210,359,360,480].map(t=>threatAt(t).pack),
    [2,2,3,3,4,4,5,5]);
  const points=[0,75,150,210,300,360,480].map(threatAt);
  for(let i=1;i<points.length;i++){
    assert.ok(points[i].interval<=points[i-1].interval,'spawns mais frequentes');
    assert.ok(points[i].health>points[i-1].health,'inimigos resistem mais');
    assert.ok(points[i].speed>points[i-1].speed,'inimigos perseguem mais rápido');
    assert.ok(points[i].damage>=points[i-1].damage,'dano não diminui');
  }
  assert.ok(threatAt(480).interval>=.32);
  assert.deepEqual(threatAt(-99),threatAt(0));
  assert.deepEqual(threatAt(Infinity),threatAt(0));
  assert.deepEqual(threatAt(999),threatAt(480));
});

test('HP comum depende do nível, não do relógio; velocidade e dano ainda sobem',()=>{
  const early=game(0),late=game(450);
  const a=spawnEnemy(early,'spider',{angle:0});
  const b=spawnEnemy(late,'spider',{angle:0});
  assert.ok(a.x<800*.49+100,'distância inicial menor que a versão anterior');
  assert.equal(b.maxHp,a.maxHp,'mesmo nível deve ter o mesmo HP em qualquer minuto');
  assert.ok(b.speed>a.speed);
  assert.ok(b.damage>a.damage);
  assert.equal(a.type,'spider');
  assert.ok(a.speed>=ENEMIES.spider.speed);
});

test('pessoas enfrentam grupos maiores, não apenas inimigos individuais',()=>{
  for(const [time,expected] of [[0,2],[90,3],[230,4],[400,5]]){
    const g=game(time);
    g.spawnTimer=0;
    updateEnemies(g,.016);
    assert.equal(g.enemies.length,expected,'tempo '+time);
    assert.equal(new Set(g.enemies.map(e=>e.id)).size,expected);
  }
});

test('o chefe avisa antes de investir e só então acelera',()=>{
  const g=game(220),boss=spawnEnemy(g,'colossus',{angle:0,radius:320});
  boss.rushCooldown=.01;
  const x=boss.x;
  updateEnemies(g,.02);
  assert.ok(boss.rushWarmup>.6);
  assert.equal(boss.x,x,'chefe permanece parado durante o aviso');
  updateEnemies(g,.72);
  assert.ok(boss.rushTime>.6);
  updateEnemies(g,.08);
  assert.ok(boss.x<x-5,'investida em direção ao jogador');
  assert.ok(boss.rushVx<0);
  const art=fs.readFileSync('src/render/Art.js','utf8');
  assert.ok(art.includes('e.rushWarmup>0'));
});

test('cada uma das 10 melhorias tem um símbolo SVG próprio',()=>{
  const ids=[
    ...Object.keys(STAT_UPGRADES).map(x=>'stat:'+x),
    ...Object.keys(WEAPONS).map(x=>'weapon:'+x)
  ];
  assert.equal(ids.length,10);
  assert.deepEqual(new Set(Object.keys(UPGRADE_ICON_PATHS)),new Set(ids));
  const signatures=new Set();
  for(const id of ids){
    const paths=UPGRADE_ICON_PATHS[id];
    assert.ok(Array.isArray(paths)&&paths.length>=2,id);
    const signature=JSON.stringify(paths);
    assert.ok(!signatures.has(signature),'não reutilizar desenhos: '+id);
    signatures.add(signature);
    const elements=[];
    const doc={createElementNS(ns,tag){
      assert.equal(ns,'http://www.w3.org/2000/svg');
      const el={
        tag,attrs:{},children:[],classList:{add(name){this.name=name}},
        setAttribute(name,value){this.attrs[name]=value},
        append(child){this.children.push(child)}
      };
      elements.push(el);return el;
    }};
    const svg=createUpgradeIcon(id,doc);
    assert.equal(svg.tag,'svg');
    assert.equal(svg.attrs.viewBox,'0 0 24 24');
    assert.equal(svg.attrs['aria-hidden'],'true');
    assert.equal(svg.children.length,paths.length);
    assert.deepEqual(svg.children.map(p=>p.attrs.d),paths);
  }
});

test('escolhas mostram efeito curto e cor sem alterar os bônus existentes',()=>{
  for(const def of [...Object.values(STAT_UPGRADES),...Object.values(WEAPONS)]){
    assert.ok(def.effect.length>=7);
    assert.match(def.accent,/^#[0-9a-f]{6}$/i);
  }
  const g=game();
  for(let i=0;i<18;i++){
    for(const choice of createChoices(g)){
      assert.ok(choice.effect&&choice.accent&&choice.name,choice.id);
      assert.ok(UPGRADE_ICON_PATHS[choice.id],choice.id);
      assert.ok(['weapon','stat'].includes(choice.family));
    }
  }
  assert.equal(applyChoice(g,'stat:might'),true);
  assert.equal(g.player.might,1.15);
  assert.equal(applyChoice(g,'stat:armor'),true);
  assert.equal(g.player.armor,3);
  const ui=fs.readFileSync('src/ui/Interface.js','utf8');
  const css=fs.readFileSync('src/styles.css','utf8');
  assert.ok(ui.includes('createUpgradeIcon(choice.id)'));
  assert.ok(ui.includes("effect.className='upgrade-effect'"));
  assert.ok(ui.includes("button.setAttribute('aria-label'"));
  assert.ok(css.includes('.upgrade-artwork'));
});
