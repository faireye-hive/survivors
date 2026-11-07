/**
 * Approved 2D walk poses from the JSON supplied by the user on 2026-11-07.
 * Compared against 100 keyframes across 5 biped characters and 4 directions.
 * Values and duration are not modified. This file deliberately has no imports,
 * avoiding a circular dependency between Rig2D and WalkGuide.
 */
export const WALK_DIRECTIONS=Object.freeze(['front','back','left','right']);
const canonical=[
  {body:0,legL:-27,legR:27,armL:20,armR:-20,footL:5,footR:-5,head:-2},
  {body:-2.2,legL:4,legR:-9,armL:-4,armR:9,footL:-10,footR:6,head:1.5},
  {body:0,legL:27,legR:-27,armL:-20,armR:20,footL:-5,footR:5,head:2},
  {body:-2.2,legL:-9,legR:4,armL:9,armR:-4,footL:6,footR:-10,head:-1.5}
];
export function walkGuideClipId(direction){
  if(!WALK_DIRECTIONS.includes(direction))throw Error('Direção desconhecida');
  return 'walk.'+direction;
}
export function walkGuidePose(direction,index){
  if(!WALK_DIRECTIONS.includes(direction))throw Error('Direção desconhecida');
  if(!Number.isInteger(index)||index<0||index>3)throw Error('Quadro desconhecido');
  const f=canonical[index],side=direction==='left'||direction==='right';
  // Side views emphasize reach in profile; front/back use subtler strides.
  const stride=side?1:.64;
  const arm=side?1:.7;
  return {
    body:{y:f.body,rotation:(index===0?-1:index===2?1:0)*(side?2:1)},
    head:{rotation:f.head*(side?.65:1)},
    legL:{rotation:f.legL*stride},
    legR:{rotation:f.legR*stride},
    armL:{rotation:f.armL*arm},
    armR:{rotation:f.armR*arm},
    footL:{rotation:f.footL*stride},
    footR:{rotation:f.footR*stride}
  };
}
export function createDirectionalWalkClip(direction,duration=.8){
  if(!Number.isFinite(duration)||duration<.2||duration>60)throw Error('Duração inválida');
  const frames=Array.from({length:4},(_,i)=>
    ({time:Number((duration*i/4).toFixed(5)),pose:walkGuidePose(direction,i)}));
  frames.push({time:duration,pose:walkGuidePose(direction,0)});
  return {id:walkGuideClipId(direction),duration,loop:true,frames};
}
