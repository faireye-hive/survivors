/**
 * Persistent character progression. These are earned with in-game gold only.
 * Upgrades are applied once when starting a new run, never mid-fight.
 */
export const META_UPGRADES=Object.freeze({
  vitality:Object.freeze({name:'Vigor eterno',icon:'stat:vitality',color:'#f0a7b6',
    glyph:'♥',effect:'+15 PV iniciais',description:'Aumenta a vida máxima em todas as próximas partidas.',
    baseCost:65,growth:1.55,maxLevel:8}),
  power:Object.freeze({name:'Poder ancestral',icon:'stat:might',color:'#f1a58d',
    glyph:'✊',effect:'+6% dano inicial',description:'Fortalece todas as armas desde o início da partida.',
    baseCost:85,growth:1.6,maxLevel:8}),
  defense:Object.freeze({name:'Armadura rúnica',icon:'stat:armor',color:'#a9cafd',
    glyph:'⬡',effect:'+1 armadura inicial',description:'Reduz o dano recebido em qualquer classe.',
    baseCost:100,growth:1.7,maxLevel:5}),
  mobility:Object.freeze({name:'Botas do vento',icon:'stat:haste',color:'#94e8cf',
    glyph:'➤',effect:'+4% velocidade',description:'Aumenta a mobilidade em novas tentativas.',
    baseCost:70,growth:1.55,maxLevel:8}),
  reach:Object.freeze({name:'Atração de Éter',icon:'stat:magnet',color:'#cbb5ff',
    glyph:'∩',effect:'+20 alcance de coleta',description:'Atrai cristais de experiência de mais longe.',
    baseCost:55,growth:1.5,maxLevel:6}),
  wisdom:Object.freeze({name:'Sabedoria acumulada',icon:'meta:wisdom',color:'#e4c88b',
    glyph:'✧',effect:'+9% experiência',description:'Faz subir de nível mais rapidamente em novas partidas.',
    baseCost:80,growth:1.6,maxLevel:8})
});
export const META_IDS=Object.freeze(Object.keys(META_UPGRADES));
export function metaPrice(id,level=0){
  const def=META_UPGRADES[id];
  if(!def)return null;
  if(!Number.isInteger(level)||level<0||level>=def.maxLevel)return null;
  return Math.round(def.baseCost*def.growth**level);
}
function levelOf(profile,id){
  const v=profile?.upgrades?.[id];
  return Number.isInteger(v)?Math.max(0,Math.min(v,META_UPGRADES[id].maxLevel)):0;
}
export function permanentBonuses(profile){
  const lv=id=>levelOf(profile,id);
  return {
    maxHp:15*lv('vitality'),might:1+.06*lv('power'),
    armor:lv('defense'),speed:1+.04*lv('mobility'),
    magnet:20*lv('reach'),experience:1+.09*lv('wisdom')
  };
}
