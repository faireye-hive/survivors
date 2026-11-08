/** Timeline of one-off encounters. The regular horde still spawns as usual. */
export const ENCOUNTERS=Object.freeze([
  Object.freeze({
    id:'spore-bloom',at:75,title:'Florescimento Sombrio',
    subtitle:'Os Esporões cercam o santuário. Evite as nuvens de esporos!',
    type:'spore',count:7,elite:1
  }),
  Object.freeze({
    id:'ruins-web',at:195,title:'Teias das Ruínas',
    subtitle:'Aranhas velozes avançam em formação.',
    type:'spider',count:9,elite:1
  }),
  Object.freeze({
    id:'eclipse',at:320,title:'Eclipse de Éter',
    subtitle:'As criaturas das ruínas se unem numa última investida.',
    type:'mixed',count:12,elite:2
  }),
]);
export function chooseEncounterType(event,index){
  if(event.type!=='mixed')return event.type;
  return ['spore','spider','wraith'][index%3];
}
