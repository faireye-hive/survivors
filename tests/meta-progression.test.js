import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLASSES} from '../src/data/classes.js';
import {Game} from '../src/engine/Game.js';
import {META_IDS,META_UPGRADES,metaPrice,permanentBonuses} from '../src/data/metaUpgrades.js';
import {
  PROFILE_KEY,getProfile,recordRun,calculateRunGold,buyPermanentUpgrade
} from '../src/storage/Profile.js';
import {renderShopGrid} from '../src/ui/MetaShop.js';
import {updateProgression} from '../src/systems/Progression.js';

function storageStub(initial={}){
  const values=new Map(Object.entries(initial));
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>{values.set(key,String(value))},
    values
  };
}
function withStorage(run,initial={}){
  const old=globalThis.localStorage;
  const store=storageStub(initial);
  globalThis.localStorage=store;
  try{return run(store)}
  finally{
    if(old===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
}

test('perfil legado mantém recordes e ganha campos seguros da nova economia',()=>{
  withStorage(()=>{
    const p=getProfile();
    assert.equal(p.gold,0);
    assert.equal(p.runs,3);
    assert.equal(p.bestTime,145);
    assert.equal(p.bestKills,99);
    assert.deepEqual(Object.keys(p.upgrades),META_IDS);
    for(const id of META_IDS)assert.equal(p.upgrades[id],0);
  },{[PROFILE_KEY]:JSON.stringify({bestTime:145,bestKills:99,runs:3})});
});

test('ouro recompensa mais os níveis altos, mas derrota inicial também paga',()=>{
  const first=calculateRunGold({level:1,kills:0,time:0});
  const mid=calculateRunGold({level:5,kills:20,time:90});
  const late=calculateRunGold({level:12,kills:250,time:430});
  assert.ok(first>0);
  assert.ok(mid>first);
  assert.ok(late>mid*2);
  assert.ok(calculateRunGold({level:5,time:100,kills:80})>
    calculateRunGold({level:5,time:10,kills:0}));
  assert.equal(calculateRunGold({level:5,won:true})-
    calculateRunGold({level:5}),200);
  assert.equal(calculateRunGold({level:-9}),first);
  assert.ok(Number.isInteger(calculateRunGold({level:1e90,kills:Infinity,time:NaN})));
});

test('ao morrer recebe ouro persistente, preserva melhor tempo e máximo nível',()=>{
  withStorage(()=>{
    const first=recordRun(75,30,{level:4,won:false});
    assert.equal(first.runs,1);
    assert.equal(first.bestLevel,4);
    assert.ok(first.gold>0);
    assert.equal(first.lastGold,calculateRunGold({level:4,kills:30,time:75}));
    const second=recordRun(20,4,{level:2,won:false});
    assert.equal(second.runs,2);
    assert.equal(second.bestLevel,4);
    assert.equal(second.bestTime,75);
    assert.equal(second.bestKills,30);
    assert.equal(second.gold,first.gold+second.lastGold);
    assert.equal(second.lifetimeGold,second.gold);
    assert.deepEqual(getProfile(),second);
  });
});

test('a compra cobra exatamente uma vez, aumenta o nível e persiste no navegador',()=>{
  withStorage(()=>{
    recordRun(240,150,{level:12});
    const before=getProfile();
    const cost=metaPrice('vitality',0);
    assert.ok(before.gold>=cost);
    const result=buyPermanentUpgrade('vitality');
    assert.equal(result.ok,true);
    assert.equal(result.profile.gold,before.gold-cost);
    assert.equal(getProfile().upgrades.vitality,1);
    assert.equal(metaPrice('vitality',1)>cost,true);
    assert.equal(getProfile().gold,before.gold-cost);
    assert.deepEqual(permanentBonuses(getProfile()).maxHp,15);
    assert.equal(buyPermanentUpgrade('does-not-exist').ok,false);
    const almost=buyPermanentUpgrade('power');
    assert.equal(typeof almost.ok,'boolean');
    assert.ok(getProfile().gold>=0);
  });
});

test('não compra sem ouro, ao atingir máximo ou sem armazenamento',()=>{
  withStorage(store=>{
    let fail=buyPermanentUpgrade('power');
    assert.equal(fail.ok,false);
    assert.match(fail.reason,/insuficiente/i);
    assert.equal(getProfile().gold,0);
    const fully=Object.fromEntries(META_IDS.map(id=>[id,0]));
    fully.defense=META_UPGRADES.defense.maxLevel;
    store.setItem(PROFILE_KEY,JSON.stringify({gold:999999,upgrades:fully}));
    fail=buyPermanentUpgrade('defense');
    assert.equal(fail.ok,false);
    assert.match(fail.reason,/máximo/i);
    assert.equal(getProfile().gold,999999);
    assert.equal(metaPrice('defense',META_UPGRADES.defense.maxLevel),null);
  });
  const old=globalThis.localStorage;
  globalThis.localStorage={getItem:()=>JSON.stringify({gold:9999}),setItem:()=>{throw Error('blocked')}};
  try{
    assert.equal(buyPermanentUpgrade('power').ok,false);
  }finally{
    if(old===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
});

test('nova partida usa todos os atributos permanentes do mesmo perfil',()=>{
  withStorage(store=>{
    const bought={vitality:3,power:2,defense:2,mobility:3,reach:2,wisdom:4};
    store.setItem(PROFILE_KEY,JSON.stringify({gold:50,upgrades:bought}));
    for(const heroId of ['guardian','mage','ranger']){
      const mock={input:{reset(){}}};
      Game.prototype.reset.call(mock,heroId);
      const hero=CLASSES[heroId];
      assert.equal(mock.player.maxHp,hero.hp+45);
      assert.equal(mock.player.hp,hero.hp+45);
      assert.equal(mock.player.armor,hero.armor+2);
      assert.ok(Math.abs(mock.player.might-hero.might*1.12)<1e-9);
      assert.ok(Math.abs(mock.player.speed-hero.speed*1.12)<1e-9);
      assert.equal(mock.player.magnet,114);
      assert.equal(mock.player.experienceGain,1.36);
      assert.equal(mock.goldEarned,0);
      assert.equal(mock.upgrades.vitality,undefined,
        'melhorias de nível continuam separadas das permanentes');
    }
  });
});

test('sabedoria aumenta XP adquirido, sem duplicar o valor de ouro',()=>{
  const g={
    player:{x:0,y:0,radius:16,magnet:60,xp:0,nextXp:200,level:1,
      experienceGain:1.36,maxHp:100,hp:100},
    drops:[{x:0,y:0,kind:'xp',value:7,life:30}],
    elapsed:10,lastPickupSound:-100,audio:{play(){}}
  };
  updateProgression(g,.01);
  assert.equal(g.player.xp,10);
  assert.equal(g.drops.length,0);
});

test('resultado credita ouro uma única vez mesmo se finish for chamado novamente',()=>{
  withStorage(()=>{
    const cancel=globalThis.cancelAnimationFrame;
    globalThis.cancelAnimationFrame=()=>{};
    try{
      let calls=0;
      const g={
        state:'playing',elapsed:150,kills:45,player:{level:6},
        audio:{play(){}},ui:{showEnd(){calls++}},raf:1
      };
      Game.prototype.finish.call(g,false);
      assert.equal(g.state,'lost');
      assert.equal(getProfile().runs,1);
      assert.equal(g.goldEarned,getProfile().gold);
      Game.prototype.finish.call(g,false);
      assert.equal(getProfile().runs,1);
      assert.equal(calls,1);
    }finally{
      if(cancel===undefined)delete globalThis.cancelAnimationFrame;
      else globalThis.cancelAnimationFrame=cancel;
    }
  });
});

function fakeDocument(){
  const create=tag=>({
    tag,children:[],attrs:{},dataset:{},
    style:{setProperty(k,v){this[k]=v}},
    classList:{add(name){this.name=name}},
    setAttribute(k,v){this.attrs[k]=v},
    append(...kids){this.children.push(...kids)},
    replaceChildren(...kids){this.children=[...kids]}
  });
  return {createElement:create,createElementNS:(ns,tag)=>{
    assert.equal(ns,'http://www.w3.org/2000/svg');
    return create(tag);
  }};
}
test('loja desenha seis cartas responsivas com preços e níveis reais',()=>{
  const doc=fakeDocument(),root=doc.createElement('div');
  const p={gold:10000,upgrades:Object.fromEntries(META_IDS.map(id=>[id,0]))};
  renderShopGrid(root,p,doc);
  assert.equal(root.children.length,6);
  assert.deepEqual(root.children.map(b=>b.dataset.metaUpgrade),META_IDS);
  for(const button of root.children){
    assert.equal(button.tag,'button');
    assert.equal(button.disabled,false);
    assert.ok(button.attrs['aria-label'].includes('Comprar por'));
    assert.equal(button.children.length,3);
  }
  p.upgrades.defense=META_UPGRADES.defense.maxLevel;
  renderShopGrid(root,p,doc);
  assert.equal(root.children.find(x=>x.dataset.metaUpgrade==='defense').disabled,true);
});

test('menu, morte e loja ficam acessíveis sem perder o fluxo das partidas',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const ui=fs.readFileSync('src/ui/Interface.js','utf8');
  for(const id of ['menu-gold','open-shop','end-shop','end-gold-earned',
    'end-gold-wallet','shop-screen','shop-grid','shop-gold','shop-message','shop-close',
    'run-gold-preview']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.ok(ui.includes("action('open-shop',()=>this.showShop())"));
  assert.ok(ui.includes("action('end-shop',()=>this.showShop())"));
  assert.ok(ui.includes('buyPermanentUpgrade(button.dataset.metaUpgrade)'));
  assert.ok(ui.includes("if(this.game.state==='menu')this.showMenu()"));
  assert.ok(ui.includes('this.showEnd(this.game'));
  assert.ok(html.includes('MELHORIAS PERMANENTES'));
  const css=fs.readFileSync('src/styles.css','utf8');
  assert.ok(css.includes('.meta-upgrade-grid'));
  assert.ok(css.includes('@media(max-width:680px)'));
});
