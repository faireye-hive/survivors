/**
 * Fixed 8-minute threat curve. Starts approachable, adds pressure in stages;
 * caps population to keep Canvas drawing responsive on desktop and mobile.
 */
export const THREAT_STAGES=Object.freeze([
  Object.freeze({at:0,pack:1,label:'Calmaria'}),
  Object.freeze({at:75,pack:2,label:'Invasão'}),
  Object.freeze({at:210,pack:3,label:'Cerco'}),
  Object.freeze({at:360,pack:4,label:'Caos'})
]);
export function threatAt(seconds=0){
  const t=Number.isFinite(seconds)?Math.max(0,Math.min(480,seconds)):0;
  const stage=THREAT_STAGES.reduce((cur,next)=>t>=next.at?next:cur,THREAT_STAGES[0]);
  return {
    stage:THREAT_STAGES.indexOf(stage)+1,
    label:stage.label,
    pack:stage.pack,
    interval:Math.max(.36,.9-t/900),
    health:1+t/185,
    speed:1+t/1100,
    damage:Math.floor(t/65),
    spawnRadiusFactor:.49
  };
}
