import { ENEMIES } from '../data/enemies.js';
import {ENCOUNTERS,chooseEncounterType} from '../data/encounters.js';
import { distanceSquared } from '../core/math.js';
import {threatAt} from '../data/difficulty.js';
import {milestoneForLevel,miniBossType,enemyLevelScaling,levelHordePressure} from '../data/levelMilestones.js';
import {insideFortress,crossesFortress,excludeEnemyFromFortresses} from '../world/FortressBounds.js';

const MAX_ENEMIES=170;
const MAX_HAZARDS=24;
let enemyId=0;

export function randomEnemyType(t,random=Math.random){
  const pool=['slime','slime','bat','slime','bat'];
  if(t>35)pool.push('skeleton','skeleton');
  if(t>60)pool.push('spore');
  if(t>110)pool.push('spider','spore');
  if(t>135)pool.push('wraith','skeleton','bat');
  if(t>260)pool.push('wraith','spider','spore','wraith','skeleton');
  return pool[Math.floor(random()*pool.length)];
}

export function spawnEnemy(g,type=randomEnemyType(g.elapsed),options={}){
  const spec=ENEMIES[type];
  if(!spec||g.enemies.length>=MAX_ENEMIES)return null;
  const angle=options.angle??Math.random()*Math.PI*2;
  const threat=threatAt(g.elapsed);
  const pressure=levelHordePressure(g.player.level,threat.pack,threat.interval);
  const radius=options.radius??(Math.max(190,Math.max(g.width,g.height)*
    pressure.radiusFactor+100));
  const miniBoss=!!options.miniBoss;
  const boss=!!spec.boss||!!options.mainBoss;
  const elite=!!options.elite&&!boss&&!miniBoss;
  const levelScale=enemyLevelScaling(g.player.level);
  const milestone=options.milestoneLevel||0;
  // Ordinary monsters scale ONLY with hero level: +5% HP each level.
  // Elites share the same base curve; milestone bosses retain their
  // separate larger HP multipliers and extra time-based difficulty.
  const healthRaw=spec.hp*levelScale.health*
    (boss?threat.health*(1.75+milestone*.045):
      miniBoss?threat.health*(4.5+milestone*.1):elite?3.6:1);
  // Fractional HP on common enemies preserves exactly +5% per level.
  const health=(boss||miniBoss)?Math.ceil(healthRaw):healthRaw;
  const enemy={
    id:++enemyId,type,boss,miniBoss,elite,
    milestoneLevel:milestone,bountyGold:options.bountyGold||0,
    name:boss?'Soberano do Eclipse':miniBoss?'Caçador de Elite · '+spec.name:spec.name,
    x:g.player.x+Math.cos(angle)*radius,
    y:g.player.y+Math.sin(angle)*radius,
    radius:spec.radius*(boss?1.35:miniBoss?1.75:elite?1.2:1),
    hp:health,maxHp:health,
    speed:spec.speed*threat.speed*levelScale.speed*(miniBoss?1.13:elite?1.12:1),
    damage:spec.damage+threat.damage+levelScale.damage+(boss?10:miniBoss?6:elite?4:0),
    xp:Math.ceil(spec.xp*(boss?15:miniBoss?9:elite?3:1)),
    hit:0,vx:0,vy:0,
    sporeTimer:2.3+(enemyId%4)*.47,
    rushCooldown:4.1+(enemyId%3)*.6,rushWarmup:0,rushTime:0,
    rushVx:0,rushVy:0,
    novaCooldown:2.3,novaWarmup:0,novaAngle:0
  };
  excludeEnemyFromFortresses(g,enemy);
  g.enemies.push(enemy);
  return enemy;
}

/**
 * Scale enemies already on-screen while preserving their HP percentage.
 * Main/mini bosses use separate scaling and are not updated here.
 */
export function rescaleCommonEnemies(g,level){
  const scale=enemyLevelScaling(level).health;
  for(const e of g.enemies||[]){
    if(e.hp<=0||e.boss||e.miniBoss||!ENEMIES[e.type])continue;
    const newMax=ENEMIES[e.type].hp*scale*(e.elite?3.6:1);
    if(newMax===e.maxHp)continue;
    const fraction=e.maxHp>0?Math.max(0,Math.min(1,e.hp/e.maxHp)):1;
    e.maxHp=newMax;
    e.hp=Math.max(0,Math.min(newMax,newMax*fraction));
  }
}

export function triggerEncounters(g){
  g.encountersSeen??=new Set();
  for(const event of ENCOUNTERS){
    if(g.elapsed<event.at||g.encountersSeen.has(event.id))continue;
    g.encountersSeen.add(event.id);
    const radius=Math.max(g.width,g.height)*.55+125;
    for(let i=0;i<event.count&&g.enemies.length<MAX_ENEMIES;i++){
      spawnEnemy(g,chooseEncounterType(event,i),{
        angle:(i/event.count)*Math.PI*2+Math.PI/9,
        radius,
        elite:i<event.elite
      });
    }
    g.eventBanner={title:event.title,subtitle:event.subtitle,remaining:4};
    // Notify at the HUD rather than spawning a blocking modal in combat.
    g.addText('✦ '+event.title,g.player.x,g.player.y-83,'#f6db9d');
  }
}

/**
 * Spawn one milestone monster for each qualifying level. If the field
 * is full, make room by removing an ordinary creature, never a reward boss.
 */
export function spawnLevelMilestone(g,level){
  const milestone=milestoneForLevel(level);
  if(!milestone)return null;
  g.levelMilestones??=new Set();
  if(g.levelMilestones.has(level))return null;
  if(g.enemies.length>=MAX_ENEMIES){
    const free=g.enemies.findIndex(e=>!e.boss&&!e.miniBoss);
    if(free<0)return null;
    g.enemies.splice(free,1);
  }
  const type=milestone.kind==='boss'?'colossus':miniBossType(level);
  const e=spawnEnemy(g,type,{
    miniBoss:milestone.kind==='mini',
    mainBoss:milestone.kind==='boss',
    milestoneLevel:level,bountyGold:milestone.bonusGold,
    radius:Math.max(g.width,g.height)*.51+95,
    angle:Math.PI*.65
  });
  if(!e)return null;
  g.levelMilestones.add(level);
  g.eventBanner={title:milestone.title+' · Nv. '+level,
    subtitle:milestone.subtitle,remaining:4.5};
  g.addText('✦ '+milestone.title,g.player.x,g.player.y-86,'#f5c987');
  return e;
}

const MAX_BOSS_SHOTS=100;
/** A radial wave telegraphed by a pulsing amber ring. */
export function fireBossNova(g,e){
  g.enemyShots??=[];
  const enrage=e.hp<=e.maxHp*.5;
  const count=enrage?16:10;
  if(g.enemyShots.length+count>MAX_BOSS_SHOTS)return 0;
  const speed=(enrage?190:155)+Math.min(40,(e.milestoneLevel||10)*2);
  const offset=e.novaAngle||0;
  for(let i=0;i<count;i++){
    const a=offset+i*Math.PI*2/count;
    g.enemyShots.push({
      x:e.x,y:e.y-18,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
      radius:7,life:3.8,damage:Math.ceil(e.damage*.62),
      kind:'nova',owner:e.id
    });
  }
  e.novaAngle=offset+Math.PI/count;
  g.burst(e.x,e.y,'#eeabdb',Math.min(count,18));
  return count;
}
/** Player-collision updates for enemy bullets, separated from hero weapons. */
export function updateEnemyShots(g,dt){
  g.enemyShots??=[];
  const p=g.player;
  for(const shot of g.enemyShots){
    const from={x:shot.x,y:shot.y};
    shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
    if(crossesFortress(g,from,shot,shot.radius||0)){shot.life=0;continue;}
    if(shot.life<=0||p.inv>0)continue;
    if(distanceSquared(shot,p)>(shot.radius+p.radius*.65)**2)continue;
    shot.life=0;
    const damage=Math.max(1,shot.damage-p.armor);
    p.hp=Math.max(0,p.hp-damage);p.inv=.7;
    g.addText('-'+damage,p.x,p.y-55,'#faa6d5');
    g.audio.play('hit');g.burst(p.x,p.y,'#f2b6dc',7);
    if(p.hp<=0){g.finish(false);break;}
  }
  g.enemyShots=g.enemyShots.filter(s=>s.life>0);
}

export function updateHazards(g,dt){
  g.hazards??=[];
  const p=g.player,protectedPlayer=insideFortress(g,p);
  for(const h of g.hazards){
    h.life-=dt;
    h.warmup-=dt;
    if(insideFortress(g,h)){h.life=0;continue;}
    if(h.life<=0||h.warmup>0||p.inv>0||protectedPlayer)continue;
    // Collision matches the elliptical warning drawn on the ground.
    const rx=h.radius+p.radius*.35,ry=h.radius*.65+p.radius*.35;
    if(((p.x-h.x)/rx)**2+((p.y-h.y)/ry)**2<1){
      const damage=Math.max(1,h.damage-p.armor);
      p.hp=Math.max(0,p.hp-damage);
      p.inv=.78;
      g.addText('-'+damage+' • ESPOROS',p.x,p.y-52,'#d5e995');
      g.audio.play('hit');
      g.burst(p.x,p.y,'#a7be78',6);
      if(p.hp<=0){g.finish(false);break;}
    }
  }
  g.hazards=g.hazards.filter(h=>h.life>0);
}

export function updateEnemies(g,dt){
  g.spawnTimer-=dt;
  const threat=threatAt(g.elapsed);
  const pressure=levelHordePressure(g.player.level,threat.pack,threat.interval);
  if(g.spawnTimer<=0){
    g.spawnTimer=pressure.interval;
    // Add one monster per hero level, on top of the existing time stages.
    // Distribute packs around the player so running in one direction
    // doesn't make the entire horde trivially avoidable.
    const start=Math.random()*Math.PI*2;
    for(let i=0;i<pressure.pack&&g.enemies.length<MAX_ENEMIES;i++)
      spawnEnemy(g,undefined,{
        angle:start+(i/pressure.pack)*Math.PI*2
      });
  }
  triggerEncounters(g);
  // Bosses are now triggered by levels 5, 10, 15, ... — not timers.

  const p=g.player,protectedPlayer=insideFortress(g,p);
  for(const e of g.enemies){
    if(e.hp<=0)continue;
    excludeEnemyFromFortresses(g,e);
    const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy)||1;
    const forward=dist>0?e.speed/dist:0;
    const orbit=e.type==='spider'
      ?Math.sin(g.elapsed*3.2+e.id*.9)*e.speed*.43:0;
    const slow=e.type==='spore'&&dist<135?.52:1;
    e.vx=(dx*forward-dy/dist*orbit)*slow;
    e.vy=(dy*forward+dx/dist*orbit)*slow;
    if(e.boss||e.miniBoss){
      // Fast lunge for minibosses; mains alternate lunge and radial nova.
      if(e.boss&&e.novaWarmup>0){
        e.novaWarmup-=dt;e.vx=0;e.vy=0;
        if(e.novaWarmup<=0){
          fireBossNova(g,e);
          e.novaCooldown=4.8;
        }
      }else if(e.rushWarmup>0){
        e.rushWarmup-=dt;e.vx=0;e.vy=0;
        if(e.rushWarmup<=0){
          e.rushTime=.72;
          e.rushVx=dx/dist*e.speed*4;
          e.rushVy=dy/dist*e.speed*4;
        }
      }else if(e.rushTime>0){
        e.rushTime-=dt;e.vx=e.rushVx;e.vy=e.rushVy;
      }else{
        e.rushCooldown-=dt;
        if(e.boss)e.novaCooldown-=dt;
        if(e.boss&&e.novaCooldown<=0&&dist<570){
          e.novaWarmup=.85;
          e.rushCooldown=Math.max(e.rushCooldown,1.5);
          e.vx=0;e.vy=0;
        }else if(e.rushCooldown<=0&&dist<470){
          e.rushWarmup=e.miniBoss?.55:.7;
          e.rushCooldown=e.miniBoss?4.4:5.6;
          e.vx=0;e.vy=0;
        }
      }
    }
    const previous={x:e.x,y:e.y};
    e.x+=e.vx*dt;e.y+=e.vy*dt;
    excludeEnemyFromFortresses(g,e,previous);

    if(e.type==='spore'){
      e.sporeTimer-=dt;
      if(e.sporeTimer<=0&&dist<290&&!protectedPlayer&&(g.hazards?.length||0)<MAX_HAZARDS){
        g.hazards??=[];
        g.hazards.push({
          x:p.x,y:p.y,radius:e.elite?69:55,
          damage:e.elite?18:12,life:3.6,warmup:.9,source:e.id
        });
        e.sporeTimer=4.9+(e.id%3)*.4;
      }
    }
    if(e.hit>0)e.hit=Math.max(0,e.hit-dt);
    if(!protectedPlayer&&Math.hypot(e.x-p.x,e.y-p.y)<(e.radius+p.radius)*.8&&p.inv<=0){
      const damage=Math.max(1,e.damage-p.armor);
      p.hp=Math.max(0,p.hp-damage);p.inv=.7;
      g.addText('-'+damage,p.x,p.y-55,'#ff8a9b');
      g.audio.play('hit');g.burst(p.x,p.y,'#ed9baa',7);
      if(p.hp<=0){g.finish(false);break;}
    }
  }
  if(g.state!=='playing')return;
  updateHazards(g,dt);
  if(g.state!=='playing')return;
  updateEnemyShots(g,dt);
  if(g.state!=='playing')return;
  if(g.eventBanner){
    g.eventBanner.remaining-=dt;
    if(g.eventBanner.remaining<=0)g.eventBanner=null;
  }
  const limit=(Math.max(g.width,g.height)*1.8+600)**2;
  g.enemies=g.enemies.filter(e=>e.hp>0&&(e.boss||e.miniBoss||distanceSquared(e,p)<limit));
}
