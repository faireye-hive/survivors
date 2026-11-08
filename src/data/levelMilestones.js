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
/** Common monsters gain exactly 5% HP multiplicatively at every hero level.
 * Level 1 = 100%, level 2 = 105%, level 10 = 155%, level 20 = 253%.
 * Round once when the enemy is created, never on each level-up.
 */
export function enemyLevelScaling(level=1){
  const lv=Math.max(0,Math.min(100,Math.floor(Number(level)||1)-1));
  return {
    health:Math.pow(1.05,lv),
    speed:1+Math.min(.33,lv*.012),
    damage:Math.floor(lv/3)
  };
}
/** The clock already adds 2–5 enemies per wave; each level adds one more,
 * eventually capped to protect performance and leave room for bosses.
 */
export function levelHordePressure(level=1,basePack=2,baseInterval=.76){
  const extra=Math.max(0,Math.min(100,Math.floor(Number(level)||1)-1));
  return {
    pack:Math.min(24,Math.max(1,Math.floor(basePack))+extra),
    interval:Math.max(.34,baseInterval-Math.min(.24,extra*.015)),
    // The ring contracts gently as the swarm grows.
    radiusFactor:Math.max(.25,.43-extra*.007)
  };
}
