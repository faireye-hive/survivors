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
import {visibleRigNodes} from './Rig2D.js';
import {WALK_DIRECTIONS,walkGuideClipId} from './WalkPoseData.js';
export {WALK_DIRECTIONS,walkGuideClipId,walkGuidePose,createDirectionalWalkClip}
  from './WalkPoseData.js';

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
