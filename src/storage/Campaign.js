import {getProfile,spendGold} from './Profile.js';

export const CAMPAIGN_KEY='cronicas_eter_campaign_v1';
const KEY=CAMPAIGN_KEY;
export const REGIONS=[
  {name:'Bosque do Santuário',cost:0,wood:0,stone:0},
  {name:'Ruínas de Veyra',cost:180,wood:25,stone:12},
  {name:'Passo das Cinzas',cost:420,wood:45,stone:32},
  {name:'Cidadela Afogada',cost:850,wood:70,stone:65},
  {name:'Coroa do Eclipse',cost:1500,wood:110,stone:100}
];
export const SITE_DEFS={
  tower:{name:'Torre de vigia',icon:'⌖',wood:18,stone:8,seconds:7,defense:true},
  lumber:{name:'Depósito de recursos',icon:'▰',wood:24,stone:5,seconds:9},
  quarry:{name:'Oficina de produção',icon:'⚒',wood:14,stone:12,seconds:10},
  wall:{name:'Muralha',icon:'▤',wood:30,stone:20,seconds:12,defense:true}
};
export const SITE_POSITIONS={
  tower:{x:-285,y:-145},lumber:{x:132,y:-76},quarry:{x:-132,y:82},wall:{x:132,y:82}
};
export const WORKERS={
  lumberjack:{name:'Lenhador',icon:'🪓',gold:70,x:-90},
  miner:{name:'Minerador',icon:'⛏',gold:85,x:0},
  guard:{name:'Sentinela',icon:'🛡',gold:110,x:90}
};
export const WORKER_Y=118;
export const IDLE_TICK_MS=15000;
export const MAX_OFFLINE_MS=24*60*60*1000;
const blankFort=()=>({buildings:{tower:1,lumber:0,quarry:0,wall:0},workers:[],project:null,integrity:100,maxIntegrity:100,lastRaid:null});
const fresh=()=>({region:0,wood:30,stone:18,fortresses:[blankFort()],lastProductionAt:Date.now()});
function normalize(raw){
  const c={...fresh(),...raw};
  c.region=Math.max(0,Math.min(REGIONS.length-1,Number(c.region)||0));
  c.fortresses=Array.isArray(c.fortresses)?c.fortresses:[];
  for(let i=0;i<=c.region;i++){
    const f=c.fortresses[i]||blankFort();
    f.buildings={tower:0,lumber:0,quarry:0,wall:0,...(f.buildings||{})};
    f.workers=Array.isArray(f.workers)?f.workers:[];f.project??=null;
    f.maxIntegrity=Math.max(1,Number(f.maxIntegrity)||100);
    f.integrity=Math.max(0,Math.min(f.maxIntegrity,Number.isFinite(Number(f.integrity))?Number(f.integrity):f.maxIntegrity));
    f.lastRaid??=null;
    c.fortresses[i]=f;
  }
  return c;
}
export function getCampaign(){
  try{return normalize(JSON.parse(globalThis.localStorage?.getItem(KEY)||'null')||fresh());}
  catch{return fresh();}
}
function save(c){try{globalThis.localStorage?.setItem(KEY,JSON.stringify(c));}catch{}return c;}
export function gatherMaterials(wood=0,stone=0){
  const c=getCampaign();c.wood=Math.min(999999,c.wood+wood);c.stone=Math.min(999999,c.stone+stone);return save(c);
}
export function siteBuilt(fort,key){return (fort?.buildings?.[key]||0)>0;}
export function campaignSummary(campaign){
  const c=normalize(campaign||fresh());
  let woodPerTick=0,stonePerTick=0;
  for(const fort of c.fortresses){
    if((fort.integrity??100)<=0)continue;
    const workers=Array.isArray(fort.workers)?fort.workers:[];
    woodPerTick+=(fort.buildings.lumber||0)*workers.filter(w=>w.role==='lumberjack').length*3;
    stonePerTick+=(fort.buildings.quarry||0)*workers.filter(w=>w.role==='miner').length*3;
  }
  const next=REGIONS[c.region+1]||null;
  return {
    region:c.region,regionName:REGIONS[c.region].name,fortressCount:c.fortresses.length,
    wood:c.wood,stone:c.stone,woodPerMinute:woodPerTick*4,stonePerMinute:stonePerTick*4,
    nextRegion:next,integrity:c.fortresses[c.region]?.integrity??100,
    maxIntegrity:c.fortresses[c.region]?.maxIntegrity??100,
    raid:c.fortresses[c.region]?.lastRaid||null
  };
}
export function idleProduction(fortresses,elapsedMs){
  const elapsed=Math.max(0,Math.min(MAX_OFFLINE_MS,Number(elapsedMs)||0));
  const ticks=Math.floor(elapsed/IDLE_TICK_MS);
  let wood=0,stone=0;
  for(const fort of fortresses||[]){
    if((fort.integrity??100)<=0)continue;
    const workers=Array.isArray(fort.workers)?fort.workers:[];
    wood+=(fort.buildings?.lumber||0)*workers.filter(w=>w.role==='lumberjack').length*3;
    stone+=(fort.buildings?.quarry||0)*workers.filter(w=>w.role==='miner').length*3;
  }
  return {wood:ticks*wood,stone:ticks*stone,ticks};
}
/** Apply one active-game raid. Walls absorb damage; towers and guards defeat attackers. */
export function resolveFortRaid(fort,region=0,elapsed=0){
  const next={...fort,buildings:{...(fort?.buildings||{})},workers:[...(fort?.workers||[])]};
  next.maxIntegrity=Math.max(1,Number(next.maxIntegrity)||100);
  next.integrity=Math.max(0,Math.min(next.maxIntegrity,Number.isFinite(Number(next.integrity))?Number(next.integrity):next.maxIntegrity));
  const towers=next.buildings.tower||0,walls=next.buildings.wall||0;
  const guards=next.workers.filter(w=>w.role==='guard').length;
  const threat=28+Math.max(0,region)*10+Math.floor(Math.max(0,elapsed)/90)*4;
  const defense=towers*20+guards*14;
  const damage=Math.max(0,threat-defense-walls*12);
  if(next.integrity<=0)return {fort:next,raid:{result:'breached',damage:0,threat,defense}};
  next.integrity=Math.max(0,next.integrity-damage);
  const raid={result:damage===0?'repelled':next.integrity===0?'breached':'damaged',damage,threat,defense};
  next.lastRaid=raid;
  return {fort:next,raid};
}
export function raidFortress(region,elapsed=0){
  const c=getCampaign(),fort=c.fortresses[region];
  if(!fort)return {ok:false,state:c,raid:null};
  const result=resolveFortRaid(fort,region,elapsed);
  c.fortresses[region]=result.fort;save(c);
  return {ok:true,state:c,raid:result.raid};
}
export function repairFortress(region,amount=20){
  const c=getCampaign(),fort=c.fortresses[region];
  if(!fort)return {ok:false,reason:'Fortaleza indisponível.',state:c};
  if(fort.integrity>=fort.maxIntegrity)return {ok:false,reason:'A fortaleza já está íntegra.',state:c};
  const cost=5;
  if(c.wood<cost||c.stone<cost)return {ok:false,reason:`Reparo exige ${cost} madeira e ${cost} pedra.`,state:c};
  c.wood-=cost;c.stone-=cost;
  fort.integrity=Math.min(fort.maxIntegrity,fort.integrity+Math.max(1,amount));
  save(c);return {ok:true,reason:'Fortaleza reparada.',state:c};
}
export function startConstruction(region,key){
  const c=getCampaign(),fort=c.fortresses[region],def=SITE_DEFS[key];
  if(!fort||!def)return {ok:false,reason:'Obra indisponível.',state:c};
  if(fort.project)return {ok:false,reason:'Já existe uma obra em andamento nesta fortaleza.',state:c};
  const level=fort.buildings[key]||0,scale=1+level*.55;
  const wood=Math.ceil(def.wood*scale),stone=Math.ceil(def.stone*scale);
  fort.project={type:key,progress:0,required:def.seconds+level*2,woodRequired:wood,stoneRequired:stone,woodDelivered:0,stoneDelivered:0};
  save(c);return {ok:true,reason:`Canteiro preparado. Permaneça na área para entregar materiais à ${def.name.toLowerCase()}.`,state:c};
}
/** Deliver a physical load from the campaign stores to the active site. */
export function depositConstruction(region,key,load=2){
  const c=getCampaign(),fort=c.fortresses[region],project=fort?.project;
  if(!project||project.type!==key||!Number.isFinite(project.woodRequired))return {ok:false,state:c,delivered:false};
  const amount=Math.max(1,Math.floor(load));
  const wood=Math.min(amount,c.wood,project.woodRequired-project.woodDelivered);
  const stone=Math.min(amount,c.stone,project.stoneRequired-project.stoneDelivered);
  if(!wood&&!stone)return {ok:false,state:c,delivered:false};
  c.wood-=wood;c.stone-=stone;project.woodDelivered+=wood;project.stoneDelivered+=stone;
  const fraction=Math.min(project.woodDelivered/project.woodRequired,project.stoneDelivered/project.stoneRequired);
  project.progress=project.required*fraction;
  let completed=false;
  if(project.woodDelivered>=project.woodRequired&&project.stoneDelivered>=project.stoneRequired){
    fort.buildings[key]=(fort.buildings[key]||0)+1;fort.project=null;completed=true;
  }
  save(c);return {ok:true,state:c,delivered:true,wood,stone,progress:fraction,completed};
}
export function tickConstruction(c,region,key,dt){
  const fort=c.fortresses[region],project=fort?.project;
  if(!project||project.type!==key||Number.isFinite(project.woodRequired))return {done:false,state:c};
  project.progress=Math.min(project.required,project.progress+dt);
  if(project.progress>=project.required){
    fort.buildings[key]=(fort.buildings[key]||0)+1;fort.project=null;
    return {done:true,state:save(c)};
  }
  if(Math.floor(project.progress*2)!==Math.floor((project.progress-dt)*2))save(c);
  return {done:false,state:c};
}
export function advanceConstructions(c,dt){
  const completed=[];
  for(let i=0;i<(c?.fortresses?.length||0);i++){
    const type=c.fortresses[i].project?.type;
    if(!type)continue;
    const result=tickConstruction(c,i,type,dt);
    if(result.done)completed.push(i);
  }
  return {state:c,completed};
}
export function hireWorker(region,role){
  const c=getCampaign(),fort=c.fortresses[region],def=WORKERS[role];
  if(!fort||!def)return {ok:false,reason:'Contratação indisponível.',state:c};
  if(fort.workers.some(w=>w.role===role))return {ok:false,reason:`Já há um ${def.name.toLowerCase()} nesta base.`,state:c};
  if(role==='guard'&&!(fort.buildings.tower||0))return {ok:false,reason:'Construa uma torre antes de contratar a sentinela.',state:c};
  if(role==='lumberjack'&&!(fort.buildings.lumber||0))return {ok:false,reason:'Construa o depósito de recursos antes de contratar o lenhador.',state:c};
  if(role==='miner'&&!(fort.buildings.quarry||0))return {ok:false,reason:'Construa a oficina de produção antes de contratar o minerador.',state:c};
  const paid=spendGold(def.gold);
  if(!paid.ok)return {ok:false,reason:`Faltam ${def.gold-getProfile().gold} moedas para contratar.`,state:c};
  fort.workers.push({role,hiredAt:Date.now()});save(c);
  return {ok:true,reason:`${def.name} contratado. Agora trabalha nesta fortaleza.`,state:c};
}
export function advanceRegion(){
  const c=getCampaign(),next=REGIONS[c.region+1],fort=c.fortresses[c.region];
  if(!next)return {ok:false,reason:'Todas as regiões foram conquistadas.',state:c};
  if(fort.integrity<=0)return {ok:false,reason:'Repare a fortaleza antes de avançar.',state:c};
  const defenses=(fort.buildings.tower||0)+(fort.buildings.wall||0);
  if(defenses<2)return {ok:false,reason:'Construa duas defesas antes de abrir a passagem.',state:c};
  if(c.wood<next.wood||c.stone<next.stone)return {ok:false,reason:`A passagem exige ${next.wood} madeira e ${next.stone} pedra.`,state:c};
  const paid=spendGold(next.cost);
  if(!paid.ok)return {ok:false,reason:`A passagem custa ${next.cost} moedas. Continue derrotando monstros para juntar ouro.`,state:c};
  c.wood-=next.wood;c.stone-=next.stone;c.region++;c.fortresses.push(blankFort());
  return {ok:true,reason:`Passagem aberta: ${next.name}.`,state:save(c)};
}
export function collectIdleProduction(){
  const c=getCampaign(),now=Date.now(),last=Number(c.lastProductionAt)||now;
  const produced=idleProduction(c.fortresses,now-last);
  c.wood=Math.min(999999,c.wood+produced.wood);c.stone=Math.min(999999,c.stone+produced.stone);
  c.lastProductionAt=now;return save(c);
}
