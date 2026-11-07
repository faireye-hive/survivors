import { World } from '../world/World.js';
import { drawPlayer } from '../render/Art.js';

// Same character drawing used during gameplay. No second rendering engine.
const canvas=document.getElementById('stage');
const ctx=canvas.getContext('2d');
if(!ctx)throw new Error('Canvas 2D indisponível');
const world=new World(173);
const state={classId:'guardian',motion:'idle',face:'front',equipment:'full',
  background:'world',zoom:1,paused:false};
const directions={front:Math.PI/2,back:-Math.PI/2,left:Math.PI,right:0};
let width=1,height=1,dpr=1,clock=0,last=0;
function resize(){
  const rect=canvas.getBoundingClientRect();
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
}
function actor(time){
  const walk=state.motion==='walk',speed=walk?130:0;
  const angle=directions[state.face];
  return {classId:state.classId,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    facing:angle,inv:0,attackPose:state.motion==='attack'?Math.max(0,.27-(time%.7)):.0};
}
function background(c,w,h,time,mode){
  if(mode==='world'){
    world.draw(c,-w/2,-h*.8,w,h,time);
    c.fillStyle='#06162045';c.fillRect(0,0,w,h);
  }else if(mode==='transparent'){
    c.clearRect(0,0,w,h);
    // Checkerboard only in the preview; PNG exports are actually transparent.
    for(let y=0;y<h;y+=24)for(let x=0;x<w;x+=24){
      c.fillStyle=(Math.floor(x/24)+Math.floor(y/24))%2?'#263942':'#334750';
      c.fillRect(x,y,24,24);
    }
  }else{
    c.fillStyle=mode==='light'?'#d3dccf':'#172832';
    c.fillRect(0,0,w,h);
    c.strokeStyle=mode==='light'?'#5c7b6b28':'#a3cfc324';c.lineWidth=1;
    for(let x=0;x<w;x+=44){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    for(let y=0;y<h;y+=44){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  }
}
function character(c,w,h,time,zoom,exporting=false){
  c.save();
  c.translate(w/2,h*.8);
  c.scale(zoom*2.4,zoom*2.4);
  drawPlayer(c,actor(time),0,0,time,{
    face:state.face,equipment:state.equipment,
    shadow:!exporting,lighting:true
  });
  c.restore();
}
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
  if(!state.paused)clock+=dt;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  background(ctx,width,height,clock,state.background);
  character(ctx,width,height,clock,state.zoom);
  requestAnimationFrame(frame);
}
function activate(key,value){
  state[key]=value;
  document.querySelectorAll('[data-'+(key==='classId'?'class':key)+']').forEach(button=>{
    const attr=key==='classId'?'class':key;
    button.classList.toggle('active',button.dataset[attr]===value);
    button.setAttribute('aria-pressed',String(button.dataset[attr]===value));
  });
}
document.querySelectorAll('[data-class]').forEach(button=>
  button.addEventListener('click',()=>activate('classId',button.dataset.class)));
document.querySelectorAll('[data-motion]').forEach(button=>
  button.addEventListener('click',()=>activate('motion',button.dataset.motion)));
document.getElementById('direction').addEventListener('change',event=>state.face=event.target.value);
document.getElementById('equipment').addEventListener('change',event=>state.equipment=event.target.value);
document.getElementById('background').addEventListener('change',event=>state.background=event.target.value);
document.getElementById('zoom').addEventListener('input',event=>{
  state.zoom=Number(event.target.value);
  document.getElementById('zoom-value').textContent=state.zoom.toFixed(1)+'×';
});
document.getElementById('pause').addEventListener('click',event=>{
  state.paused=!state.paused;
  event.currentTarget.textContent=state.paused?'▶ Retomar animação':'Ⅱ Pausar animação';
});
document.getElementById('export').addEventListener('click',()=>{
  const png=document.createElement('canvas');
  png.width=768;png.height=768;
  const output=png.getContext('2d');
  output.clearRect(0,0,png.width,png.height);
  character(output,png.width,png.height,clock,1.95,true);
  const link=document.createElement('a');
  link.href=png.toDataURL('image/png');
  link.download='cronicas-personagem-'+state.classId+'-2d.png';
  link.click();
});
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{last=0;});
resize();
requestAnimationFrame(frame);
