import * as T from 'three';
import {humanoid,creature,animateActor,part,group,geometry,material,disposeModelResources} from './Models.js';
import {Terrain,UNIT,createFortress,createGate,disposeEnvironment} from './Environment.js';
import {REGIONS,SITE_POSITIONS} from '../../storage/Campaign.js';
import {threatAt} from '../../data/difficulty.js';

const point=new T.Vector3();
export class Renderer3D{
  constructor(canvas){
    this.canvas=canvas;
    this.gpu=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.gpu.setClearColor('#263f3c');this.gpu.outputColorSpace=T.SRGBColorSpace;
    this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.22;
    this.gpu.shadowMap.enabled=true;this.gpu.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.scene.background=new T.Color('#263f3c');this.scene.fog=new T.Fog('#263f3c',22,46);
    this.camera=new T.PerspectiveCamera(43,1,.1,110);
    this.scene.add(new T.HemisphereLight('#d8e8dd','#34473d',2.2));
    this.sun=new T.DirectionalLight('#fff0c7',3.2);this.sun.position.set(-9,18,9);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:65});
    this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.0003;this.scene.add(this.sun,this.sun.target);
    const rim=new T.DirectionalLight('#8cceee',1.1);rim.position.set(8,7,-9);this.scene.add(rim);
    this.terrain=new Terrain(this.scene);this.collections=new Map();this.forts=new Map();this.textures=new Map();
    this.hero=null;this.heroClass=null;this.zoom=.84;
    this.onWheel=e=>{if(this.canvas.style.pointerEvents==='none')return;e.preventDefault();this.zoom=T.MathUtils.clamp(this.zoom+e.deltaY*.0005,.72,1.4);};
    canvas.addEventListener('wheel',this.onWheel,{passive:false});
    this.overlay=document.createElement('canvas');this.overlay.className='world-overlay';this.overlay.setAttribute('aria-hidden','true');canvas.after(this.overlay);
    this.overlayCtx=this.overlay.getContext('2d');
    this.banner=document.createElement('div');this.banner.className='world-event-banner';this.banner.hidden=true;
    this.bannerTitle=document.createElement('strong');this.bannerText=document.createElement('span');this.banner.append(this.bannerTitle,this.bannerText);canvas.parentElement.append(this.banner);
    this.particleGeometry=new T.BufferGeometry();this.particlePositions=new Float32Array(240*3);this.particleColors=new Float32Array(240*3);
    this.particleGeometry.setAttribute('position',new T.BufferAttribute(this.particlePositions,3));this.particleGeometry.setAttribute('color',new T.BufferAttribute(this.particleColors,3));
    this.particleMaterial=new T.PointsMaterial({size:.085,vertexColors:true,transparent:true,opacity:.85});
    this.particles=new T.Points(this.particleGeometry,this.particleMaterial);this.particles.frustumCulled=false;this.scene.add(this.particles);
  }
  resize(width,height,dpr){
    this.width=width;this.height=height;this.dpr=dpr;this.gpu.setPixelRatio(dpr);this.gpu.setSize(width,height,false);
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
    this.overlay.width=Math.round(width*dpr);this.overlay.height=Math.round(height*dpr);
  }
  label(text,width=2.5,height=.3,color='#f5ead0'){
    const key=text+color;
    if(!this.textures.has(key)){
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=112;
      const c=canvas.getContext('2d');c.fillStyle='#10252be0';c.beginPath();c.roundRect(3,3,1018,106,18);c.fill();
      c.textAlign='center';c.textBaseline='middle';c.font='600 68px system-ui';c.fillStyle=color;c.fillText(text,512,56,970);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;this.textures.set(key,texture);
    }
    const sprite=new T.Sprite(new T.SpriteMaterial({map:this.textures.get(key),transparent:true,depthWrite:false}));
    sprite.scale.set(width,height*1.7,1);sprite.userData.ownMaterial=true;return sprite;
  }
  release(root){
    this.scene.remove(root);disposeEnvironment(root);
    root.traverse(o=>{if(o.userData.ownMaterial)o.material.dispose();});
  }
  sync(name,items,make,update){
    if(!this.collections.has(name))this.collections.set(name,new Map());
    const collection=this.collections.get(name),live=new Set();
    for(const item of items){
      if(item.life<=0||item.hp<=0)continue;
      live.add(item);let root=collection.get(item);
      if(!root){root=make(item);collection.set(item,root);this.scene.add(root);}
      update(root,item);
    }
    for(const [item,root] of collection)if(!live.has(item)){this.release(root);collection.delete(item);}
  }
  healthBar(root,color='#e98483'){
    const hp=group(root,[0,2.4,0]);
    part(hp,'plane','#172c32',[0,0,0],[1,.09,1]);
    const fill=part(hp,'plane',color,[0,0,.005],[.96,.055,1],true);
    hp.userData.fill=fill;root.userData.health=hp;
  }
  effect(color,radius=1,filled=false){
    const root=group();
    const mat=new T.MeshBasicMaterial({color,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false});
    const mesh=new T.Mesh(filled?new T.CircleGeometry(radius,48):new T.RingGeometry(Math.max(.01,radius-.045),radius,64),mat);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=.035;mesh.userData.ownGeometry=true;mesh.userData.ownMaterial=true;root.add(mesh);root.userData.surface=mesh;return root;
  }
  render(game){
    const p=game.player,t=game.elapsed,px=p.x/UNIT,pz=p.y/UNIT;
    this.camera.position.set(px,19*this.zoom,pz+18*this.zoom);this.camera.lookAt(px,.2,pz);
    this.camera.updateMatrixWorld();
    this.sun.position.set(px-10,20,pz+8);this.sun.target.position.set(px,0,pz);this.sun.target.updateMatrixWorld();
    this.terrain.update(game);
    if(this.heroClass!==p.classId){if(this.hero)this.release(this.hero);this.hero=humanoid(p.classId);this.scene.add(this.hero);this.heroClass=p.classId;}
    this.hero.position.set(px,0,pz);animateActor(this.hero,p,t);
    const aura=game.weapons.find(w=>w.id==='aura');
    if(aura&&!this.aura){this.aura=this.effect('#88d5b4',1);this.scene.add(this.aura);}
    if(this.aura){this.aura.visible=!!aura;if(aura){this.aura.position.set(px,0,pz);this.aura.scale.setScalar((92+aura.level*11)/UNIT);this.aura.userData.surface.material.opacity=.35;}}
    const nearby=a=>Math.abs(a.x-p.x)<1400&&Math.abs(a.y-p.y)<1400;
    this.sync('enemies',game.enemies.filter(nearby),e=>{
      const root=creature(e.type);root.userData.baseScale=root.scale.x;
      root.scale.multiplyScalar(e.miniBoss?1.85:e.boss?1.23:e.elite?1.2:1);
      this.healthBar(root,e.boss||e.elite?'#f4ce83':e.miniBoss?'#7adad5':'#e98483');
      if(e.elite){const ring=part(root,'ring','#efd28a',[0,.04,0],[.72,.72,.72],true);ring.rotation.x=-Math.PI/2;}
      return root;
    },(root,e)=>{
      root.position.set(e.x/UNIT,0,e.y/UNIT);animateActor(root,e,t);
      const hp=root.userData.health;hp.visible=e.hp<e.maxHp||e.boss||e.miniBoss;
      hp.quaternion.copy(this.camera.quaternion);const fraction=Math.max(0,e.hp/e.maxHp);
      hp.userData.fill.scale.x=.96*fraction;hp.userData.fill.position.x=-(1-fraction)*.48;
      if(e.rushWarmup>0||e.novaWarmup>0){
        if(!root.userData.telegraph){const ring=part(root,'ring','#f6b66e',[0,.05,0],[.9,.9,.9],true);ring.rotation.x=-Math.PI/2;root.userData.telegraph=ring;}
        root.userData.telegraph.visible=true;root.userData.telegraph.rotation.z=t*3;
        root.userData.telegraph.material=material(e.novaWarmup>0?'#e5a1ed':'#f6b66e',true);
      }else if(root.userData.telegraph)root.userData.telegraph.visible=false;
    });
    for(let i=0;i<game.campaign.fortresses.length;i++){
      const fort=game.campaign.fortresses[i],signature=JSON.stringify([fort.buildings,fort.workers,Math.round(fort.integrity)]);
      let entry=this.forts.get(i);
      if(!entry||entry.signature!==signature){
        if(entry)this.release(entry.root);
        const root=createFortress(i,fort,this.label.bind(this));this.scene.add(root);entry={root,signature};this.forts.set(i,entry);
      }
      entry.root.visible=Math.abs(px-i*36)<25;
      const progress=entry.root.userData.project;
      progress.root.visible=!!fort.project;
      if(fort.project){const pos=SITE_POSITIONS[fort.project.type];progress.root.position.set(pos.x/UNIT,2.5,pos.y/UNIT);progress.root.quaternion.copy(this.camera.quaternion);progress.fill.scale.x=1.7*Math.min(1,fort.project.progress/fort.project.required);}
    }
    for(const [i,entry] of this.forts)if(i>=game.campaign.fortresses.length){this.release(entry.root);this.forts.delete(i);}
    const region=game.campaign.region;
    if(this.gateRegion!==region){
      if(this.gate)this.release(this.gate);this.gate=null;this.gateRegion=region;
      if(REGIONS[region+1]){this.gate=createGate(this.label.bind(this),REGIONS[region+1]);this.gate.position.set(region*36+9,0,0);this.scene.add(this.gate);}
    }
    if(this.gate){this.gate.userData.ring.rotation.z=Math.sin(t)*.04;this.gate.userData.portal.scale.x=.61+Math.sin(t*3)*.025;}
    this.sync('resources',game.resourceNodes.filter(nearby),node=>{
      const root=group();
      if(node.kind==='wood'){
        part(root,'cylinder','#79543a',[0,.6,0],[.13,1.2,.13]);part(root,'cone','#50915e',[0,1.65,0],[.72,1.7,.72]);
      }else for(let i=0;i<4;i++)part(root,'crystal','#9eafb1',[(i%2)*.35-.15,.27+(i%2)*.1,Math.floor(i/2)*.3-.1],[.3,.5,.3]);
      return root;
    },(root,node)=>root.position.set(node.x/UNIT,0,node.y/UNIT));
    this.sync('drops',game.drops.filter(nearby),drop=>{
      const root=group();let kind='crystal',color='#65e0d3',s=.13;
      if(drop.kind==='heal'){kind='sphere';color='#f27d92';s=.18;}
      if(drop.kind==='wood'){kind='cylinder';color='#b38352';s=.16;}
      if(drop.kind==='stone'){kind='sphere';color='#b5c9c1';s=.17;}
      if(drop.kind==='relic'){kind='crystal';color='#f6d183';s=.24;}
      const mesh=part(root,kind,color,[0,.25,0],[s,s*1.5,s],true);root.userData.item=mesh;return root;
    },(root,drop)=>{root.position.set(drop.x/UNIT,.08+Math.sin(t*4+drop.x)*.05,drop.y/UNIT);root.userData.item.rotation.y=t;});
    this.sync('projectiles',[...game.projectiles,...game.enemyShots],shot=>{
      const root=group(),enemy=game.enemyShots.includes(shot);
      part(root,shot.kind==='dagger'?'crystal':'sphere',enemy?'#e08bdc':shot.kind==='dagger'?'#e7efb5':'#85dbf5',[0,0,0],shot.kind==='dagger'?[.08,.08,.3]:[.14,.14,.14],true);return root;
    },(root,shot)=>{root.position.set(shot.x/UNIT,.65,shot.y/UNIT);root.rotation.y=Math.atan2(shot.vx,shot.vy);});
    this.sync('hazards',game.hazards||[],hazard=>this.effect('#c7cf73',hazard.radius/UNIT,true),(root,hazard)=>{
      root.position.set(hazard.x/UNIT,0,hazard.y/UNIT);root.userData.surface.material.opacity=hazard.warmup>0?.17+Math.sin(t*12)*.08:.4;
      root.userData.surface.material.color.set(hazard.warmup>0?'#efcb83':'#9fd467');
    });
    this.sync('effects',game.effects,fx=>{
      if(fx.kind==='slash'){
        const root=group(),mesh=new T.Mesh(new T.RingGeometry(Math.max(.01,fx.radius/UNIT-.1),fx.radius/UNIT,30,1,-1,2),new T.MeshBasicMaterial({color:'#ffe1a0',side:T.DoubleSide,transparent:true,depthWrite:false}));
        mesh.rotation.x=-Math.PI/2;mesh.rotation.z=-fx.angle;mesh.position.y=.65;mesh.userData.ownMaterial=true;mesh.userData.ownGeometry=true;root.add(mesh);root.userData.surface=mesh;return root;
      }return this.effect(fx.kind==='aura'?'#97eed7':'#f7d493',fx.radius/UNIT);
    },(root,fx)=>{root.position.set(fx.x/UNIT,0,fx.y/UNIT);root.userData.surface.material.opacity=fx.life/fx.duration;});
    let count=0;const color=new T.Color();
    for(const particle of game.particles.slice(0,240)){
      this.particlePositions.set([particle.x/UNIT,.3+particle.life*.7,particle.y/UNIT],count*3);color.set(particle.color);this.particleColors.set([color.r,color.g,color.b],count*3);count++;
    }
    this.particleGeometry.setDrawRange(0,count);this.particleGeometry.attributes.position.needsUpdate=true;this.particleGeometry.attributes.color.needsUpdate=true;
    this.gpu.render(this.scene,this.camera);this.renderOverlay(game);
  }
  renderOverlay(game){
    const c=this.overlayCtx;if(!c)return;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
    c.textAlign='center';c.font='700 14px system-ui';c.lineWidth=3;c.strokeStyle='#102528';
    for(const ft of game.floatTexts){
      point.set(ft.x/UNIT,1.3,ft.y/UNIT).project(this.camera);if(point.z>1||point.z<-1)continue;
      const x=(point.x*.5+.5)*this.width,y=(-point.y*.5+.5)*this.height;
      c.globalAlpha=Math.max(0,ft.life/ft.duration);c.fillStyle=ft.color;c.strokeText(ft.text,x,y);c.fillText(ft.text,x,y);
    }
    c.globalAlpha=1;
    const banner=game.eventBanner;this.banner.hidden=game.state!=='playing'||!(banner?.remaining>0);
    if(!this.banner.hidden){this.bannerTitle.textContent=banner.title;this.bannerText.textContent=banner.subtitle;}
    const threat=threatAt(game.elapsed),label=document.getElementById('threat-label');
    if(label){label.dataset.stage=threat.stage;label.textContent=`AMEAÇA ${['I','II','III','IV'][threat.stage-1]} · ${threat.label.toUpperCase()}`;}
  }
  destroy(){
    this.canvas.removeEventListener('wheel',this.onWheel);this.overlay.remove();this.banner.remove();
    for(const collection of this.collections.values())for(const root of collection.values())this.release(root);
    for(const fort of this.forts.values())this.release(fort.root);
    if(this.hero)this.release(this.hero);if(this.gate)this.release(this.gate);if(this.aura)this.release(this.aura);
    this.terrain.destroy();this.sun.shadow.dispose();
    for(const texture of this.textures.values())texture.dispose();this.particleGeometry.dispose();this.particleMaterial.dispose();disposeModelResources();this.gpu.dispose();
  }
}
