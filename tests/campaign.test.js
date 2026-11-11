import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_KEY,REGIONS,IDLE_TICK_MS,MAX_OFFLINE_MS,getCampaign,
  idleProduction,campaignSummary,resolveFortRaid,advanceConstructions,
  repairFortress,advanceRegion,startConstruction,depositConstruction,hireWorker
} from '../src/storage/Campaign.js';
import {PROFILE_KEY} from '../src/storage/Profile.js';

function withStorage(initial,run){
  const old=globalThis.localStorage,values=new Map(Object.entries(initial));
  globalThis.localStorage={
    getItem:key=>values.get(key)||null,
    setItem:(key,value)=>values.set(key,String(value))
  };
  try{run(values)}finally{
    if(old===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
}

const productiveFort=(integrity=100)=>({
  buildings:{tower:1,lumber:2,quarry:1,wall:0},
  workers:[{role:'lumberjack'},{role:'miner'}],integrity,maxIntegrity:100
});

test('produção offline usa o tempo decorrido, não excede 24 horas e respeita base violada',()=>{
  const fort=productiveFort();
  const production=idleProduction([fort],IDLE_TICK_MS*4+999);
  assert.deepEqual(production,{wood:24,stone:12,ticks:4});
  const capped=idleProduction([fort],MAX_OFFLINE_MS*3);
  assert.deepEqual(capped,{wood:34560,stone:17280,ticks:5760});
  assert.deepEqual(idleProduction([productiveFort(0)],MAX_OFFLINE_MS),{wood:0,stone:0,ticks:5760});
});

test('campanha antiga carrega sem perder recursos, região ou construções',()=>{
  const legacy={region:1,wood:37,stone:19,fortresses:[
    {buildings:{tower:2,lumber:1,quarry:0,wall:1},workers:[{role:'lumberjack'}]},
    {buildings:{tower:1},workers:[]}
  ]};
  withStorage({[CAMPAIGN_KEY]:JSON.stringify(legacy)},()=>{
    const c=getCampaign(),summary=campaignSummary(c);
    assert.equal(c.region,1);
    assert.equal(c.wood,37);
    assert.equal(c.stone,19);
    assert.equal(c.fortresses[0].buildings.tower,2);
    assert.equal(c.fortresses[0].integrity,100);
    assert.equal(summary.regionName,REGIONS[1].name);
    assert.equal(summary.fortressCount,2);
    assert.equal(summary.woodPerMinute,12);
  });
});

test('torres derrotam incursões, muralhas reduzem dano e fortaleza pode ser violada',()=>{
  const towerOnly=resolveFortRaid(productiveFort(),0,0);
  assert.equal(towerOnly.raid.result,'damaged');
  assert.equal(towerOnly.fort.integrity,92);
  const fortified=resolveFortRaid({...productiveFort(),buildings:{tower:1,wall:1}},0,0);
  assert.equal(fortified.raid.result,'repelled');
  assert.equal(fortified.fort.integrity,100);
  const guarded=resolveFortRaid({...productiveFort(),workers:[{role:'guard'}]},0,0);
  assert.equal(guarded.raid.defense,34);
  assert.equal(guarded.raid.result,'repelled');
  const breached=resolveFortRaid({...productiveFort(3),buildings:{tower:0,wall:0}},2,180);
  assert.equal(breached.raid.result,'breached');
  assert.equal(breached.fort.integrity,0);
});

test('fortaleza violada pode ser reparada; expansão exige base íntegra e recursos',()=>{
  const profile={gold:100};
  const campaign={region:0,wood:10,stone:10,fortresses:[{
    buildings:{tower:1,lumber:0,quarry:0,wall:1},workers:[],integrity:0,maxIntegrity:100
  }]};
  withStorage({[CAMPAIGN_KEY]:JSON.stringify(campaign),[PROFILE_KEY]:JSON.stringify(profile)},()=>{
    assert.equal(advanceRegion().ok,false);
    const repaired=repairFortress(0);
    assert.equal(repaired.ok,true);
    assert.equal(repaired.state.fortresses[0].integrity,20);
    assert.equal(repaired.state.wood,5);
    assert.equal(repaired.state.stone,5);
    assert.equal(advanceRegion().ok,false);
  });
});

test('obras em todas as fortalezas avançam sem depender da posição do herói',()=>{
  const c={fortresses:[
    {buildings:{tower:1,lumber:0,quarry:0,wall:0},workers:[],project:{type:'wall',progress:11,required:12}},
    {buildings:{tower:1,lumber:0,quarry:0,wall:0},workers:[],project:{type:'lumber',progress:8,required:9}}
  ]};
  const result=advanceConstructions(c,1);
  assert.deepEqual(result.completed,[0,1]);
  assert.equal(c.fortresses[0].buildings.wall,1);
  assert.equal(c.fortresses[1].buildings.lumber,1);
  assert.equal(c.fortresses[0].project,null);
  assert.equal(c.fortresses[1].project,null);
});

test('obra começa sem débito e só progride com materiais entregues no canteiro',()=>{
  const initial={region:0,wood:30,stone:18,fortresses:[{buildings:{tower:1,lumber:0,quarry:0,wall:0},workers:[]}]};
  withStorage({[CAMPAIGN_KEY]:JSON.stringify(initial)},()=>{
    const started=startConstruction(0,'lumber');
    assert.equal(started.ok,true);
    assert.equal(started.state.wood,30);
    assert.equal(started.state.stone,18);
    assert.equal(started.state.fortresses[0].project.woodRequired,24);
    const first=depositConstruction(0,'lumber',2);
    assert.equal(first.delivered,true);
    assert.equal(first.progress,2/24);
    assert.equal(first.state.wood,28);
    for(let i=0;i<11;i++)depositConstruction(0,'lumber',2);
    const final=getCampaign();
    assert.equal(final.fortresses[0].buildings.lumber,1);
    assert.equal(final.fortresses[0].project,null);
    assert.equal(final.wood,6);
    assert.equal(final.stone,13);
  });
});
test('trabalhadores de coleta exigem sua instalação e ficam contratados após pagar ouro',()=>{
  const initial={region:0,wood:30,stone:18,fortresses:[{buildings:{tower:1,lumber:0,quarry:0,wall:0},workers:[]}]};
  withStorage({[CAMPAIGN_KEY]:JSON.stringify(initial),[PROFILE_KEY]:JSON.stringify({gold:500})},values=>{
    assert.equal(hireWorker(0,'lumberjack').ok,false);
    assert.equal(hireWorker(0,'miner').ok,false);
    values.set(CAMPAIGN_KEY,JSON.stringify({...initial,fortresses:[{...initial.fortresses[0],buildings:{...initial.fortresses[0].buildings,lumber:1}}]}));
    const hired=hireWorker(0,'lumberjack');
    assert.equal(hired.ok,true);
    assert.equal(hired.state.fortresses[0].workers[0].role,'lumberjack');
  });
});
