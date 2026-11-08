import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES} from '../src/data/enemies.js';
import {ENCOUNTERS} from '../src/data/encounters.js';
import {threatAt} from '../src/data/difficulty.js';
import {enemyLevelScaling,levelHordePressure} from '../src/data/levelMilestones.js';
import {spawnEnemy,updateEnemies,rescaleCommonEnemies} from '../src/systems/Enemies.js';
import {updateProgression,xpForLevel} from '../src/systems/Progression.js';

function scene(level=1,time=0){
  return {
    width:1000,height:600,elapsed:time,spawnTimer:0,
    state:'playing',paused:false,player:{
      level,x:0,y:0,radius:16,hp:200,maxHp:200,armor:1,
      inv:0,magnet:60,xp:0,nextXp:xpForLevel(level),experienceGain:1
    },
    enemies:[],enemyShots:[],hazards:[],drops:[],weapons:[],upgrades:{},
    encountersSeen:new Set(ENCOUNTERS.map(e=>e.id)),
    levelMilestones:new Set(),audio:{play(){}},burst(){},addText(){},
    ui:{showLevel(){}},lastPickupSound:-100,finish(){this.state='lost'}
  };
}
function close(a,b){
  assert.ok(Math.abs(a-b)<1e-9,'expected '+a+' ≈ '+b);
}

test('cada nível adiciona exatamente 5% multiplicativos ao HP de cada monstro comum',()=>{
  for(const type of ['slime','bat','skeleton','spore','spider','wraith']){
    for(const level of [1,2,3,5,10,15,20,30]){
      const g=scene(level,0);
      const e=spawnEnemy(g,type,{angle:0});
      const expected=ENEMIES[type].hp*Math.pow(1.05,level-1);
      close(e.maxHp,expected);
      close(e.hp,expected);
      assert.equal(e.boss,false);
      assert.equal(e.miniBoss,false);
    }
  }
  for(const level of [2,5,10,20]){
    close(enemyLevelScaling(level).health/ enemyLevelScaling(level-1).health,1.05);
  }
});

test('HP comum não multiplica pela dificuldade do relógio; elite mantém próprio multiplicador',()=>{
  for(const level of [1,5,10,20]){
    const morning=spawnEnemy(scene(level,0),'slime',{angle:0});
    const night=spawnEnemy(scene(level,450),'slime',{angle:0});
    close(morning.maxHp,night.maxHp);
    const elite=spawnEnemy(scene(level,300),'slime',{elite:true,angle:0});
    close(elite.maxHp,morning.maxHp*3.6);
  }
  assert.ok(threatAt(450).health>threatAt(0).health,
    'multiplicador do tempo permanece exclusivo dos chefes');
});

test('monstros existentes acompanham o novo nível preservando dano recebido',()=>{
  const g=scene(1);
  const hurt=spawnEnemy(g,'skeleton',{angle:0});
  const elite=spawnEnemy(g,'spider',{angle:0,elite:true});
  hurt.hp=hurt.maxHp*.25;
  elite.hp=elite.maxHp*.5;
  const oldHp=hurt.hp;
  rescaleCommonEnemies(g,2);
  close(hurt.maxHp,ENEMIES.skeleton.hp*1.05);
  close(hurt.hp/hurt.maxHp,.25);
  close(elite.hp/elite.maxHp,.5);
  assert.ok(hurt.hp>oldHp);
  // Repeating for the same level does not inflate HP.
  const previous=hurt.maxHp;
  rescaleCommonEnemies(g,2);
  close(hurt.maxHp,previous);
  const boss=spawnEnemy(g,'colossus',{mainBoss:true,angle:0});
  const before=boss.maxHp;
  rescaleCommonEnemies(g,3);
  close(boss.maxHp,before);
});

test('a cada nível há mais inimigos por onda e um limite de desempenho',()=>{
  const times=[0,90,250,400];
  for(const time of times){
    let previous=0;
    for(const level of [1,2,3,5,10,15,20,25]){
      const threat=threatAt(time);
      const p=levelHordePressure(level,threat.pack,threat.interval);
      assert.ok(p.pack>=previous,'a horda nunca diminui com o nível');
      if(previous<24)assert.ok(p.pack>previous,'aumenta até o limite técnico');
      previous=p.pack;
      assert.ok(p.pack<=24);
      assert.ok(p.interval>=.34);
      const g=scene(level,time);
      updateEnemies(g,.016);
      assert.equal(g.enemies.length,p.pack,'time '+time+' lv '+level);
      assert.equal(new Set(g.enemies.map(e=>e.id)).size,p.pack);
    }
  }
  assert.equal(levelHordePressure(1,2,.76).pack,2);
  assert.equal(levelHordePressure(5,2,.76).pack,6);
  assert.equal(levelHordePressure(10,2,.76).pack,11);
  assert.equal(levelHordePressure(20,2,.76).pack,21);
  assert.equal(levelHordePressure(50,2,.76).pack,24);
});

test('a partir dos níveis altos até mesmo grupos sem boss ameaçam o jogador',()=>{
  const g=scene(20,240);
  updateEnemies(g,.016);
  assert.ok(g.enemies.length>=20);
  assert.ok(g.enemies.every(e=>!e.boss&&!e.miniBoss));
  assert.ok(g.enemies.every(e=>e.maxHp>=ENEMIES[e.type].hp*2.5));
  assert.ok(g.spawnTimer<.76);
  // On-screen population remains capped, including when hordes do not die.
  for(let i=0;i<30;i++){
    g.spawnTimer=0;
    updateEnemies(g,.016);
  }
  assert.ok(g.enemies.length<=170);
});

test('as ondas surgem distribuídas ao redor do personagem, sem teleportar sobre ele',()=>{
  const g=scene(10,0);
  updateEnemies(g,.016);
  const angles=g.enemies.map(e=>Math.atan2(e.y,e.x)).sort((a,b)=>a-b);
  let gaps=[];
  for(let i=0;i<angles.length;i++){
    const a=angles[i],b=angles[(i+1)%angles.length]+(i+1===angles.length?Math.PI*2:0);
    gaps.push(b-a);
  }
  const gap=2*Math.PI/g.enemies.length;
  assert.ok(gaps.every(x=>Math.abs(x-gap)<1e-8));
  assert.ok(g.enemies.every(e=>Math.hypot(e.x,e.y)>=190));
});

test('subir de nível aplica aumento de HP aos comuns que sobreviveram',()=>{
  const g=scene(1);
  const e=spawnEnemy(g,'slime',{angle:0});
  e.hp*=.6;
  g.player.xp=g.player.nextXp;
  updateProgression(g,.02);
  assert.equal(g.player.level,2);
  close(e.maxHp,ENEMIES.slime.hp*1.05);
  close(e.hp/e.maxHp,.6);
  assert.equal(g.paused,true);
});
