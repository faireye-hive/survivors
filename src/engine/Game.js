import { CLASSES } from '../data/classes.js';
import { Input } from '../core/Input.js';
import { World } from '../world/World.js';
import { Renderer } from '../render/Renderer.js';
import { AudioEngine } from '../audio/Audio.js';
import { spawnEnemy, updateEnemies } from '../systems/Enemies.js';
import { updateCombat } from '../systems/Combat.js';
import { updateProgression, applyChoice, xpForLevel } from '../systems/Progression.js';
import { getProfile,recordRun } from '../storage/Profile.js';
import {permanentBonuses} from '../data/metaUpgrades.js';

export class Game {
  static DURATION=8*60;
  constructor(canvas,ui){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    if(!this.ctx)throw Error('Canvas 2D não disponível');
    this.ui=ui;this.renderer=new Renderer();this.audio=new AudioEngine();
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
    const bonuses=permanentBonuses(getProfile());
    const hp=hero.hp+bonuses.maxHp;
    this.player={x:0,y:0,vx:0,vy:0,radius:16,hp,maxHp:hp,
      speed:hero.speed*bonuses.speed,armor:hero.armor+bonuses.armor,
      might:hero.might*bonuses.might,magnet:74+bonuses.magnet,
      experienceGain:bonuses.experience,
      xp:0,nextXp:xpForLevel(1),level:1,classId:hero.id,facing:0,inv:0,attackPose:0};
    this.frameDt=0;this.elapsed=0;this.kills=0;this.spawnTimer=.7;this.lastPickupSound=-10;
    this.bossFlags={first:false,second:false};
    this.enemies=[];this.drops=[];this.projectiles=[];this.effects=[];this.particles=[];this.floatTexts=[];
    this.hazards=[];this.encountersSeen=new Set();this.eventBanner=null;this.relics=0;
    this.goldEarned=0;
    this.upgrades={};this.weapons=[{id:hero.weapon,level:1,cooldown:.2}];
    this.currentChoices=null;this.paused=false;this.pauseReason=null;this.input.reset();
  }
  resizeCanvas(){
    const rect=this.canvas.getBoundingClientRect();
    this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*this.dpr);
    this.canvas.height=Math.round(this.height*this.dpr);
  }
  start(classId=this.lastClass){
    cancelAnimationFrame(this.raf);this.reset(classId);
    // Inimigos próximos garantem que os primeiros segundos já sejam jogáveis.
    for(let i=0;i<6;i++){
      spawnEnemy(this,i%3===0?'bat':'slime');
      const e=this.enemies[this.enemies.length-1],angle=i*Math.PI/3;
      e.x=Math.cos(angle)*(280+i*15);e.y=Math.sin(angle)*(280+i*15);
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
    const profile=recordRun(this.elapsed,this.kills,{level:this.player.level,won});
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
    if(this.elapsed>=Game.DURATION){this.finish(true);return;}
    const v=this.input.vector(),p=this.player;
    p.vx=v.x*p.speed;p.vy=v.y*p.speed;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.vx||p.vy)p.facing=Math.atan2(p.vy,p.vx);
    p.inv=Math.max(0,p.inv-dt);
    p.attackPose=Math.max(0,(p.attackPose||0)-dt);
    updateEnemies(this,dt);
    if(this.state!=='playing')return;
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
    cancelAnimationFrame(this.raf);this.input.destroy();this.renderer.destroy();
    window.removeEventListener('resize',this.resize);
    document.removeEventListener('visibilitychange',this.visibility);
  }
}
