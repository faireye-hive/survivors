import { CLASSES } from '../data/classes.js';
import { WEAPONS } from '../data/weapons.js';
import { formatTime } from '../core/math.js';
import { getProfile } from '../storage/Profile.js';
import {createUpgradeIcon} from './UpgradeIcons.js';
import { hudStats, minimapMarkers, MINIMAP_RADIUS } from './HudData.js';

export class Interface {
  constructor(){
    this.el={};
    const ids=['menu','hud','level-screen','pause-screen','end-screen','best-label','best-kills',
      'hero-name','level-label','hp-fill','hp-label','armor-label','might-label',
      'xp-fill','xp-label','time-label','kills-label','bottom-hp','bottom-armor',
      'bottom-might','bottom-speed','weapon-list','upgrade-options','level-up-number',
      'end-kicker','end-title','end-description','end-time','end-kills','end-level',
      'sound-toggle','minimap','minimap-panel','hud-map-button','hud-info',
      'hud-info-title','hud-info-content','hud-info-close'];
    for(const id of ids)this.el[id]=document.getElementById(id);
    this.classId='guardian';this.game=null;this.lastHud=0;this.lastWeapons='';
    this.currentPanel=null;this.miniExpanded=false;
    this.miniCtx=this.el.minimap.getContext('2d');
    document.querySelectorAll('[data-class]').forEach(btn=>btn.addEventListener('click',()=>{
      this.classId=btn.dataset.class;
      document.querySelectorAll('[data-class]').forEach(el=>
        el.classList.toggle('active',el.dataset.class===this.classId));
    }));
  }
  connect(game){
    this.game=game;
    const action=(id,fn)=>document.getElementById(id).addEventListener('click',fn);
    action('start-button',()=>game.start(this.classId));
    action('pause-button',()=>game.togglePause());
    action('resume-button',()=>game.togglePause());
    action('pause-restart',()=>game.start(game.lastClass));
    action('pause-menu',()=>game.backToMenu());
    action('again-button',()=>game.start(game.lastClass));
    action('end-menu',()=>game.backToMenu());
    action('sound-toggle',()=>{
      const enabled=game.audio.toggle();
      this.el['sound-toggle'].textContent=enabled?'♫':'♪';
      this.el['sound-toggle'].setAttribute('aria-pressed',String(enabled));
    });
    this.el['sound-toggle'].textContent=game.audio.enabled?'♫':'♪';
    this.el['sound-toggle'].setAttribute('aria-pressed',String(game.audio.enabled));
    this.el['upgrade-options'].addEventListener('click',e=>{
      const button=e.target.closest('button[data-upgrade]');
      if(button)game.selectUpgrade(button.dataset.upgrade);
    });
    document.querySelectorAll('[data-hud-panel]').forEach(btn=>
      btn.addEventListener('click',()=>this.toggleInfo(btn.dataset.hudPanel)));
    action('hud-info-close',()=>this.closeInfo());
    action('hud-map-button',()=>{
      this.miniExpanded=!this.miniExpanded;
      this.el['minimap-panel'].classList.toggle('expanded',this.miniExpanded);
      this.el['hud-map-button'].setAttribute('aria-pressed',String(this.miniExpanded));
      this.el['hud-map-button'].title=this.miniExpanded?'Reduzir o minimapa':'Ampliar o minimapa';
      this.renderMinimap(game);
    });
    this.showMenu();
  }
  hideScreens(){
    for(const id of ['menu','level-screen','pause-screen','end-screen'])
      this.el[id].hidden=true;
  }
  showMenu(){
    this.hideScreens();this.el.hud.hidden=true;this.el.menu.hidden=false;
    this.closeInfo();
    const best=getProfile();
    this.el['best-label'].textContent=best.runs?formatTime(best.bestTime):'—';
    this.el['best-kills'].textContent=best.runs?
      best.bestKills+' inimigos derrotados • '+best.runs+' partidas':
      'Seu primeiro legado começa agora.';
  }
  showPlaying(){
    this.hideScreens();this.el.hud.hidden=false;
    if(this.game)this.update(this.game,true);
  }
  showPause(paused){
    this.el['pause-screen'].hidden=!paused;
    if(!paused)this.showPlaying();
  }
  showLevel(level,choices){
    this.game.currentChoices=choices;
    this.el['level-up-number'].textContent=level;
    const box=this.el['upgrade-options'];box.replaceChildren();
    for(const choice of choices){
      const button=document.createElement('button');
      button.className='upgrade-option';button.dataset.upgrade=choice.id;
      button.dataset.family=choice.family;
      button.style.setProperty('--upgrade-accent',choice.accent);
      button.setAttribute('aria-label',
        choice.name+'. '+choice.effect+'. '+choice.description+'. '+choice.tier);
      const category=document.createElement('span');
      category.className='upgrade-kind';
      category.textContent=choice.family==='weapon'?'ARMA':'ATRIBUTO';
      const icon=document.createElement('span');
      icon.className='upgrade-icon';
      icon.appendChild(createUpgradeIcon(choice.id));
      const title=document.createElement('strong');title.textContent=choice.name;
      const effect=document.createElement('span');
      effect.className='upgrade-effect';effect.textContent=choice.effect;
      const desc=document.createElement('small');desc.textContent=choice.description;
      const tier=document.createElement('span');tier.className='upgrade-tier';
      tier.textContent=choice.tier;
      button.append(category,icon,title,effect,desc,tier);box.appendChild(button);
    }
    this.el['level-screen'].hidden=false;this.el['pause-screen'].hidden=true;
    this.update(this.game,true);
  }
  showEnd(game,won){
    this.hideScreens();this.el.hud.hidden=true;this.closeInfo();
    this.el['end-screen'].hidden=false;
    this.el['end-kicker'].textContent=won?
      '✦ O ÉTER RECONHECE SUA VITÓRIA ✦':'✧ A NÉVOA REIVINDICOU UM HERÓI ✧';
    this.el['end-title'].textContent=won?'Lenda imortal':'A jornada terminou';
    this.el['end-description'].textContent=won?
      'Você resistiu a todas as ondas. O mundo ainda guarda novos segredos.':
      'Cada tentativa fortalece sua história. Volte mais preparado.';
    this.el['end-time'].textContent=formatTime(game.elapsed);
    this.el['end-kills'].textContent=game.kills;
    this.el['end-level'].textContent=game.player.level;
  }
  toggleInfo(type){
    if(this.currentPanel===type){this.closeInfo();return;}
    this.currentPanel=type;this.el['hud-info'].hidden=false;
    document.querySelectorAll('[data-hud-panel]').forEach(btn=>
      btn.setAttribute('aria-expanded',String(btn.dataset.hudPanel===type)));
    this.renderInfo();
  }
  closeInfo(){
    this.currentPanel=null;this.el['hud-info'].hidden=true;
    document.querySelectorAll('[data-hud-panel]').forEach(btn=>
      btn.setAttribute('aria-expanded','false'));
  }
  renderInfo(){
    if(!this.currentPanel||!this.game)return;
    const type=this.currentPanel,game=this.game;
    const box=this.el['hud-info-content'];box.replaceChildren();
    const add=(tag,text,cls='')=>{
      const el=document.createElement(tag);el.textContent=text;
      if(cls)el.className=cls;
      box.appendChild(el);return el;
    };
    if(type==='skills'){
      this.el['hud-info-title'].textContent='Habilidades automáticas';
      for(const w of game.weapons){
        const def=WEAPONS[w.id],card=document.createElement('div');
        card.className='popover-entry';
        const name=document.createElement('strong');
        name.textContent=def.glyph+' '+def.name+' · Nv. '+w.level;
        const desc=document.createElement('small');
        desc.textContent=def.description+' Ativa automaticamente.';
        card.append(name,desc);box.append(card);
      }
    }else if(type==='records'){
      this.el['hud-info-title'].textContent='Jornada & recordes';
      const best=getProfile();
      add('p','Nesta partida: '+formatTime(game.elapsed)+' · '+game.kills+
        ' inimigos derrotados · nível '+game.player.level);
      add('p','Melhor tempo: '+(best.runs?formatTime(best.bestTime):'—'));
      add('p','Maior número de derrotas: '+(best.bestKills||0));
      add('p','Partidas concluídas: '+(best.runs||0));
      add('p','Relíquias desta partida: '+(game.relics||0));
    }else if(type==='help'){
      this.el['hud-info-title'].textContent='Como jogar';
      add('p','WASD ou teclas de seta: movimentar.');
      add('p','As habilidades atacam automaticamente quando estão prontas. Não há botão de ataque.');
      add('p','Pegue os cristais de experiência. Ao subir de nível, escolha uma melhoria.');
      add('p','A partir de 01:00 surgem Esporões que criam áreas tóxicas no chão: saia dos círculos antes de eles ativarem.');
      add('p','Aranhas avançam em zigue-zague. Derrote inimigos de elite dourados para coletar relíquias que aumentam seu dano.');
      add('p','Esc ou P: pausar. O minimapa exibe inimigos próximos e a sua posição.');
    }
  }
  renderMinimap(game){
    const ctx=this.miniCtx;if(!ctx)return;
    const canvas=this.el.minimap,w=canvas.width,h=canvas.height;
    const r=MINIMAP_RADIUS,p=game.player;
    ctx.clearRect(0,0,w,h);
    const step=14;
    const tones={sanctuary:'#225548',meadow:'#1e4b3b',grove:'#173b33',
      blight:'#34384c',ruins:'#44473d'};
    // A tiny overview sampled from the same deterministic world as gameplay.
    for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
      const worldX=p.x+(x/w-.5)*2*r;
      const worldY=p.y+(y/h-.5)*2*r;
      const tileX=Math.floor(worldX/96),tileY=Math.floor(worldY/96);
      const kind=game.world.biomeAt(tileX,tileY);
      ctx.fillStyle=tones[kind]||'#1a453b';
      ctx.fillRect(x,y,step+1,step+1);
    }
    ctx.strokeStyle='#b6c98d38';ctx.lineWidth=.75;
    for(let x=0;x<=w;x+=w/4){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<=h;y+=h/4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const markers=minimapMarkers(game,r);
    const toScreen=(m)=>({x:w*(.5+m.x*.5),y:h*(.5+m.y*.5)});
    if(markers.sanctuary){
      const q=toScreen(markers.sanctuary);
      ctx.strokeStyle='#d3b780';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(q.x,q.y,6,0,Math.PI*2);ctx.stroke();
    }
    for(const m of markers.drops){
      const q=toScreen(m);
      ctx.fillStyle=m.relic?'#ffe09a':m.heal?'#9bf0b0':'#d2d697';
      const size=m.relic?4.1:2.4;
      ctx.fillRect(q.x-size/2,q.y-size/2,size,size);
    }
    for(const m of markers.enemies){
      const q=toScreen(m);
      ctx.fillStyle=m.boss?'#ffe0a2':'#ef777a';
      ctx.beginPath();ctx.arc(q.x,q.y,m.boss?4.1:2,0,Math.PI*2);ctx.fill();
      if(m.boss){ctx.strokeStyle='#ffcc87';ctx.stroke();}
    }
    ctx.save();ctx.translate(w/2,h/2);
    ctx.fillStyle='#ffe1a0';ctx.strokeStyle='#2a2922';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(6,6);ctx.lineTo(0,3);
    ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
  }
  update(game,force=false){
    const now=performance.now();
    if(!force&&now-this.lastHud<110)return;
    this.lastHud=now;
    const s=hudStats(game);
    this.el['hero-name'].textContent=s.name;
    this.el['level-label'].textContent='Nv. '+s.level;
    this.el['hp-fill'].style.width=s.hpPct+'%';
    this.el['hp-label'].textContent=s.hp+' / '+s.maxHp;
    this.el['armor-label'].textContent=s.armor;
    this.el['might-label'].textContent=s.mightPct+'%';
    this.el['bottom-hp'].textContent=s.hp;
    this.el['bottom-armor'].textContent=s.armor;
    this.el['bottom-might'].textContent=s.mightPct+'%';
    this.el['bottom-speed'].textContent=s.speed;
    this.el['hp-fill'].parentElement.setAttribute('aria-valuenow',String(s.hp));
    this.el['hp-fill'].parentElement.setAttribute('aria-valuemax',String(s.maxHp));
    this.el['xp-fill'].style.width=s.xpPct+'%';
    this.el['xp-label'].textContent=s.xp+' / '+s.nextXp;
    this.el['xp-fill'].parentElement.setAttribute('aria-valuenow',String(s.xp));
    this.el['xp-fill'].parentElement.setAttribute('aria-valuemax',String(s.nextXp));
    this.el['time-label'].textContent=formatTime(s.elapsed);
    this.el['kills-label'].textContent=game.enemies.filter(e=>e.hp>0).length;
    const signature=s.weapons.map(w=>w.id+':'+w.level).join('|');
    if(this.lastWeapons!==signature){
      this.lastWeapons=signature;
      const box=this.el['weapon-list'];box.replaceChildren();
      for(const w of s.weapons){
        const chip=document.createElement('div');chip.className='weapon-chip';
        chip.dataset.weapon=w.id;
        const icon=document.createElement('strong');
        icon.className='weapon-icon';icon.textContent=w.glyph;
        const number=document.createElement('small');number.textContent=w.level;
        chip.append(icon,number);box.appendChild(chip);
      }
      if(this.currentPanel==='skills')this.renderInfo();
    }
    this.el['weapon-list'].querySelectorAll('.weapon-chip').forEach((chip,index)=>{
      const w=s.weapons[index];
      chip.style.setProperty('--cooldown',w.rechargePct.toFixed(2)+'%');
      chip.title=w.name+' · nível '+w.level+' · ativação automática';
      chip.setAttribute('aria-label',chip.title);
    });
    this.renderMinimap(game);
    if(this.currentPanel==='records'&&force)this.renderInfo();
  }
}
