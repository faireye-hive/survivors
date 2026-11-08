/**
 * Bosses depend on CHARACTER LEVEL, not elapsed time.
 * Every fifth level is a milestone; multiples of ten are main bosses.
 */
export function milestoneForLevel(level){
  if(!Number.isInteger(level)||level<5||level%5!==0)return null;
  const main=level%10===0;
  return {
    level,kind:main?'boss':'mini',
    title:main?'SOBERANO DO ECLIPSE':'CAÇADOR DE ELITE',
    subtitle:main?'Esquive da investida e dos projéteis em círculo!':
      'Um monstro gigante persegue você e prepara investidas.',
    bonusGold:main?200+level*20:55+level*9,
    levelTier:Math.max(1,Math.floor(level/5))
  };
}
export function miniBossType(level){
  // Deterministic cycle, each mini is a large version of a normal species.
  const types=['skeleton','spider','spore','wraith'];
  return types[Math.floor((level-5)/10)%types.length];
}
export function enemyLevelScaling(level=1){
  const lv=Math.max(0,Math.min(100,Math.floor(Number(level)||1)-1));
  return {
    health:1+lv*.065,
    speed:1+Math.min(.33,lv*.012),
    damage:Math.floor(lv/3)
  };
}
