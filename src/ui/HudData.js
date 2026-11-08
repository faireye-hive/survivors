import {CLASSES} from '../data/classes.js';
import {WEAPONS} from '../data/weapons.js';
import {clamp} from '../core/math.js';

// Only expose values that really exist in the simulation.
// This HUD deliberately has no fictional mana, hunger, stamina or manual attacks.
export const MINIMAP_RADIUS=780;
export function hudStats(game){
  const p=game.player;
  return {
    name:CLASSES[p.classId]?.name||'Herói',
    classId:p.classId,
    level:p.level,
    hp:Math.ceil(p.hp),maxHp:Math.ceil(p.maxHp),
    hpPct:clamp(p.hp/p.maxHp*100,0,100),
    armor:p.armor, mightPct:Math.round(p.might*100),
    speed:Math.round(p.speed),
    xp:p.xp,nextXp:p.nextXp,xpPct:clamp(p.xp/p.nextXp*100,0,100),
    elapsed:game.elapsed,kills:game.kills,
    weapons:game.weapons.map(w=>{
      const def=WEAPONS[w.id];
      const period=def.cooldown*Math.pow(.88,w.level-1);
      return {id:w.id,name:def.name,glyph:def.glyph,level:w.level,
        rechargePct:clamp(w.cooldown/period*100,0,100)};
    })
  };
}
export function minimapMarkers(game,radius=MINIMAP_RADIUS){
  const p=game.player;
  const norm=(x,y)=>({x:(x-p.x)/radius,y:(y-p.y)/radius});
  const inside=(m)=>Math.abs(m.x)<=1&&Math.abs(m.y)<=1;
  const enemies=[];
  for(const e of game.enemies){
    if(e.hp<=0)continue;
    const m=norm(e.x,e.y);
    if(inside(m)&&enemies.length<150)enemies.push({...m,boss:Boolean(e.boss)});
  }
  const drops=[];
  for(const drop of game.drops){
    if(drop.life<=0)continue;
    const m=norm(drop.x,drop.y);
    if(inside(m)&&drops.length<75)drops.push({
      ...m,heal:drop.kind==='heal',relic:drop.kind==='relic'
    });
  }
  const sanctuary=norm(0,0);
  return {enemies,drops,sanctuary:inside(sanctuary)?sanctuary:null};
}
