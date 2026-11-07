import { drawPlayer, drawEnemy, drawDrop, drawProjectile, drawEffect } from './Art.js';

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
  }
}
