/**
 * Horde pressure for the 8-minute survival challenge. Early defeats earn
 * permanent currency, so fresh accounts are expected to improve over runs.
 * Enemy HP/damage also scale with player level via levelMilestones.js.
 * Cap population in Enemies.js to keep Canvas responsive.
 */
export const THREAT_STAGES=Object.freeze([
  Object.freeze({at:0,pack:2,label:'Calmaria'}),
  Object.freeze({at:75,pack:3,label:'Invasão'}),
  Object.freeze({at:210,pack:4,label:'Cerco'}),
  Object.freeze({at:360,pack:5,label:'Caos'})
]);
export function threatAt(seconds=0){
  const t=Number.isFinite(seconds)?Math.max(0,Math.min(480,seconds)):0;
  const stage=THREAT_STAGES.reduce((cur,next)=>t>=next.at?next:cur,THREAT_STAGES[0]);
  return {
    stage:THREAT_STAGES.indexOf(stage)+1,
    label:stage.label,
    pack:stage.pack,
    interval:Math.max(.32,.76-t/1000),
    health:1+t/140,
    speed:1+t/750,
    damage:Math.floor(t/60),
    spawnRadiusFactor:.43
  };
}
