// Logical gameplay bounds match the palisade in the 3D scene (50 units/metre).
export const FORTRESS_BOUNDS=Object.freeze({halfWidth:300,halfDepth:165,spacing:1800});
// Include the visible wings, legs and shoulders, not just the combat hitbox.
const MODEL_CLEARANCE=Object.freeze({slime:28,bat:53,skeleton:34,spore:30,spider:46,wraith:29,colossus:78});
export function fortressClearance(enemy){
  const scale=enemy.miniBoss?1.85:enemy.boss?1.23:enemy.elite?1.2:1;
  return Math.max(enemy.radius||0,(MODEL_CLEARANCE[enemy.type]||0)*scale);
}
export function fortressRects(game,margin=0){
  return (game.campaign?.fortresses||[]).map((_,index)=>({
    left:index*FORTRESS_BOUNDS.spacing-FORTRESS_BOUNDS.halfWidth-margin,
    right:index*FORTRESS_BOUNDS.spacing+FORTRESS_BOUNDS.halfWidth+margin,
    top:-FORTRESS_BOUNDS.halfDepth-margin,bottom:FORTRESS_BOUNDS.halfDepth+margin
  }));
}
const contains=(r,p)=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom;
export function insideFortress(game,point){return fortressRects(game).some(r=>contains(r,point));}

// Segment/rectangle intersection catches a fast charge even if it crosses the
// entire base in one update. Expanding the rectangle accounts for enemy radius.
function entry(from,to,rect){
  let near=0,far=1,axis=null,edge=0;
  for(const [key,min,max] of [['x',rect.left,rect.right],['y',rect.top,rect.bottom]]){
    const delta=to[key]-from[key];
    if(Math.abs(delta)<1e-9){if(from[key]<min||from[key]>max)return null;continue;}
    let a=(min-from[key])/delta,b=(max-from[key])/delta;
    const boundary=delta>0?min:max;
    if(a>b)[a,b]=[b,a];
    if(a>=near){near=a;axis=key;edge=boundary;}
    far=Math.min(far,b);if(near>far)return null;
  }
  return near>=0&&near<=1&&far>=0?{axis,edge}:null;
}
export function crossesFortress(game,from,to,margin=0){
  return fortressRects(game,margin).some(rect=>contains(rect,from)||contains(rect,to)||entry(from,to,rect)!==null);
}
export function excludeEnemyFromFortresses(game,enemy,from=enemy){
  const previous={x:from.x,y:from.y};let blocked=false;
  for(const rect of fortressRects(game,fortressClearance(enemy)+.5)){
    if(contains(rect,previous)){
      // Repair stale/spawned positions without leaving a monster in the base.
      const choices=[['x',rect.left],['x',rect.right],['y',rect.top],['y',rect.bottom]];
      choices.sort((a,b)=>Math.abs(previous[a[0]]-a[1])-Math.abs(previous[b[0]]-b[1]));
      const [axis,edge]=choices[0];enemy[axis]=edge;enemy[axis==='x'?'vx':'vy']=0;blocked=true;continue;
    }
    const hit=entry(previous,enemy,rect);
    if(hit?.axis){
      enemy[hit.axis]=hit.edge;enemy[hit.axis==='x'?'vx':'vy']=0;blocked=true;
    }
  }
  return blocked;
}
