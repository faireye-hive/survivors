import { drawPlayer, drawEnemy, drawDrop, drawProjectile, drawEffect,drawHazard,drawEnemyShot } from './Art.js';
import {SITE_DEFS,SITE_POSITIONS,WORKERS,WORKER_Y,REGIONS} from '../storage/Campaign.js';

function polygon(c,points,fill,stroke){
  c.beginPath();c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
  c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
}
function drawWallSegment(c,a,b,level=0){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
  const thickness=level>=2?22:level===1?18:13,high=level>=2?31:level===1?19:10;
  const fill=level>=2?'#68746b':level===1?'#765735':'#5b4128';
  const cap=level>=2?'#aab3a3':level===1?'#bd955c':'#ae7d45';
  const point=(t,offset=0,lift=0)=>[a[0]+dx*t+nx*offset,a[1]+dy*t+ny*offset-lift];
  // Raise the wall face above its footprint so it reads as a barrier, not a ground stripe.
  polygon(c,[point(0,3),point(1,3),point(1,thickness+5,0),point(0,thickness+5,0)],'#19251dbb');
  polygon(c,[point(0,0),point(1,0),point(1,thickness,-high),point(0,thickness,-high)],fill,'#392f20');
  c.strokeStyle=cap;c.lineWidth=level>=2?8:7;c.beginPath();c.moveTo(...point(0,-high));c.lineTo(...point(1,-high));c.stroke();
  const step=level>=2?27:21;
  for(let d=0;d<=length;d+=step){
    const t=d/length,q=point(t,thickness*.65,-high-2),r=point(t,thickness*.65,0);
    c.strokeStyle=level>=2?'#c4c9b5':'#d0a56a';c.lineWidth=level>=2?6:5;
    c.beginPath();c.moveTo(...q);c.lineTo(...r);c.stroke();
    if(level<2){
      c.fillStyle='#e1bb7d';c.beginPath();c.arc(q[0],q[1],2.3,0,Math.PI*2);c.fill();
    }
  }
}
function drawCornerTower(c,x,y,stone=false){
  c.fillStyle='#07120fc2';c.beginPath();c.ellipse(x+3,y+14,27,12,0,0,Math.PI*2);c.fill();
  c.fillStyle=stone?'#778078':'#71563a';c.fillRect(x-19,y-16,38,32);
  c.fillStyle=stone?'#b6b9a8':'#b68c54';c.fillRect(x-23,y-22,46,9);
  c.fillStyle='#d4b477';c.beginPath();c.moveTo(x-24,y-21);c.lineTo(x,y-43);c.lineTo(x+24,y-21);c.closePath();c.fill();
  c.fillStyle='#26332b';for(let i=-1;i<=1;i++)c.fillRect(x+i*11-2,y-10,4,9);
}
function drawSettlement(c,x,y,fort,label){
  c.save();c.translate(x,y);
  const boundary=[[-245,-170],[245,-170],[280,170],[-280,170]];
  const clearing=[[-229,-151],[229,-151],[260,151],[-260,151]];
  polygon(c,[[...boundary[0]],[...boundary[1]],[...boundary[2]],[...boundary[3]]],'#0a1510a6');
  polygon(c,clearing,'#34553b','#8b815d');
  polygon(c,[[-205,-130],[211,-130],[237,133],[-236,133]],'#456747');
  // Packed earth courtyard and a clear road through the gate to the frontier.
  c.lineCap='round';c.strokeStyle='#27392d';c.lineWidth=34;c.beginPath();c.moveTo(-6,72);c.lineTo(28,39);c.lineTo(93,26);c.lineTo(185,10);c.lineTo(290,0);c.stroke();
  c.strokeStyle='#ad966b';c.lineWidth=25;c.beginPath();c.moveTo(-6,72);c.lineTo(28,39);c.lineTo(93,26);c.lineTo(185,10);c.lineTo(290,0);c.stroke();
  c.fillStyle='#cab386';for(let i=0;i<12;i++){const px=25+i*21,py=40-i*3;c.beginPath();c.ellipse(px,py,4,2,-.12,0,Math.PI*2);c.fill();}
  // Palisade encloses the whole yard, with a real opening facing the portal.
  const wallLevel=fort.buildings?.wall||0;
  drawWallSegment(c,boundary[0],boundary[1],wallLevel);
  drawWallSegment(c,boundary[1],[280,-38],wallLevel);
  drawWallSegment(c,[280,38],boundary[2],wallLevel);
  drawWallSegment(c,boundary[2],boundary[3],wallLevel);
  drawWallSegment(c,boundary[3],boundary[0],wallLevel);
  // A gatehouse makes the entrance unmistakable even before upgrades.
  drawCornerTower(c,267,-42,wallLevel>=2);drawCornerTower(c,274,43,wallLevel>=2);
  c.fillStyle='#503b27';c.fillRect(264,-25,19,48);c.fillStyle='#c69b5c';
  for(let y0=-20;y0<=16;y0+=10)c.fillRect(264,y0,19,4);
  // Central hall is deliberately large so the settlement reads as a base.
  c.fillStyle='#111c15a8';c.beginPath();c.ellipse(-19,-15,75,42,0,0,Math.PI*2);c.fill();
  polygon(c,[[-78,-38],[-32,-64],[33,-54],[52,-27],[44,29],[-46,32],[-75,8]],'#6d786a','#313f34');
  c.fillStyle='#9a8058';c.fillRect(-67,-43,104,18);
  polygon(c,[[-82,-43],[-20,-80],[50,-52],[35,-34],[-52,-27]],'#b3834f','#634b31');
  c.fillStyle='#382e23';c.fillRect(-27,-19,19,43);c.fillStyle='#f0d18d';
  c.fillRect(-57,-31,11,14);c.fillRect(13,-31,11,14);c.fillRect(-55,4,9,12);c.fillRect(17,4,9,12);
  c.fillStyle='#d4be88';c.fillRect(-31,24,26,5);
  // Yard lanterns and supply piles make the open courtyard feel inhabited.
  for(const [lx,ly] of [[-183,-95],[178,-91],[-190,84],[193,95]]){
    c.fillStyle='#684d32';c.fillRect(lx-2,ly-5,4,22);c.fillStyle='#f2cf7d';c.beginPath();c.arc(lx,ly-8,5,0,Math.PI*2);c.fill();
  }
  c.fillStyle='#f5e5be';c.font='800 12px system-ui';c.textAlign='center';
  c.fillText(label,0,224);c.fillStyle='#d6c58f';c.font='700 9px system-ui';
  c.fillText(wallLevel?`MURALHAS · NÍVEL ${wallLevel}`:'POVOADO · PALIÇADA DE MADEIRA',0,237);
  c.restore();
}
function drawWorkSite(c,x,y,key,level,project){
  const def=SITE_DEFS[key],building=level>0,working=project?.type===key;
  c.save();c.translate(x,y);
  const scale=1+Math.min(level,3)*.045;
  c.scale(scale,scale);
  c.fillStyle='#07120fa8';c.beginPath();c.ellipse(0,14,48,20,0,0,Math.PI*2);c.fill();
  c.fillStyle='#69563a';c.beginPath();c.ellipse(0,8,43,16,0,0,Math.PI*2);c.fill();
  c.fillStyle='#98825a';c.beginPath();c.ellipse(0,5,37,12,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#d4bc7e';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.ellipse(0,5,34,10,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
  const timber=building?'#76543a':'#59432e',timberLight=building?'#b38a56':'#9a7647';
  const stone=building?'#77857a':'#626e62';
  c.fillStyle='#171d17';c.beginPath();c.ellipse(0,11,28,11,0,0,Math.PI*2);c.fill();
  if(key==='tower'){
    c.fillStyle=stone;c.beginPath();c.moveTo(-20,9);c.lineTo(-15,-22);c.lineTo(-11,-30);c.lineTo(11,-30);c.lineTo(16,-22);c.lineTo(20,9);c.closePath();c.fill();c.strokeStyle='#c2c5aa';c.lineWidth=2;c.stroke();
    c.fillStyle='#a8ad96';c.fillRect(-17,-25,34,7);c.fillStyle='#4a5549';c.fillRect(-12,-18,24,5);
    for(let i=-1;i<=1;i++){c.fillStyle='#4b554a';c.fillRect(i*9-2,-10,4,12);}
    c.fillStyle='#d1b77e';c.fillRect(-21,-32,42,7);for(let i=-1;i<=1;i++)c.fillRect(i*14-3,-38,6,8);
    c.strokeStyle='#513f2a';c.lineWidth=2;c.beginPath();c.moveTo(0,-39);c.lineTo(0,-59);c.stroke();
    c.fillStyle='#c46e53';c.beginPath();c.moveTo(1,-58);c.lineTo(17,-53);c.lineTo(1,-48);c.closePath();c.fill();
  }else if(key==='lumber'){
    c.fillStyle='#362c20';c.fillRect(-22,-19,44,28);
    c.fillStyle=timber;c.fillRect(-19,-19,38,27);c.fillStyle=timberLight;c.fillRect(-17,-16,4,22);c.fillRect(13,-16,4,22);
    c.fillStyle='#30291f';c.beginPath();c.moveTo(-26,-18);c.lineTo(0,-39);c.lineTo(26,-18);c.lineTo(19,-15);c.lineTo(0,-31);c.lineTo(-19,-15);c.closePath();c.fill();
    c.fillStyle=building?'#a77d4e':'#886744';c.beginPath();c.moveTo(-23,-20);c.lineTo(0,-38);c.lineTo(23,-20);c.lineTo(17,-18);c.lineTo(0,-30);c.lineTo(-17,-18);c.closePath();c.fill();
    c.strokeStyle='#d0a86d';c.lineWidth=2;c.beginPath();c.moveTo(-13,-23);c.lineTo(0,-33);c.lineTo(13,-23);c.stroke();
    c.fillStyle='#d6b078';for(let i=0;i<4;i++){const lx=-18+i*12;c.beginPath();c.arc(lx,-8,3,0,Math.PI*2);c.fill();}
    for(let row=0;row<2;row++)for(let i=0;i<3+Math.min(level,2);i++){
      const lx=-21+i*10+(row%2)*3,ly=2-row*7;
      c.fillStyle=row?'#765237':'#a47748';c.beginPath();c.ellipse(lx,ly,6,3,0,0,Math.PI*2);c.fill();
      c.strokeStyle='#d4ae73';c.lineWidth=1;c.beginPath();c.ellipse(lx,ly,2,1,0,0,Math.PI*2);c.stroke();
    }
  }else if(key==='quarry'){
    c.fillStyle='#424c43';c.beginPath();c.ellipse(0,4,28,16,0,0,Math.PI*2);c.fill();
    const rocks=[[-18,1,12,20,'#829188'],[-5,-3,14,27,'#687970'],[10,1,13,22,'#a0a99c'],[22,4,10,17,'#78877c'],[-2,7,16,15,'#53655d']];
    for(const [rx,ry,rh,rw,color] of rocks){
      c.fillStyle=color;c.beginPath();c.moveTo(rx-rw/2,ry+rh/2);c.lineTo(rx-rw*.4,ry-rh*.35);c.lineTo(rx-rw*.08,ry-rh/2);c.lineTo(rx+rw*.43,ry-rh*.22);c.lineTo(rx+rw/2,ry+rh/2);c.closePath();c.fill();
      c.strokeStyle='#c2c8b5';c.lineWidth=1.2;c.beginPath();c.moveTo(rx-rw*.4,ry-rh*.35);c.lineTo(rx-rw*.08,ry-rh/2);c.lineTo(rx+rw*.43,ry-rh*.22);c.stroke();
    }
    c.strokeStyle='#d0b87f';c.lineWidth=2;c.beginPath();c.moveTo(-9,-9);c.lineTo(-3,-2);c.lineTo(-7,5);c.stroke();
    c.fillStyle='#b6a07a';c.fillRect(-28,8,56,4);c.fillStyle='#544832';c.fillRect(-24,12,5,5);c.fillRect(19,12,5,5);
  }else{
    c.fillStyle='#383e34';c.fillRect(-31,-3,62,19);
    const masonry=level>=2;
    for(let row=0;row<2;row++)for(let i=0;i<6;i++){
      const bx=-29+i*11+(row%2)*5,by=-10+row*13;
      c.fillStyle=masonry?(i%2?'#7d897d':'#929889'):(i%2?'#795b39':'#987447');
      c.fillRect(bx,by,10,12);c.strokeStyle=masonry?'#c0c5b3':'#c6a16b';c.lineWidth=1;c.strokeRect(bx+.5,by+.5,9,11);
      if(!masonry){c.fillStyle='#493a2a';c.fillRect(bx+4,by+2,2,8);}
    }
    c.fillStyle=masonry?'#c1c7b4':'#c8a36b';c.fillRect(-34,-15,68,5);
    for(const bx of [-30,30]){c.fillStyle=masonry?'#707d72':'#654a30';c.fillRect(bx-4,-23,8,28);c.fillStyle=masonry?'#c1c7b4':'#d1ad72';c.fillRect(bx-6,-25,12,5);}
    if(!masonry){c.fillStyle='#b77b4b';c.fillRect(-7,-11,14,19);c.fillStyle='#33291f';for(let yy=-9;yy<7;yy+=5)c.fillRect(-7,yy,14,2);}
  }
  const title=building?`${def.name} · Nv. ${level}`:`${def.icon} ${def.name}`;
  const costScale=1+level*.55,wood=Math.ceil(def.wood*costScale),stoneCost=Math.ceil(def.stone*costScale);
  c.fillStyle='#102019d9';c.beginPath();c.roundRect(-55,24,110,27,4);c.fill();
  c.strokeStyle='#a48b5e';c.lineWidth=1;c.stroke();
  c.font='800 9px system-ui';c.textAlign='center';c.fillStyle='#f5e5be';c.fillText(title,0,35,104);
  c.font='700 8px system-ui';c.fillStyle='#d8c59d';c.fillText(`CUSTO  ${wood} madeira · ${stoneCost} pedra`,0,46,105);
  if(working){
    const pct=Math.max(0,Math.min(1,project.progress/project.required));
    c.fillStyle='#101a18';c.beginPath();c.roundRect(-32,-50,64,9,4);c.fill();
    c.fillStyle='#d8bb72';c.beginPath();c.roundRect(-30,-48,60*pct,5,2);c.fill();
    c.font='900 8px system-ui';c.fillStyle='#fff0c5';c.fillText(`EM OBRA · ${Math.floor(pct*100)}%`,0,-55);
  }
  c.restore();
}
function drawRecruiter(c,x,y,role,worker,def,available){
  c.save();c.translate(x,y);c.fillStyle='#08130fb0';c.beginPath();c.ellipse(0,5,16,6,0,0,Math.PI*2);c.fill();
  c.fillStyle=worker?'#81b58e':'#a4a19a';c.beginPath();c.arc(0,-15,6,0,Math.PI*2);c.fill();
  c.fillStyle=worker?'#4b7958':'#5b7180';c.fillRect(-7,-10,14,17);
  c.fillStyle='#d9c182';c.fillRect(-10,4,8,3);c.fillRect(2,4,8,3);
  c.textAlign='center';c.font='800 9px system-ui';c.fillStyle=available?'#f1d88f':'#c3d0c2';
  c.fillText(worker?`${def.name} · ATIVO`:`${def.name} · ${def.gold}🪙`,0,22,86);
  if(!worker&&available){c.fillStyle='#e3cf9c';c.fillRect(-22,-41,44,16);c.fillStyle='#23332b';c.font='800 9px system-ui';c.fillText('E · CONTRATAR',0,-30);}
  else if(!worker){c.fillStyle='#bbc6b8';c.font='700 8px system-ui';c.fillText('POSTO CONQUISTADO',0,36,130);}
  c.restore();
}
function drawFrontierGate(c,x,y,next){
  c.save();c.translate(x,y);c.fillStyle='#060d12aa';c.beginPath();c.ellipse(0,18,45,13,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#65d9c7';c.lineWidth=7;c.shadowColor='#4fe7d5';c.shadowBlur=20;
  c.beginPath();c.ellipse(0,-18,24,42,0,0,Math.PI*2);c.stroke();c.shadowBlur=0;
  c.fillStyle='#183b41';c.beginPath();c.ellipse(0,-18,15,32,0,0,Math.PI*2);c.fill();
  c.fillStyle='#b9efe0';c.font='800 10px system-ui';c.textAlign='center';c.fillText(`PASSAGEM · ${next.name}`,0,44,155);
  c.fillStyle='#f2d58d';c.fillText(`E · ${next.cost} ouro`,0,57);
  c.fillStyle='#d2e0c8';c.fillText(`${next.wood} madeira · ${next.stone} pedra`,0,70,155);c.restore();
}
function drawResourceNode(c,node,x,y,t){
  c.save();c.translate(x,y+Math.sin(t*2.4+node.id)*1.3);c.fillStyle='#08130fa8';
  c.beginPath();c.ellipse(0,11,24,8,0,0,Math.PI*2);c.fill();
  if(node.kind==='wood'){
    // A harvestable tree has a clear trunk, layered crown and a small cut mark.
    c.fillStyle='#583b2b';c.fillRect(-4,-19,9,27);c.fillStyle='#9a7044';c.fillRect(-2,-16,3,19);
    c.fillStyle='#382c22';c.fillRect(-1,-2,12,5);c.fillStyle='#cfaa68';c.fillRect(1,-1,7,2);
    for(const [tx,ty,r,color] of [[-9,-21,12,'#24503a'],[7,-23,13,'#2d6545'],[-1,-34,14,'#3a7650'],[-13,-35,9,'#326b48'],[12,-37,9,'#438052']]){
      c.fillStyle='#10271f88';c.beginPath();c.arc(tx+2,ty+3,r,0,Math.PI*2);c.fill();
      c.fillStyle=color;c.beginPath();c.arc(tx,ty,r,0,Math.PI*2);c.fill();
    }
    for(const [lx,ly] of [[-8,-40],[2,-45],[13,-34],[-14,-28],[1,-25]]){c.fillStyle='#8cbd72a8';c.beginPath();c.ellipse(lx,ly,4,2,-.45,0,Math.PI*2);c.fill();}
    c.fillStyle='#b68a52';c.beginPath();c.ellipse(1,-2,4.5,2,0,0,Math.PI*2);c.fill();
  }else{
    const shards=[[-12,-2,12,24,'#71817a'],[2,-7,15,30,'#909b91'],[15,-1,11,22,'#5e716a'],[-2,4,14,19,'#53655e']];
    for(const [sx,sy,rw,rh,color] of shards){
      c.fillStyle='#273630';c.beginPath();c.moveTo(sx-rw/2,sy+rh/2);c.lineTo(sx-rw*.39,sy-rh*.18);c.lineTo(sx-rw*.08,sy-rh/2);c.lineTo(sx+rw*.4,sy-rh*.21);c.lineTo(sx+rw/2,sy+rh/2);c.closePath();c.fill();
      c.fillStyle=color;c.beginPath();c.moveTo(sx-rw/2,sy+rh/2);c.lineTo(sx-rw*.39,sy-rh*.18);c.lineTo(sx-rw*.08,sy-rh/2);c.lineTo(sx+rw*.4,sy-rh*.21);c.lineTo(sx+rw/2,sy+rh/2);c.closePath();c.fill();
      c.strokeStyle='#d0d5c8';c.lineWidth=1.2;c.beginPath();c.moveTo(sx-rw*.39,sy-rh*.18);c.lineTo(sx-rw*.08,sy-rh/2);c.lineTo(sx+rw*.4,sy-rh*.21);c.stroke();
    }
    c.fillStyle='#e1c179';c.beginPath();c.arc(6,-13,2.5,0,Math.PI*2);c.fill();
  }
  c.fillStyle='#0b1713d9';c.beginPath();c.roundRect(-49,17,98,14,4);c.fill();
  c.fillStyle='#f2e2bd';c.font='800 9px system-ui';c.textAlign='center';
  c.fillText(node.kind==='wood'?`ÁRVORE · +${node.value} madeira`:`VEIO · +${node.value} pedra`,0,27,94);
  c.restore();
}

// All gameplay visuals use the same CanvasRenderingContext2D.
export class Renderer {
  destroy() {}
  render(game) {
    const c=game.ctx,w=game.width,h=game.height,p=game.player;
    c.setTransform(game.dpr,0,0,game.dpr,0,0);
    c.clearRect(0,0,w,h);
    c.fillStyle='#17312d';c.fillRect(0,0,w,h);
    const camX=p.x-w/2,camY=p.y-h/2;
    game.world.draw(c,camX,camY,w,h,game.elapsed);
    for(let i=0;i<(game.campaign?.fortresses?.length||0);i++){
      const x=i*1800-camX,y=-camY;
      if(x>-600&&x<w+600&&y>-320&&y<h+320){
        const fort=game.campaign.fortresses[i];
        drawSettlement(c,x,y,fort,['Santuário','Veyra','Cinzas','Cidadela','Eclipse'][i]||'Fortaleza');
        for(const [key,pos] of Object.entries(SITE_POSITIONS))
          drawWorkSite(c,x+pos.x,y+pos.y,key,fort.buildings?.[key]||0,fort.project);
        for(const [role,def] of Object.entries(WORKERS)){
          const hired=fort.workers?.some(worker=>worker.role===role);
          const jobSite=role==='lumberjack'?SITE_POSITIONS.lumber:role==='miner'?SITE_POSITIONS.quarry:SITE_POSITIONS.tower;
          const px=hired?x+jobSite.x+34:x+def.x,py=hired?y+jobSite.y+13:y+WORKER_Y;
          drawRecruiter(c,px,py,role,hired,def,i===game.campaign.region);
        }
        if(i===game.campaign.region&&REGIONS[i+1])drawFrontierGate(c,x+450,y,REGIONS[i+1]);
      }
    }
    for(const node of game.resourceNodes||[]){
      const x=node.x-camX,y=node.y-camY;
      if(x>-40&&x<w+40&&y>-45&&y<h+40)drawResourceNode(c,node,x,y,game.elapsed);
    }
    if(game.nearbyInteraction){
      c.save();c.textAlign='center';c.font='900 11px system-ui';
      c.fillStyle='#0a1719dd';c.fillRect(w/2-78,h/2-102,156,27);
      c.strokeStyle='#e4ca84';c.lineWidth=1;c.strokeRect(w/2-77.5,h/2-101.5,155,26);
      c.fillStyle='#f6e6bd';c.fillText(game.interactionHint,w/2,h/2-84,148);c.restore();
    }
    // Persistent environmental threats sit on the ground behind actors.
    for(const h of game.hazards||[]){
      const x=h.x-camX,y=h.y-camY;
      if(x>-h.radius&&y>-h.radius&&x<w+h.radius&&y<h+h.radius)
        drawHazard(c,h,x,y,game.elapsed);
    }
    const aura=game.weapons.find(v=>v.id==='aura');
    if(aura){c.strokeStyle='#90d8bb44';c.lineWidth=2;c.beginPath();c.arc(w/2,h/2,92+aura.level*11,0,Math.PI*2);c.stroke();}
    for(const drop of game.drops){
      const x=drop.x-camX,y=drop.y-camY;
      if(x>-40&&y>-40&&x<w+40&&y<h+40)drawDrop(c,drop,x,y,game.elapsed);
    }
    const actors=game.enemies.map(e=>({y:e.y,enemy:e}));
    actors.push({y:p.y,player:true});
    actors.sort((a,b)=>a.y-b.y);
    for(const actor of actors){
      if(actor.player){
        drawPlayer(c,p,w/2,h/2,game.elapsed);
      }
      else{
        const e=actor.enemy,x=e.x-camX,y=e.y-camY;
        if(x>-90&&x<w+90&&y>-110&&y<h+90)drawEnemy(c,e,x,y,game.elapsed);
      }
    }
    for(const shot of game.enemyShots||[]){
      const x=shot.x-camX,y=shot.y-camY;
      if(x>-25&&x<w+25&&y>-25&&y<h+25)drawEnemyShot(c,shot,x,y,game.elapsed);
    }
    for(const pr of game.projectiles)drawProjectile(c,pr,pr.x-camX,pr.y-camY);
    for(const fx of game.effects)drawEffect(c,fx,fx.x-camX,fx.y-camY);
    for(const pt of game.particles){
      c.globalAlpha=Math.max(0,pt.life/pt.duration);c.fillStyle=pt.color;
      c.beginPath();c.arc(pt.x-camX,pt.y-camY,pt.radius,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;
    for(const ft of game.floatTexts){
      c.globalAlpha=Math.max(0,ft.life/ft.duration);
      c.textAlign='center';c.font='800 15px system-ui';c.strokeStyle='#06111c';c.lineWidth=3;
      c.strokeText(ft.text,ft.x-camX,ft.y-camY);c.fillStyle=ft.color;c.fillText(ft.text,ft.x-camX,ft.y-camY);
    }
    c.globalAlpha=1;c.textAlign='left';
    const vignette=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.75);
    vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#050a1788');
    c.fillStyle=vignette;c.fillRect(0,0,w,h);
    // Time-limited wave announcements, never modal: auto attacks and
    // movement remain usable during every encounter.
    const banner=game.eventBanner;
    if(banner?.remaining>0){
      c.save();
      c.globalAlpha=Math.min(1,banner.remaining,.8+Math.min(1,4-banner.remaining));
      const bw=Math.min(w-28,440),bx=(w-bw)/2,by=Math.min(160,h*.23);
      c.fillStyle='#0b2033df';
      c.fillRect(bx,by,bw,61);
      c.strokeStyle='#d7bd7a';c.lineWidth=1.5;
      c.strokeRect(bx+.5,by+.5,bw-1,60);
      c.textAlign='center';
      c.fillStyle='#f6db9e';
      c.font='bold 17px Georgia, serif';
      c.fillText(banner.title,w/2,by+24,bw-20);
      c.font='12px system-ui,sans-serif';
      c.fillStyle='#e2e6d1';
      c.fillText(banner.subtitle,w/2,by+45,bw-20);
      c.restore();
    }
  }
}
