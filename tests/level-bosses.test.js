import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WEAPONS} from '../src/data/weapons.js';
import {STAT_UPGRADES} from '../src/data/upgrades.js';
import {META_UPGRADES} from '../src/data/metaUpgrades.js';
import {createChoices,updateProgression,xpForLevel} from '../src/systems/Progression.js';
import {milestoneForLevel,miniBossType,enemyLevelScaling} from '../src/data/levelMilestones.js';
import {spawnLevelMilestone,spawnEnemy,updateEnemies,updateEnemyShots,
  fireBossNova} from '../src/systems/Enemies.js';
import {updateCombat} from '../src/systems/Combat.js';
import {ENCOUNTERS} from '../src/data/encounters.js';
import {calculateRunGold} from '../src/storage/Profile.js';
import {drawEnemy,drawEnemyShot} from '../src/render/Art.js';

function scenario(level=1){
  return {
    width:960,height:600,elapsed:35,state:'playing',paused:false,
    player:{x:0,y:0,vx:0,vy:0,radius:16,hp:250,maxHp:250,armor:2,inv:0,
      might:1,magnet:74,level,xp:0,nextXp:xpForLevel(level),experienceGain:1},
    enemies:[],enemyShots:[],hazards:[],drops:[],projectiles:[],effects:[],
    particles:[],floatTexts:[],weapons:[],upgrades:{},
    spawnTimer:1000,encountersSeen:new Set(ENCOUNTERS.map(e=>e.id)),
    levelMilestones:new Set(),bonusGold:0,kills:0,
    audio:{play(){}},burst(){},texts:[],
    addText(msg){this.texts.push(msg)},
    finish(){this.state='lost'},
    ui:{showLevel(){}},lastPickupSound:-100
  };
}
function fakeCanvas(){
  let depth=0,draws=0;
  const c=new Proxy({globalAlpha:1},{
    get(target,name){
      if(name in target)return target[name];
      if(name==='save')return ()=>{depth++};
      if(name==='restore')return ()=>{depth--};
      return (...args)=>{
        for(const v of args)if(typeof v==='number')
          assert.ok(Number.isFinite(v),name);
        draws++;
      };
    },
    set(target,name,value){target[name]=value;return true}
  });
  return {c,stats:()=>({depth,draws})};
}

test('a cada 5 níveis surge um miniboss, e a cada 10 um chefe principal',()=>{
  const milestones=[5,10,15,20,25,30].map(milestoneForLevel);
  assert.deepEqual(milestones.map(m=>m.kind),
    ['mini','boss','mini','boss','mini','boss']);
  assert.equal(milestoneForLevel(4),null);
  assert.equal(milestoneForLevel(9),null);
  assert.equal(milestoneForLevel(0),null);
  assert.equal(milestoneForLevel(5.5),null);
  assert.equal(milestoneForLevel(10).title,'SOBERANO DO ECLIPSE');
  assert.ok(milestoneForLevel(10).bonusGold>milestoneForLevel(5).bonusGold);
  assert.deepEqual([5,15,25,35,45].map(miniBossType),
    ['skeleton','spider','spore','wraith','skeleton']);
});

test('nível de herói aumenta escala de inimigos mesmo se tempo não mudar',()=>{
  const first=scenario(1),later=scenario(25);
  const a=spawnEnemy(first,'slime',{angle:0}),b=spawnEnemy(later,'slime',{angle:0});
  assert.ok(b.maxHp>a.maxHp*2);
  assert.ok(b.damage>a.damage);
  assert.ok(b.speed>a.speed);
  assert.equal(enemyLevelScaling(1).health,1);
  assert.ok(enemyLevelScaling(30).health>enemyLevelScaling(10).health);
});

test('nível 5 cria miniboss grande com muita vida e XP, mas sem boss principal',()=>{
  const g=scenario(4);
  g.player.xp=g.player.nextXp;
  updateProgression(g,.02);
  assert.equal(g.player.level,5);
  assert.equal(g.paused,true);
  assert.equal(g.levelMilestones.size,1);
  assert.equal(g.enemies.length,1);
  const mini=g.enemies[0];
  assert.equal(mini.type,'skeleton');
  assert.equal(mini.boss,false);
  assert.equal(mini.miniBoss,true);
  assert.ok(mini.radius>18);
  assert.ok(mini.hp>spawnEnemy(scenario(5),'skeleton',{angle:0}).hp*4);
  assert.equal(mini.xp,12*9);
  assert.equal(mini.bountyGold,milestoneForLevel(5).bonusGold);
  assert.equal(spawnLevelMilestone(g,5),null);
  assert.ok(g.eventBanner.title.includes('Nv. 5'));
});

test('nível 10 cria chefe principal exclusivo e sem miniboss duplicado',()=>{
  const g=scenario(9);
  g.player.xp=g.player.nextXp;
  updateProgression(g,.02);
  assert.equal(g.player.level,10);
  const bosses=g.enemies.filter(e=>e.boss),minis=g.enemies.filter(e=>e.miniBoss);
  assert.equal(bosses.length,1);
  assert.equal(minis.length,0);
  const boss=bosses[0];
  assert.equal(boss.name,'Soberano do Eclipse');
  assert.ok(boss.maxHp>1800);
  assert.ok(boss.xp>=3000);
  assert.ok(boss.bountyGold>=400);
  assert.equal(spawnLevelMilestone(g,10),null);
});

test('o miniboss aparece mesmo quando a horda comum chegou ao limite',()=>{
  const g=scenario(4);
  for(let i=0;i<170;i++)g.enemies.push({id:i,hp:5,boss:false,elite:false});
  const mini=spawnLevelMilestone(g,5);
  assert.ok(mini&&mini.miniBoss);
  assert.equal(g.enemies.length,170);
  assert.equal(g.levelMilestones.size,1);
});

test('não há chefes automáticos no minuto 2:45 ou 6:05; gatilho é nível',()=>{
  const g=scenario(3);
  g.elapsed=365;
  g.spawnTimer=9999;
  updateEnemies(g,.02);
  assert.equal(g.enemies.filter(e=>e.boss||e.miniBoss).length,0);
});

test('miniboss avança rápido após um aviso, permitindo desviar',()=>{
  const g=scenario(5),mini=spawnLevelMilestone(g,5);
  mini.x=195;mini.y=0;mini.rushCooldown=.01;
  const x=mini.x;
  updateEnemies(g,.02);
  assert.ok(mini.rushWarmup>.5);
  assert.equal(mini.x,x);
  updateEnemies(g,.55);
  assert.ok(mini.rushTime>0);
  updateEnemies(g,.03);
  assert.ok(mini.x<x-5);
});

test('chefe principal avisa antes de disparar círculo de projéteis e enfurece abaixo de 50%',()=>{
  const g=scenario(10),boss=spawnLevelMilestone(g,10);
  boss.x=270;boss.y=0;boss.novaCooldown=.01;boss.rushCooldown=999;
  updateEnemies(g,.02);
  assert.ok(boss.novaWarmup>.7);
  assert.equal(g.enemyShots.length,0);
  const x=boss.x;
  updateEnemies(g,.9);
  assert.equal(boss.x,x);
  assert.equal(g.enemyShots.length,10);
  assert.equal(new Set(g.enemyShots.map(x=>x.owner)).size,1);
  const first=g.enemyShots.map(s=>({vx:s.vx,vy:s.vy}));
  assert.ok(first.some(s=>s.vx>0));
  assert.ok(first.some(s=>s.vx<0));
  boss.hp=boss.maxHp*.35;
  g.enemyShots=[];
  assert.equal(fireBossNova(g,boss),16);
  assert.ok(g.enemyShots.some(s=>Math.hypot(s.vx,s.vy)>180));
});

test('projéteis acertam no máximo uma vez, respeitam armadura e invulnerabilidade',()=>{
  const g=scenario(10);
  const original=g.player.hp;
  g.enemyShots=[
    {x:0,y:0,vx:0,vy:0,radius:7,life:2,damage:20},
    {x:0,y:0,vx:0,vy:0,radius:7,life:2,damage:20}
  ];
  updateEnemyShots(g,.016);
  assert.equal(g.player.hp,original-18);
  assert.equal(g.enemyShots.length,1);
  updateEnemyShots(g,.016);
  assert.equal(g.player.hp,original-18);
  g.player.inv=0;
  updateEnemyShots(g,.016);
  assert.equal(g.player.hp,original-36);
  assert.equal(g.enemyShots.length,0);
});

test('derrotar miniboss/chefe garante XP, relíquia e ouro extra na recompensa final',()=>{
  for(const level of [5,10]){
    const g=scenario(level),enemy=spawnLevelMilestone(g,level);
    enemy.x=34;enemy.y=0;enemy.hp=1;
    g.weapons=[{id:'aura',level:3,cooldown:0}];
    updateCombat(g,.02);
    assert.equal(enemy.hp<=0,true);
    assert.equal(g.kills,1);
    assert.ok(g.drops.some(d=>d.kind==='xp'&&d.value>=enemy.xp));
    assert.ok(g.drops.some(d=>d.kind==='relic'));
    assert.equal(g.bonusGold,milestoneForLevel(level).bonusGold);
    const earned=calculateRunGold({level,kills:g.kills,time:40,
      bonusGold:g.bonusGold});
    const base=calculateRunGold({level,kills:g.kills,time:40});
    assert.equal(earned-base,g.bonusGold);
    updateCombat(g,.02);
    assert.equal(g.bonusGold,milestoneForLevel(level).bonusGold);
  }
});

test('arte mostra ameaça do chefe e escalonamento dos minibosses',()=>{
  const {c,stats}=fakeCanvas(),g=scenario(10);
  const boss=spawnLevelMilestone(g,10);
  boss.novaWarmup=.5;
  drawEnemy(c,boss,140,150,1);
  boss.novaWarmup=0;boss.rushWarmup=.5;
  drawEnemy(c,boss,140,150,2);
  const mini=spawnLevelMilestone(g,15);
  drawEnemy(c,mini,160,150,1.5);
  drawEnemyShot(c,{radius:7,vx:50,vy:0},110,70,1);
  assert.equal(stats().depth,0);
  assert.ok(stats().draws>150);
});

test('armas ofensivas são quentes, defesas azuis e utilidades verdes',()=>{
  for(const def of Object.values(WEAPONS)){
    assert.equal(def.theme,'attack');
    assert.match(def.accent,/^#[0-9a-f]{6}$/i);
  }
  for(const [id,def] of Object.entries(STAT_UPGRADES)){
    const expect=id==='might'?'attack':
      ['vitality','armor'].includes(id)?'defense':'utility';
    assert.equal(def.theme,expect);
  }
  const game=scenario();
  for(let i=0;i<20;i++)for(const choice of createChoices(game)){
    assert.ok(['attack','defense','utility'].includes(choice.theme));
    assert.equal(choice.theme==='attack',choice.family==='weapon'||choice.id==='stat:might');
  }
  for(const [id,def] of Object.entries(META_UPGRADES))
    assert.equal(def.theme,id==='power'?'attack':
      ['vitality','defense'].includes(id)?'defense':'utility');
  const html=fs.readFileSync('index.html','utf8');
  const ui=fs.readFileSync('src/ui/Interface.js','utf8');
  const css=fs.readFileSync('src/styles.css','utf8');
  for(const theme of ['attack','defense','utility']){
    assert.ok(css.includes('.upgrade-option[data-theme="'+theme+'"]'));
    assert.ok(css.includes('.meta-upgrade-card[data-theme="'+theme+'"]'));
  }
  assert.ok(ui.includes('button.dataset.theme=choice.theme'));
  assert.ok(html.includes('id="boss-health"'));
  assert.ok(html.includes('id="boss-health-fill"'));
  assert.ok(ui.includes("this.el['boss-health'].hidden=!mainBoss"));
  assert.ok(css.includes('.boss-health[hidden]{display:none}'));
});
