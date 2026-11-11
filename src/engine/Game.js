import { CLASSES } from '../data/classes.js';
import { Input } from '../core/Input.js';
import { World } from '../world/World.js';
import { Renderer3D } from '../render/three/Renderer3D.js';
import { AudioEngine } from '../audio/Audio.js';
import { spawnEnemy, updateEnemies } from '../systems/Enemies.js';
import { updateCombat } from '../systems/Combat.js';
import { updateProgression, applyChoice, xpForLevel } from '../systems/Progression.js';
import { getProfile,recordRun } from '../storage/Profile.js';
import {permanentBonuses} from '../data/metaUpgrades.js';
import {getCampaign,gatherMaterials,startConstruction,advanceConstructions,hireWorker,advanceRegion,collectIdleProduction,raidFortress,repairFortress,SITE_DEFS,SITE_POSITIONS,WORKERS,WORKER_Y} from '../storage/Campaign.js';

export class Game {
  static DURATION=Infinity;
  constructor(canvas,ui){
    this.canvas=canvas;
    this.ui=ui;this.renderer=new Renderer3D(canvas);this.audio=new AudioEngine();
    this.width=1;this.height=1;this.dpr=1;
    this.state='menu';this.paused=false;this.pauseReason=null;this.lastClass='guardian';
    this.input=new Input(canvas,()=>this.togglePause());
    this.frame=this.frame.bind(this);
    this.resize=()=>this.resizeCanvas();
    this.visibility=()=>{if(document.hidden&&this.state==='playing'&&!this.paused)this.togglePause();};
    window.addEventListener('resize',this.resize);
    document.addEventListener('visibilitychange',this.visibility);
    this.resizeCanvas();this.raf=0;this.lastTick=0;
    this.reset('guardian');this.render();
  }
  reset(classId){
    const hero=CLASSES[classId]||CLASSES.guardian;
    this.lastClass=hero.id;this.world=new World(173);
    collectIdleProduction();
    const bonuses=permanentBonuses(getProfile());
    const hp=hero.hp+bonuses.maxHp;
    this.campaign=getCampaign();
    this.player={x:this.campaign.region*1800+200,y:0,vx:0,vy:0,radius:16,hp,maxHp:hp,
      speed:hero.speed*bonuses.speed,armor:hero.armor+bonuses.armor,
      might:hero.might*bonuses.might,magnet:74+bonuses.magnet,
      experienceGain:bonuses.experience,
      xp:0,nextXp:xpForLevel(1),level:1,classId:hero.id,facing:0,inv:0,attackPose:0};
    this.frameDt=0;this.elapsed=0;this.kills=0;this.spawnTimer=.7;this.lastPickupSound=-10;
    this.levelMilestones=new Set();this.enemyShots=[];this.bonusGold=0;
    this.enemies=[];this.drops=[];this.projectiles=[];this.effects=[];this.particles=[];this.floatTexts=[];
    this.resourceNodes=[];this.resourceSpawnTimer=3;
    this.hazards=[];this.encountersSeen=new Set();this.eventBanner=null;this.relics=0;
    this.goldEarned=0;this.towerTimer=0;this.raidTimer=55;this.campaignSync=0;this.productionTimer=15;
    this.interactionHint=null;this.nearbyInteraction=null;this.interactionMessage='';this.interactionMessageTime=0;
    this.upgrades={};this.weapons=[{id:hero.weapon,level:1,cooldown:.2}];
    this.currentChoices=null;this.paused=false;this.pauseReason=null;this.input.reset();
  }
  resizeCanvas(){
    const rect=this.canvas.getBoundingClientRect();
    this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.renderer.resize(this.width,this.height,this.dpr);
  }
  start(classId=this.lastClass){
    cancelAnimationFrame(this.raf);this.reset(classId);
    // Inimigos próximos garantem que os primeiros segundos já sejam jogáveis.
    for(let i=0;i<6;i++){
      spawnEnemy(this,i%3===0?'bat':'slime',{angle:i*Math.PI/3,radius:500+i*16});
    }
    this.state='playing';this.ui.showPlaying();this.audio.unlock();
    this.lastTick=performance.now();this.raf=requestAnimationFrame(this.frame);
  }
  backToMenu(){
    cancelAnimationFrame(this.raf);this.raf=0;this.state='menu';this.paused=false;
    this.input.reset();this.ui.showMenu();this.render();
  }
  togglePause(){
    if(this.state!=='playing'||this.pauseReason==='level')return;
    this.paused=!this.paused;this.pauseReason=this.paused?'manual':null;
    this.input.reset();this.ui.showPause(this.paused);
    this.lastTick=performance.now();
  }
  selectUpgrade(id){
    if(this.state!=='playing'||this.pauseReason!=='level')return;
    if(!this.currentChoices?.some(c=>c.id===id))return;
    if(!applyChoice(this,id))return;
    this.paused=false;this.pauseReason=null;this.currentChoices=null;
    this.ui.showPlaying();this.lastTick=performance.now();
  }
  finish(won){
    if(this.state!=='playing')return;
    this.state=won?'won':'lost';this.paused=true;
    const profile=recordRun(this.elapsed,this.kills,{
      level:this.player.level,won,bonusGold:this.bonusGold||0
    });
    this.goldEarned=profile.lastGold;
    this.goldWallet=profile.gold;
    this.audio.play(won?'level':'death');
    this.ui.showEnd(this,won);
    cancelAnimationFrame(this.raf);this.raf=0;
  }
  addText(text,x,y,color){
    this.floatTexts.push({text,x,y,color,life:.78,duration:.78});
    if(this.floatTexts.length>75)this.floatTexts.shift();
  }
  burst(x,y,color,count){
    for(let i=0;i<count&&this.particles.length<240;i++){
      const a=Math.random()*Math.PI*2,s=45+Math.random()*140;
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,radius:1.5+Math.random()*3,
        color,life:.3+Math.random()*.3,duration:.6});
    }
  }
  step(dt){
    this.elapsed+=dt;
    const v=this.input.vector(),p=this.player;
    p.vx=v.x*p.speed;p.vy=v.y*p.speed;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.vx||p.vy)p.facing=Math.atan2(p.vy,p.vx);
    p.inv=Math.max(0,p.inv-dt);
    p.attackPose=Math.max(0,(p.attackPose||0)-dt);
    this.updateInteractionTarget();
    if(this.input.consumeKey('KeyE'))this.interact();
    updateEnemies(this,dt);
    if(this.state!=='playing')return;
    this.updateCampaign(dt);
    updateCombat(this,dt);
    updateProgression(this,dt);
    for(const fx of this.effects)fx.life-=dt;
    this.effects=this.effects.filter(e=>e.life>0);
    for(const t of this.floatTexts){t.y-=28*dt;t.life-=dt;}
    this.floatTexts=this.floatTexts.filter(t=>t.life>0);
    for(const pt of this.particles){
      pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=.95;pt.vy*=.95;pt.life-=dt;
    }
    this.particles=this.particles.filter(p=>p.life>0);
    this.ui.update(this);
  }
  updateCampaign(dt){
    this.campaignSync-=dt;
    if(this.campaignSync<=0){this.campaign=getCampaign();this.campaignSync=3;}
    const p=this.player;
    this.productionTimer-=dt;
    if(this.productionTimer<=0){this.campaign=collectIdleProduction();this.productionTimer=15;}
    const constructions=advanceConstructions(this.campaign,dt);
    this.campaign=constructions.state;
    for(const i of constructions.completed){
      this.addText('✦ OBRA CONCLUÍDA ✦',i*1800,-58,'#f2d493');
      this.interactionMessage='Construção concluída!';this.interactionMessageTime=3;
    }
    this.interactionMessageTime=Math.max(0,this.interactionMessageTime-dt);
    this.resourceSpawnTimer-=dt;
    if(this.resourceSpawnTimer<=0){
      this.resourceSpawnTimer=5;
      if(this.resourceNodes.length<5){
        for(let attempt=0;attempt<28;attempt++){
          const angle=Math.random()*Math.PI*2,dist=110+Math.random()*290;
          const x=p.x+Math.cos(angle)*dist,y=p.y+Math.sin(angle)*dist;
          const biome=this.world.biomeAt(Math.floor(x/96),Math.floor(y/96));
          const kind=biome==='grove'?'wood':biome==='ruins'?'stone':null;
          if(!kind||this.resourceNodes.some(node=>Math.hypot(node.x-x,node.y-y)<100))continue;
          this.resourceNodes.push({id:Date.now()+Math.random(),x,y,kind,value:kind==='wood'?4:3});break;
        }
      }
    }
    this.raidTimer-=dt;
    if(this.raidTimer<=0&&this.campaign.fortresses.length){
      this.raidTimer=55;
      const region=this.campaign.region;
      const result=raidFortress(region,this.elapsed);
      if(result.ok){
        this.campaign=result.state;
        const raid=result.raid;
        const messages={repelled:'A fortaleza repeliu uma incursão.',damaged:'A fortaleza sofreu danos. Volte para repará-la.',breached:'A fortaleza foi violada! Repare-a para retomar a produção.'};
        this.interactionMessage=messages[raid.result];this.interactionMessageTime=5;
        this.eventBanner={title:raid.result==='repelled'?'INVASÃO REPELIDA':'ATAQUE À FORTALEZA',subtitle:messages[raid.result],remaining:4};
        this.addText(raid.result==='repelled'?'✦ INVASÃO REPELIDA ✦':'⚠ FORTALEZA SOB ATAQUE',region*1800, -90,raid.result==='repelled'?'#f2d493':'#ff9a8b');
      }
    }
  }
  updateInteractionTarget(){
    const region=this.campaign.region,baseX=region*1800,p=this.player,options=[];
    for(let i=0;i<this.campaign.fortresses.length;i++){
      const fort=this.campaign.fortresses[i],x0=i*1800;
      for(const [key,pos] of Object.entries(SITE_POSITIONS)){
        const x=x0+pos.x,y=pos.y,dist=Math.hypot(p.x-x,p.y-y),def=SITE_DEFS[key];
        if(dist<62){
          const level=fort.buildings[key]||0,wood=Math.ceil(def.wood*(1+level*.55)),stone=Math.ceil(def.stone*(1+level*.55));
          const project=fort.project?.type===key;
          options.push({kind:project?'project':'site',key,region:i,x,y,dist,label:project?
            `Obra em andamento · ${Math.floor(fort.project.progress/fort.project.required*100)}% concluída`:
            `E · Depositar ${wood} madeira + ${stone} pedra · ${level?'melhorar':'construir'} ${def.name}`});
        }
      }
      for(const [role,worker] of Object.entries(WORKERS)){
        const x=x0+worker.x,y=WORKER_Y,dist=Math.hypot(p.x-x,p.y-y);
        if(dist<92&&!fort.workers?.some(hired=>hired.role===role))options.push({kind:'worker',key:role,region:i,x,y,dist,label:`E · Contratar ${worker.name} · ${worker.gold} ouro`});
      }
      if(i===region&&fort.integrity<fort.maxIntegrity){
        const x=x0,y=0,dist=Math.hypot(p.x-x,p.y-y);
        if(dist<92)options.push({kind:'repair',key:'fortress',region:i,x,y,dist,label:'E · Reparar fortaleza · 5 madeira + 5 pedra'});
      }
    }
    for(const node of this.resourceNodes){
      const dist=Math.hypot(p.x-node.x,p.y-node.y);
      if(dist<92)options.push({kind:'resource',key:node.id,x:node.x,y:node.y,dist,
        label:`E · ${node.kind==='wood'?'Cortar árvore · +'+node.value+' madeira':'Minerar veio · +'+node.value+' pedra'}`});
    }
    const gateX=baseX+450,gateY=0,gateDist=Math.hypot(p.x-gateX,p.y-gateY);
    if(gateDist<108)options.push({kind:'gate',key:'frontier',x:gateX,y:gateY,dist:gateDist,label:'E · Abrir passagem para a próxima região'});
    options.sort((a,b)=>a.dist-b.dist);this.nearbyInteraction=options[0]||null;
    this.interactionHint=this.nearbyInteraction?(this.interactionMessageTime>0?this.interactionMessage:this.nearbyInteraction.label):null;
  }
  interact(){
    const target=this.nearbyInteraction;if(!target)return false;
    if(target.kind==='project')return false;
    let result;
    if(target.kind==='site')result=startConstruction(target.region,target.key);
    else if(target.kind==='worker')result=hireWorker(target.region,target.key);
    else if(target.kind==='repair')result=repairFortress(target.region);
    else if(target.kind==='resource'){
      const index=this.resourceNodes.findIndex(node=>node.id===target.key),node=this.resourceNodes[index];
      if(!node)return false;
      this.campaign=gatherMaterials(node.kind==='wood'?node.value:0,node.kind==='stone'?node.value:0);
      this.resourceNodes.splice(index,1);
      this.interactionMessage=node.kind==='wood'?`+${node.value} madeira coletada.`:`+${node.value} pedra minerada.`;
      this.interactionMessageTime=2.2;this.addText(node.kind==='wood'?`+${node.value} MADEIRA`:`+${node.value} PEDRA`,node.x,node.y-25,node.kind==='wood'?'#a8e7a2':'#c8d6dd');
      return true;
    }
    else result=advanceRegion();
    this.interactionMessage=result.reason;this.interactionMessageTime=3;
    if(result.ok){
      this.campaign=result.state;
      if(target.kind==='site')this.addText('✦ MATERIAIS DEPOSITADOS ✦',target.x,target.y-42,'#f2d493');
      if(target.kind==='worker')this.addText('✦ TRABALHADOR CONTRATADO ✦',target.x,target.y-42,'#a8e7a2');
      if(target.kind==='repair')this.addText('✦ FORTALEZA REPARADA ✦',target.x,target.y-42,'#a8e7a2');
      if(target.kind==='gate'){
        this.player.x=result.state.region*1800+200;this.player.y=0;
        this.player.hp=this.player.maxHp;this.enemies=[];this.enemyShots=[];
        this.addText('✦ NOVA FRONTEIRA ✦',this.player.x,this.player.y-86,'#f5d28d');
      }
    }
    return result.ok;
  }
  render(){this.renderer.render(this);}
  frame(now){
    if(this.state!=='playing')return;
    const dt=Math.min(.05,Math.max(0,(now-this.lastTick)/1000));
    this.lastTick=now;this.frameDt=dt;
    if(!this.paused)this.step(dt);
    if(this.state==='playing'){
      this.render();this.raf=requestAnimationFrame(this.frame);
    }
  }
  destroy(){
    cancelAnimationFrame(this.raf);this.input.destroy();this.ui.heroPreview?.destroy();this.renderer.destroy();
    window.removeEventListener('resize',this.resize);
    document.removeEventListener('visibilitychange',this.visibility);
  }
}
