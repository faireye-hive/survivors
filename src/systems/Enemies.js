import { ENEMIES } from '../data/enemies.js';
import {ENCOUNTERS,chooseEncounterType} from '../data/encounters.js';
import { distanceSquared } from '../core/math.js';

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
  const radius=options.radius??(Math.max(g.width,g.height)*.7+100);
  const difficulty=1+g.elapsed/310;
  const elite=!!options.elite&&!spec.boss;
  const health=Math.ceil(spec.hp*difficulty*(elite?3.6:1));
  const enemy={
    id:++enemyId,type,boss:!!spec.boss,elite,
    x:g.player.x+Math.cos(angle)*radius,
    y:g.player.y+Math.sin(angle)*radius,
    radius:spec.radius*(elite?1.2:1),
    hp:health,maxHp:health,
    speed:spec.speed*(1+g.elapsed/1300)*(elite?1.12:1),
    damage:spec.damage+Math.floor(g.elapsed/95)+(elite?4:0),
    xp:spec.xp*(elite?3:1),hit:0,vx:0,vy:0,
    sporeTimer:2.3+(enemyId%4)*.47
  };
  g.enemies.push(enemy);
  return enemy;
}

export function triggerEncounters(g){
  g.encountersSeen??=new Set();
  for(const event of ENCOUNTERS){
    if(g.elapsed<event.at||g.encountersSeen.has(event.id))continue;
    g.encountersSeen.add(event.id);
    const radius=Math.max(g.width,g.height)*.7+140;
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

export function updateHazards(g,dt){
  g.hazards??=[];
  const p=g.player;
  for(const h of g.hazards){
    h.life-=dt;
    h.warmup-=dt;
    if(h.life<=0||h.warmup>0||p.inv>0)continue;
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
  const interval=Math.max(.19,1.1-g.elapsed/580);
  if(g.spawnTimer<=0){
    g.spawnTimer=interval;
    const count=g.elapsed>210?2:1;
    for(let i=0;i<count&&g.enemies.length<MAX_ENEMIES;i++)spawnEnemy(g);
  }
  triggerEncounters(g);
  if(g.elapsed>=165&&!g.bossFlags.first){g.bossFlags.first=true;spawnEnemy(g,'colossus');}
  if(g.elapsed>=365&&!g.bossFlags.second){g.bossFlags.second=true;spawnEnemy(g,'colossus');}

  const p=g.player;
  for(const e of g.enemies){
    if(e.hp<=0)continue;
    const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy)||1;
    const forward=dist>0?e.speed/dist:0;
    const orbit=e.type==='spider'
      ?Math.sin(g.elapsed*3.2+e.id*.9)*e.speed*.43:0;
    const slow=e.type==='spore'&&dist<135?.52:1;
    e.vx=(dx*forward-dy/dist*orbit)*slow;
    e.vy=(dy*forward+dx/dist*orbit)*slow;
    e.x+=e.vx*dt;e.y+=e.vy*dt;

    if(e.type==='spore'){
      e.sporeTimer-=dt;
      if(e.sporeTimer<=0&&dist<290&&(g.hazards?.length||0)<MAX_HAZARDS){
        g.hazards??=[];
        g.hazards.push({
          x:p.x,y:p.y,radius:e.elite?69:55,
          damage:e.elite?18:12,life:3.6,warmup:.9,source:e.id
        });
        e.sporeTimer=4.9+(e.id%3)*.4;
      }
    }
    if(e.hit>0)e.hit=Math.max(0,e.hit-dt);
    if(dist<(e.radius+p.radius)*.8&&p.inv<=0){
      const damage=Math.max(1,e.damage-p.armor);
      p.hp=Math.max(0,p.hp-damage);p.inv=.7;
      g.addText('-'+damage,p.x,p.y-55,'#ff8a9b');
      g.audio.play('hit');g.burst(p.x,p.y,'#ed9baa',7);
      if(p.hp<=0){g.finish(false);break;}
    }
  }
  if(g.state!=='playing')return;
  updateHazards(g,dt);
  if(g.eventBanner){
    g.eventBanner.remaining-=dt;
    if(g.eventBanner.remaining<=0)g.eventBanner=null;
  }
  const limit=(Math.max(g.width,g.height)*1.8+600)**2;
  g.enemies=g.enemies.filter(e=>e.hp>0&&(e.boss||distanceSquared(e,p)<limit));
}
