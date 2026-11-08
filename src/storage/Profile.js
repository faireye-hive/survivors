import {META_IDS,META_UPGRADES,metaPrice} from '../data/metaUpgrades.js';

// Keep the original v1 key: migration is additive and preserves existing records.
export const PROFILE_KEY='cronicas_eter_profile_v1';
const GOLD_CAP=1_000_000_000;
const safeInt=(v,max=GOLD_CAP)=>{
  const n=Number(v);
  return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
};
const levels=(raw={})=>Object.fromEntries(META_IDS.map(id=>
  [id,safeInt(raw?.[id],META_UPGRADES[id].maxLevel)]));
export function getProfile(){
  let v={};
  try{v=JSON.parse(globalThis.localStorage?.getItem(PROFILE_KEY)||'{}')||{}}
  catch{}
  return {
    bestTime:safeInt(v.bestTime,86400),bestKills:safeInt(v.bestKills),
    bestLevel:safeInt(v.bestLevel,10000),runs:safeInt(v.runs),
    gold:safeInt(v.gold),lifetimeGold:safeInt(v.lifetimeGold),
    lastGold:safeInt(v.lastGold),upgrades:levels(v.upgrades)
  };
}
function persist(profile){
  try{
    if(!globalThis.localStorage?.setItem)return false;
    globalThis.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
    return true;
  }catch{return false;}
}
/**
 * Gold increases steeply with level reached and also rewards kills/time.
 * Even an early defeat yields gold. The victory bonus is optional.
 * All values are bounded to prevent malformed stats / overflow.
 */
export function calculateRunGold({level=1,kills=0,time=0,won=false,bonusGold=0}={}){
  const lv=Math.max(1,safeInt(level,1000));
  const defeated=safeInt(kills,1_000_000);
  const seconds=safeInt(time,86400);
  return Math.min(GOLD_CAP,10+lv*10+lv*lv*3+
    Math.floor(defeated/6)+Math.floor(seconds/10)+(won?200:0)+safeInt(bonusGold));
}
export function recordRun(time,kills,options={}){
  const p=getProfile();
  const earned=calculateRunGold({
    level:options.level??1,kills,time,won:options.won===true,
    bonusGold:options.bonusGold??0
  });
  p.bestTime=Math.max(p.bestTime,safeInt(time,86400));
  p.bestKills=Math.max(p.bestKills,safeInt(kills));
  p.bestLevel=Math.max(p.bestLevel,safeInt(options.level??1,10000));
  p.runs=Math.min(GOLD_CAP,p.runs+1);
  p.gold=Math.min(GOLD_CAP,p.gold+earned);
  p.lifetimeGold=Math.min(GOLD_CAP,p.lifetimeGold+earned);
  p.lastGold=earned;
  persist(p);
  return p;
}
/** Purchase atomically within this browser tab; keep wallet unchanged on failure. */
export function buyPermanentUpgrade(id){
  const def=META_UPGRADES[id],profile=getProfile();
  if(!def)return {ok:false,reason:'Melhoria desconhecida.',profile};
  const level=profile.upgrades[id];
  const cost=metaPrice(id,level);
  if(cost===null)return {ok:false,reason:'Nível máximo alcançado.',profile};
  if(profile.gold<cost)return {ok:false,reason:'Ouro insuficiente.',profile};
  const next={...profile,gold:profile.gold-cost,
    upgrades:{...profile.upgrades,[id]:level+1}};
  if(!persist(next))return {ok:false,reason:'Não foi possível salvar as melhorias.',profile};
  return {ok:true,reason:def.name+' melhorado para nível '+(level+1)+'.',profile:next};
}
