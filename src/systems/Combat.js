import { WEAPONS } from '../data/weapons.js';
import { distanceSquared, normalize } from '../core/math.js';
function nearest(g,radius=720){
  let result=null,best=radius*radius;
  for(const e of g.enemies)if(e.hp>0){
    const d=distanceSquared(e,g.player);if(d<best){best=d;result=e;}
  }return result;
}
function hurt(g,e,damage){
  if(e.hp<=0)return;
  const amount=Math.max(1,Math.round(damage*g.player.might));
  e.hp-=amount;e.hit=.12;
  if(g.floatTexts.length<50)g.addText(''+amount,e.x,e.y-e.radius*2,'#f9d998');
  g.burst(e.x,e.y,e.boss?'#ebc780':'#a5e2c5',3);
  if(e.hp<=0){
    g.kills++;g.drops.push({x:e.x,y:e.y,kind:'xp',value:e.xp,life:80});
    if(e.elite||e.miniBoss||e.boss)
      g.drops.push({x:e.x+12,y:e.y-8,kind:'relic',value:1,life:90});
    if(e.bountyGold>0){
      // One bonus per milestone kill, awarded even if the XP/relic is missed.
      g.bonusGold=(g.bonusGold||0)+e.bountyGold;
      g.addText('🪙 +'+e.bountyGold+' OURO',e.x,e.y-85,'#ffe3a1');
    }
    if(Math.random()<.028)g.drops.push({x:e.x+14,y:e.y,kind:'heal',value:20,life:65});
    g.burst(e.x,e.y,'#bceab5',8);
  }
}
function shoot(g,kind,level,target){
  const p=g.player,aim=normalize(target.x-p.x,target.y-p.y);
  const count=kind==='dagger'&&level>=3?2:1;
  for(let i=0;i<count;i++){
    const angle=Math.atan2(aim.y,aim.x)+(count===2?(i===0?-.12:.12):0);
    const speed=kind==='dagger'?610:430;
    g.projectiles.push({kind,x:p.x,y:p.y-23,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
      radius:kind==='dagger'?10:12,damage:WEAPONS[kind].damage*(1+(level-1)*.5),
      pierce:kind==='dagger'?1+Math.floor(level/2):0,life:1.6,hitIds:new Set()});
  }
  g.audio.play(kind==='dagger'?'slash':'bolt');
}
function fire(g,w){
  const p=g.player,lv=w.level;
  if(w.id==='blade'){
    const target=nearest(g,240),angle=target?Math.atan2(target.y-p.y,target.x-p.x):p.facing;
    p.facing=angle;
    p.attackPose=.27; // Duração do movimento de espada do rig procedural.
    const r=96+lv*10;
    g.effects.push({kind:'slash',x:p.x,y:p.y-22,angle,radius:r,life:.23,duration:.23});
    g.audio.play('slash');
    for(const e of g.enemies)if(e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<r+e.radius){
      const a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-angle),Math.cos(a-angle));
      if(Math.abs(diff)<1.03)hurt(g,e,WEAPONS.blade.damage*(1+(lv-1)*.5));
    }
  }else if(w.id==='aura'){
    const r=92+lv*11;
    g.effects.push({kind:'aura',x:p.x,y:p.y,radius:r,life:.38,duration:.38});
    for(const e of g.enemies)if(e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<r+e.radius)hurt(g,e,WEAPONS.aura.damage*(1+(lv-1)*.55));
    g.audio.play('bolt');
  }else{
    const target=nearest(g);if(target)shoot(g,w.id,lv,target);
  }
}
export function updateCombat(g,dt){
  for(const w of g.weapons){
    w.cooldown-=dt;
    if(w.cooldown<=0){
      if((w.id==='bolt'||w.id==='dagger')&&!nearest(g)){w.cooldown=.14;continue;}
      fire(g,w);w.cooldown=WEAPONS[w.id].cooldown*Math.pow(.88,w.level-1);
    }
  }
  for(const pr of g.projectiles){
    pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.life-=dt;
    for(const e of g.enemies){
      if(pr.life<=0)break;
      if(e.hp<=0||pr.hitIds.has(e.id))continue;
      if((e.x-pr.x)**2+(e.y-pr.y)**2<(e.radius+pr.radius)**2){
        pr.hitIds.add(e.id);hurt(g,e,pr.damage);
        if(pr.pierce<=0)pr.life=0;else pr.pierce--;
      }
    }
  }
  g.projectiles=g.projectiles.filter(p=>p.life>0);
}
