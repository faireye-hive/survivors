/**
 * Original 4-frame directional walk reference, inspired by the publicly
 * documented contact/passing construction used in small 2D RPG sprites.
 * Artwork is drawn as Canvas bones at runtime, never copied from sprite art.
 *
 * Four distinct frames per FULL loop: left contact, left passing,
 * right contact, right passing. The fifth keyframe duplicates the first
 * ONLY to close an interpolated loop cleanly.
 *
 * Sources (reference only; no external artwork embedded):
 * https://opengameart.org/content/hero-character-sprite-sheet (CC0)
 * https://opengameart.org/content/walk-cycle-guide (CC0)
 * https://animation.monmouth.edu/instruct/animation/walk-cycle/
 */
import {createFrame, visibleRigNodes} from './Rig2D.js';

export const WALK_DIRECTIONS=Object.freeze(['front','back','left','right']);
export const WALK_LABELS=Object.freeze({
  front:'Frente ↓',back:'Costas ↑',left:'Esquerda ←',right:'Direita →'
});
export const WALK_FRAME_LABELS=Object.freeze([
  '01 · Contato E','02 · Passagem E','03 · Contato D','04 · Passagem D'
]);
export const WALK_FRAME_NOTES=Object.freeze([
  'Pé esquerdo conduz o passo; braço direito avança em oposição.',
  'Peso na perna de apoio; a outra passa junto ao corpo, com leve elevação.',
  'Pé direito conduz; braços e pernas trocam de lado.',
  'Novo apoio e passagem; prepare a volta ao primeiro quadro.'
]);
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
    createFrame(Number((duration*i/4).toFixed(5)),walkGuidePose(direction,i)));
  frames.push(createFrame(duration,walkGuidePose(direction,0)));
  return {id:walkGuideClipId(direction),duration,loop:true,frames};
}
export function isWalkRig(character){
  const nodes=visibleRigNodes(character);
  return ['body','head','armL','armR','legL','legR'].every(n=>nodes.includes(n));
}
export function resolveWalkAction(character,action,direction){
  if(action==='walk'&&WALK_DIRECTIONS.includes(direction)){
    const id=walkGuideClipId(direction);
    if(character?.clips?.some(c=>c.id===id))return id;
  }
  return action;
}
/** Direction from live velocity, or last facing while idle. */
export function actorWalkDirection(actor){
  const vx=actor?.vx||0,vy=actor?.vy||0;
  const speed=Math.hypot(vx,vy);
  const angle=speed>4?Math.atan2(vy,vx):
    (Number.isFinite(actor?.facing)?actor.facing:Math.PI/2);
  if(Math.abs(Math.cos(angle))>=Math.abs(Math.sin(angle)))
    return Math.cos(angle)<0?'left':'right';
  return Math.sin(angle)<0?'back':'front';
}
