import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES} from '../src/data/enemies.js';
import {ENCOUNTERS} from '../src/data/encounters.js';
import {randomEnemyType,spawnEnemy,triggerEncounters,updateEnemies,updateHazards} from '../src/systems/Enemies.js';
import {updateCombat} from '../src/systems/Combat.js';
import {updateProgression} from '../src/systems/Progression.js';
import {drawWildCreature} from '../src/render/characters/WildCreatures.js';
import {drawHazard,drawEnemy,drawDrop} from '../src/render/Art.js';
import {Renderer} from '../src/render/Renderer.js';

function sim(){
  return {
    width:1000,height:600,elapsed:0,state:'playing',spawnTimer:100,
    player:{x:0,y:0,hp:140,maxHp:140,radius:16,inv:0,armor:1,
      might:1,magnet:74,speed:200,xp:0,nextXp:9999,level:1},
    enemies:[],hazards:[],drops:[],projectiles:[],effects:[],weapons:[],
    particles:[],floatTexts:[],bossFlags:{first:false,second:false},
    encountersSeen:new Set(),eventBanner:null,kills:0,relics:0,
    audio:{play(){}},texts:[],
    addText(text){this.texts.push(text)},
    burst(){},
    finish(won){this.state=won?'won':'lost'},
    lastPickupSound:-100
  };
}

function mockCanvas(){
  let saves=0,restores=0,draws=0;
  const c=new Proxy({globalAlpha:1},{
    get(o,key){
      if(key in o)return o[key];
      if(key==='save')return ()=>{saves++};
      if(key==='restore')return ()=>{restores++};
      if(key==='createRadialGradient'||key==='createLinearGradient')
        return ()=>({addColorStop(){}});
      return (...args)=>{
        for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),String(key));
        draws++;
      };
    },
    set(o,key,value){o[key]=value;return true;}
  });
  return {c,summary:()=>({saves,restores,draws})};
}

test('novas espécies são acessíveis como inimigos, sem rig humanoide',()=>{
  for(const id of ['spore','spider']){
    assert.ok(ENEMIES[id]);
    assert.ok(ENEMIES[id].hp>0);
    const g=sim(),e=spawnEnemy(g,id,{angle:0,radius:300});
    assert.equal(e.type,id);
    assert.ok(e.hp>0&&e.speed>0);
    assert.ok(!e.boss);
    const {c,summary}=mockCanvas();
    assert.equal(drawWildCreature(c,e,100,120,2),true);
    drawEnemy(c,e,100,120,2);
    assert.equal(summary().saves,summary().restores);
    assert.ok(summary().draws>20);
  }
  const {c}=mockCanvas();
  assert.equal(drawWildCreature(c,{type:'slime'},0,0,1),false);
  assert.equal(randomEnemyType(65,()=>.999),'spore');
  assert.ok(['spore','spider'].some(t=>
    Array.from({length:100},(_,i)=>randomEnemyType(160,()=>i/100)).includes(t)
  ));
});

test('ondas especiais disparam uma única vez, com inimigos de elite e aviso',()=>{
  const g=sim();
  assert.deepEqual(ENCOUNTERS.map(e=>e.at),[75,195,320]);
  triggerEncounters(g);
  assert.equal(g.enemies.length,0);
  g.elapsed=75;
  triggerEncounters(g);
  assert.equal(g.enemies.length,7);
  assert.equal(g.enemies.filter(e=>e.elite).length,1);
  assert.ok(g.eventBanner.title.includes('Florescimento'));
  triggerEncounters(g);
  assert.equal(g.enemies.length,7);
  g.elapsed=195;
  triggerEncounters(g);
  assert.equal(g.enemies.length,16);
  assert.ok(g.enemies.some(e=>e.type==='spider'));
  g.elapsed=320;
  triggerEncounters(g);
  assert.equal(g.enemies.length,28);
  assert.equal(g.enemies.filter(e=>e.elite).length,4);
  assert.equal(g.encountersSeen.size,3);
  assert.equal(new Set(g.enemies.map(e=>e.id)).size,g.enemies.length);
});

test('esporões criam áreas com aviso antes do dano e aplicam invulnerabilidade',()=>{
  const g=sim();
  g.elapsed=20;g.spawnTimer=500;
  const e=spawnEnemy(g,'spore',{angle:0,radius:170});
  e.sporeTimer=.01;
  updateEnemies(g,.05);
  assert.equal(g.hazards.length,1);
  assert.ok(g.hazards[0].warmup>.8);
  const before=g.player.hp;
  updateHazards(g,.7);
  assert.equal(g.player.hp,before,'nenhum dano durante a sinalização');
  updateHazards(g,.2);
  assert.equal(g.player.hp,before-11);
  assert.ok(g.player.inv>.7);
  updateHazards(g,.1);
  assert.equal(g.player.hp,before-11,'sem dano repetido durante invulnerabilidade');
  updateHazards(g,3.0);
  assert.equal(g.hazards.length,0);
});

test('áreas de esporos acertam somente dentro da forma elíptica visível',()=>{
  const g=sim();
  g.player.y=45;g.player.x=0;
  g.hazards.push({x:0,y:0,radius:50,damage:12,life:3,warmup:0});
  const hp=g.player.hp;
  // Would hit with the old circular collision, but outside the visible oval.
  updateHazards(g,.02);
  assert.equal(g.player.hp,hp);
  g.player.y=0;
  updateHazards(g,.02);
  assert.ok(g.player.hp<hp);
});

test('as aranhas alternam movimentos laterais sem perder perseguição',()=>{
  const g=sim();
  g.elapsed=125;g.spawnTimer=500;
  const e=spawnEnemy(g,'spider',{angle:0,radius:220});
  const previous=e.x;
  updateEnemies(g,.05);
  assert.ok(e.x<previous);
  assert.ok(Number.isFinite(e.vy));
  const vy=e.vy;
  g.elapsed+=.5;
  updateEnemies(g,.05);
  assert.notEqual(e.vy,vy);
});

test('elite derruba relíquia, que concede +7% de dano e cura moderada',()=>{
  const g=sim();
  const e=spawnEnemy(g,'spider',{angle:0,radius:50,elite:true});
  assert.ok(e.maxHp>ENEMIES.spider.hp*3);
  e.hp=12;
  g.player.hp=100;
  g.weapons=[{id:'aura',level:3,cooldown:0}];
  updateCombat(g,.02);
  assert.ok(e.hp<=0);
  assert.equal(g.kills,1);
  const relic=g.drops.find(d=>d.kind==='relic');
  assert.ok(relic);
  relic.x=0;relic.y=0;
  updateProgression(g,.016);
  assert.equal(g.relics,1);
  assert.ok(Math.abs(g.player.might-1.07)<1e-10);
  assert.equal(g.player.hp,115);
  assert.ok(g.texts.some(t=>t.includes('RELÍQUIA')));
});

test('o Canvas desenha ameaça de esporos, relíquia e aviso de onda',()=>{
  const g=sim(),{c,summary}=mockCanvas();
  g.ctx=c;g.dpr=1;g.world={draw(){}};
  g.eventBanner={title:'Teste',subtitle:'Onda especial',remaining:2};
  const e=spawnEnemy(g,'spore',{angle:0,radius:130,elite:true});
  e.hp=e.maxHp/2;
  g.hazards.push({x:40,y:50,radius:55,life:2,warmup:.4,damage:12});
  g.drops.push({x:20,y:10,kind:'relic',value:1,life:90});
  drawHazard(c,g.hazards[0],40,50,1);
  drawDrop(c,g.drops[0],20,10,1);
  drawEnemy(c,e,130,0,1);
  new Renderer().render(g);
  assert.equal(summary().saves,summary().restores);
  assert.ok(summary().draws>80);
});
