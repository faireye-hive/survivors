import { distanceSquared } from '../core/math.js';
import { STAT_UPGRADES } from '../data/upgrades.js';
import { WEAPONS } from '../data/weapons.js';
import {spawnLevelMilestone} from './Enemies.js';
export function xpForLevel(lv){return Math.round(24+lv*12+lv*lv*2);}
export function createChoices(g){
  const pool=[];
  for(const [id,def] of Object.entries(WEAPONS)){
    const w=g.weapons.find(x=>x.id===id);
    if(w?.level>=def.maxLevel)continue;
    pool.push({id:'weapon:'+id,name:def.name,glyph:def.glyph,
      effect:w?'DANO ↑ · RECARGA ↓':def.effect,
      accent:def.accent,family:'weapon',theme:def.theme,
      description:w?'Aumenta o dano e a cadência desta arma.':def.description,
      tier:w?'NÍVEL '+(w.level+1):'NOVA ARMA'});
  }
  for(const [id,def] of Object.entries(STAT_UPGRADES)){
    const level=g.upgrades[id]||0;if(level>=def.maxLevel)continue;
    pool.push({id:'stat:'+id,name:def.name,glyph:def.glyph,
      effect:def.effect,accent:def.accent,family:'stat',theme:def.theme,
      description:def.description,tier:id==='recovery'?'CURA':'NÍVEL '+(level+1)});
  }
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,3);
}
export function applyChoice(g,id){
  const [kind,key]=id.split(':');
  if(kind==='weapon'&&WEAPONS[key]){
    const w=g.weapons.find(x=>x.id===key);
    if(w)w.level=Math.min(WEAPONS[key].maxLevel,w.level+1);
    else g.weapons.push({id:key,level:1,cooldown:.25});
  }else if(kind==='stat'&&STAT_UPGRADES[key]){
    const p=g.player;g.upgrades[key]=(g.upgrades[key]||0)+1;
    switch(key){
      case 'might':p.might*=1.15;break;
      case 'vitality':p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+25);break;
      case 'haste':p.speed*=1.09;break;
      case 'magnet':p.magnet+=34;break;
      case 'armor':p.armor+=2;break;
      case 'recovery':p.hp=Math.min(p.maxHp,p.hp+40);break;
    }
  }else return false;
  return true;
}
export function updateProgression(g,dt){
  const p=g.player;
  let collected=false;
  for(const d of g.drops){
    d.life-=dt;
    const dist=Math.sqrt(distanceSquared(d,p));
    if(dist<p.magnet+45&&dist>1){
      const speed=Math.max(150,750-dist*3);
      d.x+=(p.x-d.x)/dist*speed*dt;
      d.y+=(p.y-d.y)/dist*speed*dt;
    }
    if(distanceSquared(d,p)<(p.radius+13)**2){
      if(d.kind==='heal'){
        p.hp=Math.min(p.maxHp,p.hp+d.value);g.addText('+'+d.value+' PV',p.x,p.y-55,'#8cf2b3');
      }else if(d.kind==='relic'){
        // Guaranteed elite reward: a small permanent damage bonus for
        // the current run, without a blocking upgrade-selection screen.
        g.relics=(g.relics||0)+1;
        p.might*=1.07;
        p.hp=Math.min(p.maxHp,p.hp+15);
        g.addText('✦ RELÍQUIA · +7% DANO',p.x,p.y-65,'#f9da8d');
        g.burst(p.x,p.y,'#f9d18a',12);
      }else p.xp+=Math.round(d.value*(p.experienceGain||1));
      d.life=0;collected=true;
    }
  }
  g.drops=g.drops.filter(d=>d.life>0);
  if(collected&&g.elapsed-g.lastPickupSound>.15){g.audio.play('pickup');g.lastPickupSound=g.elapsed;}
  if(p.xp>=p.nextXp){
    p.xp-=p.nextXp;p.level++;p.nextXp=xpForLevel(p.level);
    // Milestone enemies await while the player chooses an upgrade.
    spawnLevelMilestone(g,p.level);
    g.paused=true;g.pauseReason='level';g.audio.play('level');
    g.ui.showLevel(p.level,createChoices(g));
  }
}
