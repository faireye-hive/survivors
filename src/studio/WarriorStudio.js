import { World } from '../world/World.js';
import {drawRigActor, getRigHandles} from '../render/characters/RigRenderer.js';
import {drawWalkReference} from './WalkReference.js';
import {WALK_DIRECTIONS,WALK_LABELS,WALK_FRAME_LABELS,WALK_FRAME_NOTES,
  walkGuideClipId,createDirectionalWalkClip,isWalkRig} from '../data/WalkGuide.js';
import {NODES,RIG_IDS,RIG_PRESETS,RIG_SCHEMA,RIG_VERSION,createFrame,findClip,newCharacter,
  newRigProject,readRigProject,sampleCharacter,storeRigProject,validateRigProject,
  visibleRigNodes,rigOffsetRange,boundedRigValue,rigNodeDefinition,rigShape} from '../data/Rig2D.js';

const $=id=>document.getElementById(id);
const canvas=$('stage'),ctx=canvas.getContext('2d');
if(!ctx)throw Error('Canvas 2D indisponível');
const world=new World(173);
let project=readRigProject();
const state={characterId:project.characters[0].id,clipId:'idle',selected:'head',time:0,
  playing:true,background:'dark',face:'front',zoom:2.6,handles:true,tool:'rotate',
  referenceFrame:0,referenceOverlay:true,referenceOpacity:.55};
let width=1,height=1,dpr=1,last=0,dragging=null,refreshAt=0;
const paletteNames={primary:'Principal',secondary:'Secundária',accent:'Detalhes',
  skin:'Pele/rosto',outline:'Contorno',eyes:'Olhos',metal:'Metal'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const near=(a,b)=>Math.abs(a-b)<.005;
const round=(v,step=.01)=>Math.round(v/step)*step;
function character(){return project.characters.find(c=>c.id===state.characterId)||project.characters[0];}
function clip(){return character().clips.find(a=>a.id===state.clipId)||character().clips[0];}
function message(text,isError=false){
  $('status').textContent=text;
  $('status').style.color=isError?'#ff9b9b':'#9acfb6';
}
function save(){
  try{project=storeRigProject(project);message('Salvo no navegador ✓');}
  catch(e){message(e.message,true);}
}
function refreshCharacters(){
  const select=$('character');select.replaceChildren();
  for(const c of project.characters){
    const item=document.createElement('option');
    item.value=c.id;item.textContent=c.name+' · '+c.id;select.append(item);
  }
  select.value=character().id;
  $('actor-title').textContent=character().name;
  $('actor-id').textContent=character().id;
  $('character-name').value=character().name;
}
function refreshClips(){
  const select=$('clip');select.replaceChildren();
  for(const a of character().clips){
    const option=document.createElement('option');
    option.value=a.id;option.textContent=a.id;select.append(option);
  }
  if(!character().clips.some(a=>a.id===state.clipId))state.clipId=character().clips[0].id;
  select.value=state.clipId;
  $('clip-title').textContent=clip().id;
  $('duration').value=clip().duration;
  $('loop').value=clip().loop?'yes':'no';
  state.time=clamp(state.time,0,clip().duration);
  $('scrub').max=clip().duration;
}
const monsterLabels={
  slime:{body:'Corpo gelatinoso',head:'Rosto (no corpo)'},
  bat:{body:'Tronco de morcego',armL:'Asa esquerda',armR:'Asa direita'},
  wraith:{body:'Manto espectral',armL:'Névoa esquerda',armR:'Névoa direita'},
  colossus:{body:'Núcleo de pedra',legL:'Base esquerda',legR:'Base direita'}
};
function partLabel(id){
  return monsterLabels[rigShape(character())]?.[id]||NODES[id].label;
}
function refreshParts(){
  const box=$('part-list');box.replaceChildren();
  const nodes=visibleRigNodes(character());
  if(!nodes.includes(state.selected))state.selected=nodes.includes('head')?'head':nodes[0];
  for(const id of nodes){
    const button=document.createElement('button');
    button.type='button';button.dataset.part=id;
    button.textContent=partLabel(id);
    button.classList.toggle('active',id===state.selected);
    button.addEventListener('click',()=>selectPart(id));
    box.append(button);
  }
  $('part-title').textContent='06 · '+partLabel(state.selected);
}
function refreshColors(){
  const box=$('colors');box.replaceChildren();
  for(const [key,label] of Object.entries(paletteNames)){
    const wrapper=document.createElement('label');
    wrapper.textContent=label;
    const picker=document.createElement('input');
    picker.type='color';picker.value=character().colors[key];
    picker.setAttribute('aria-label',label);
    picker.addEventListener('input',()=>{
      character().colors[key]=picker.value;save();
    });
    wrapper.append(picker);box.append(wrapper);
  }
}
function currentPose(){return sampleCharacter(character(),clip().id,state.time);}
function activeFrame(){return clip().frames.find(f=>near(f.time,state.time));}
function ensureFrame(){
  let frame=activeFrame();
  if(frame)return frame;
  if(clip().frames.length>=180)throw Error('Limite de 180 keyframes por clipe.');
  frame=createFrame(round(state.time),currentPose());
  if(clip().frames.some(f=>near(f.time,frame.time)))return clip().frames.find(f=>near(f.time,frame.time));
  clip().frames.push(frame);
  clip().frames.sort((a,b)=>a.time-b.time);
  state.time=frame.time;
  return frame;
}
function pause(){state.playing=false;$('play').textContent='▶ Reproduzir';}
function refreshInspector(){
  const pose=currentPose(),part=pose[state.selected]||{};
  for(const key of ['x','y']){
    const [lo,hi]=rigOffsetRange(state.selected,key);
    const field=$('part-'+key);
    field.min=lo;field.max=hi;field.disabled=lo===hi;
    field.value=round(boundedRigValue(state.selected,key,part[key]||0));
  }
  const angle=round(part.rotation||0);
  $('part-rotation').value=angle;
  $('rotation-dial').value=angle;
  $('rotation-value').textContent=angle+'°';
  $('part-scale').value=round(part.scale??1);
  const moveable=rigOffsetRange(state.selected,'x')[1]>0;
  $('rig-lock-hint').textContent=moveable
    ?'Posição limitada ao encaixe; girar mantém as peças conectadas.'
    :'Pivô fixo: use a rotação para mover a peça sem desencaixar.';
}
function refreshTimeline(){
  $('scrub').value=state.time;
  $('time-label').textContent=state.time.toFixed(2)+' / '+clip().duration.toFixed(2)+' s';
  const box=$('frames');box.replaceChildren();
  for(const frame of clip().frames){
    const button=document.createElement('button');button.type='button';
    button.textContent='◆ '+frame.time.toFixed(2);
    button.classList.toggle('active',near(state.time,frame.time));
    button.title='Ir para o keyframe '+frame.time.toFixed(2)+' s';
    button.addEventListener('click',()=>seek(frame.time));
    box.append(button);
  }
  $('json-preview').textContent=JSON.stringify({
    character:character().id,clip:clip().id,time:round(state.time),
    pose:currentPose()},null,2);
}
function renderReferenceGrid(){
  const grid=$('reference-grid');
  grid.replaceChildren();
  for(const direction of WALK_DIRECTIONS){
    const row=document.createElement('div');row.className='walk-ref-row';
    const title=document.createElement('div');
    title.className='walk-ref-label';
    title.textContent=WALK_LABELS[direction];
    const filmstrip=document.createElement('div');filmstrip.className='walk-ref-frames';
    for(let frame=0;frame<4;frame++){
      const button=document.createElement('button');
      button.type='button';button.dataset.direction=direction;
      button.dataset.frame=String(frame);
      button.setAttribute('aria-label',WALK_LABELS[direction]+' — '+WALK_FRAME_LABELS[frame]);
      button.title=WALK_FRAME_LABELS[frame]+': '+WALK_FRAME_NOTES[frame];
      const thumbnail=document.createElement('canvas');
      thumbnail.width=70;thumbnail.height=90;
      thumbnail.setAttribute('aria-hidden','true');
      const c=thumbnail.getContext('2d');
      if(c){
        c.fillStyle='#102832';c.fillRect(0,0,70,90);
        drawWalkReference(c,direction,frame,35,83,1.1,1);
      }
      const number=document.createElement('small');
      number.textContent=String(frame+1).padStart(2,'0');
      button.append(thumbnail,number);
      button.addEventListener('click',()=>selectReference(direction,frame));
      filmstrip.append(button);
    }
    row.append(title,filmstrip);grid.append(row);
  }
}
function refreshReferenceUI(){
  const biped=isWalkRig(character());
  $('reference-apply').disabled=!biped;
  $('reference-overlay').disabled=!biped;
  $('reference-caption').textContent=WALK_LABELS[state.face]+' · '+
    WALK_FRAME_LABELS[state.referenceFrame]+': '+WALK_FRAME_NOTES[state.referenceFrame];
  for(const button of $('reference-grid').querySelectorAll('button[data-direction]')){
    const active=button.dataset.direction===state.face&&
      Number(button.dataset.frame)===state.referenceFrame;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
  $('reference-help').textContent=biped
    ?'Cria walk.'+state.face+' com 4 poses e 1 quadro de fechamento para loop suave. Outros clipes ficam intactos.'
    :'Referência humana para observação. Esta espécie não tem quatro membros para aplicar a caminhada.';
}
function selectReference(direction,frame,activateClip=true){
  if(!WALK_DIRECTIONS.includes(direction)||frame<0||frame>3)return;
  state.face=direction;state.referenceFrame=frame;
  $('direction').value=direction;
  if(activateClip){
    const desired=walkGuideClipId(direction);
    const target=character().clips.some(c=>c.id===desired)?desired:
      character().clips.some(c=>c.id==='walk')?'walk':null;
    if(target){state.clipId=target;refreshClips();}
    seek(clip().duration*frame/4);
  }
  refreshReferenceUI();
}
$('reference-overlay').addEventListener('change',event=>{
  state.referenceOverlay=event.target.checked;
});
$('reference-opacity').addEventListener('input',event=>{
  state.referenceOpacity=Number(event.target.value);
  $('reference-opacity-label').textContent=Math.round(state.referenceOpacity*100)+'%';
});
$('reference-apply').addEventListener('click',()=>{
  if(!isWalkRig(character()))return message('Este monstro não possui caminhada humanoide.',true);
  const id=walkGuideClipId(state.face),existing=character().clips.findIndex(c=>c.id===id);
  if(existing!==-1&&!confirm('Substituir '+id+'? As poses atuais deste clipe serão perdidas.'))return;
  if(existing===-1&&character().clips.length>=16)
    return message('Limite de 16 animações por personagem.',true);
  const replacement=createDirectionalWalkClip(state.face);
  if(existing===-1)character().clips.push(replacement);
  else character().clips[existing]=replacement;
  state.clipId=id;state.time=replacement.duration*state.referenceFrame/4;
  pause();save();refreshAll();message('Criada '+id+' com 4 quadros + fechamento. Ajuste cada pose pelo editor.');
});
function refreshAll(){
  refreshCharacters();refreshClips();refreshParts();refreshColors();
  refreshInspector();refreshTimeline();refreshReferenceUI();
}
function selectPart(id){state.selected=id;refreshParts();refreshInspector();}
function seek(time){
  pause();state.time=clamp(round(time),0,clip().duration);
  state.referenceFrame=Math.min(3,Math.floor(state.time/clip().duration*4));
  refreshInspector();refreshTimeline();refreshReferenceUI();
}
function setPartValue(key,value){
  if(!Number.isFinite(value))return;
  const ranges={x:[-90,90],y:[-90,90],rotation:[-180,180],scale:[.2,3]};
  pause();
  try{
    const frame=ensureFrame();frame.pose[state.selected]||={};
    frame.pose[state.selected][key]=round(boundedRigValue(state.selected,key,clamp(value,...ranges[key])));
    save();refreshInspector();refreshTimeline();
  }catch(e){message(e.message,true);}
}
for(const key of ['x','y','rotation','scale']){
  $('part-'+key).addEventListener('change',event=>setPartValue(key,Number(event.target.value)));
}
$('rotation-dial').addEventListener('input',event=>{
  setPartValue('rotation',Number(event.target.value));
});
function setTool(tool){
  state.tool=tool;
  $('tool-rotate').classList.toggle('primary',tool==='rotate');
  $('tool-move').classList.toggle('primary',tool==='move');
  $('tool-rotate').setAttribute('aria-pressed',String(tool==='rotate'));
  $('tool-move').setAttribute('aria-pressed',String(tool==='move'));
}
$('tool-rotate').addEventListener('click',()=>setTool('rotate'));
$('tool-move').addEventListener('click',()=>setTool('move'));

$('character').addEventListener('change',event=>{
  state.characterId=event.target.value;state.clipId='idle';state.time=0;
  refreshAll();
});
$('character-name').addEventListener('change',event=>{
  character().name=event.target.value.trim().slice(0,60)||character().id;
  save();refreshCharacters();
});
$('clone-character').addEventListener('click',()=>{
  const id=$('new-id').value.trim().toLowerCase();
  if(!/^[a-z][a-z0-9._-]{0,39}$/.test(id))return message('Use um ID como custom.heroi01',true);
  if(project.characters.some(c=>c.id===id))return message('ID já existe',true);
  if(project.characters.length>=64)return message('Limite de 64 personagens',true);
  const source=character(),copy=newCharacter(source.template,id,source.name+' cópia');
  copy.colors=structuredClone(source.colors);copy.clips=structuredClone(source.clips);
  project.characters.push(copy);
  state.characterId=id;state.clipId=copy.clips[0].id;state.time=0;
  $('new-id').value='';
  save();refreshAll();
});
$('clip').addEventListener('change',event=>{
  state.clipId=event.target.value;state.time=0;refreshClips();refreshInspector();refreshTimeline();
});
$('add-clip').addEventListener('click',()=>{
  const id=$('new-clip').value.trim().toLowerCase();
  if(!/^[a-z][a-z0-9_-]{0,31}$/.test(id))return message('Use um código simples: idle, dance, jump...',true);
  if(character().clips.some(c=>c.id===id))return message('Animação já existe',true);
  if(character().clips.length>=16)return message('Limite de 16 animações',true);
  character().clips.push({id,duration:1,loop:true,frames:[createFrame(0)]});
  state.clipId=id;state.time=0;$('new-clip').value='';
  save();refreshClips();refreshInspector();refreshTimeline();
});
$('delete-clip').addEventListener('click',()=>{
  if(character().clips.length<=1)return message('Mantenha pelo menos uma animação.',true);
  if(!confirm('Excluir a animação '+clip().id+'?'))return;
  character().clips=character().clips.filter(c=>c.id!==state.clipId);
  state.clipId=character().clips[0].id;state.time=0;
  save();refreshClips();refreshInspector();refreshTimeline();
});
$('duration').addEventListener('change',event=>{
  const value=Number(event.target.value),lastFrame=clip().frames.at(-1).time;
  if(!Number.isFinite(value)||value<.1||value>60||value<lastFrame)
    return message('A duração deve conter todos os keyframes e ser até 60s.',true);
  clip().duration=value;state.time=Math.min(state.time,value);
  save();refreshClips();refreshTimeline();
});
$('loop').addEventListener('change',event=>{clip().loop=event.target.value==='yes';save();});
$('play').addEventListener('click',()=>{
  state.playing=!state.playing;$('play').textContent=state.playing?'Ⅱ Pausar':'▶ Reproduzir';
  last=0;
});
$('scrub').addEventListener('input',event=>seek(Number(event.target.value)));
$('add-frame').addEventListener('click',()=>{
  pause();
  try{ensureFrame();save();refreshInspector();refreshTimeline();}
  catch(e){message(e.message,true);}
});
$('copy-frame').addEventListener('click',()=>{
  pause();
  try{
    const source=clip().frames.filter(f=>f.time<state.time-.005).at(-1)||clip().frames[0];
    const target=ensureFrame();target.pose=structuredClone(source.pose);
    save();refreshInspector();refreshTimeline();
  }catch(e){message(e.message,true);}
});
$('delete-frame').addEventListener('click',()=>{
  if(clip().frames.length<=1)return message('Mantenha pelo menos um keyframe.',true);
  const frame=activeFrame();if(!frame)return message('Selecione um keyframe primeiro.',true);
  clip().frames.splice(clip().frames.indexOf(frame),1);
  state.time=clip().frames[0].time;
  save();refreshInspector();refreshTimeline();
});
$('reset-part').addEventListener('click',()=>{
  pause();try{const f=ensureFrame();delete f.pose[state.selected];save();refreshInspector();refreshTimeline();}
  catch(e){message(e.message,true);}
});
$('reset-pose').addEventListener('click',()=>{
  pause();try{const f=ensureFrame();f.pose={};save();refreshInspector();refreshTimeline();}
  catch(e){message(e.message,true);}
});
$('direction').addEventListener('change',event=>
  selectReference(event.target.value,state.referenceFrame,false));
$('background').addEventListener('change',event=>state.background=event.target.value);
$('zoom').addEventListener('input',event=>{
  state.zoom=Number(event.target.value);$('zoom-label').textContent=state.zoom.toFixed(1)+'×';
});
$('show-handles').addEventListener('change',event=>state.handles=event.target.checked);

function drawBackdrop(c,w,h){
  if(state.background==='world'){
    world.draw(c,-w*.5,-h*.8,w,h,state.time);
    c.fillStyle='#0a20274f';c.fillRect(0,0,w,h);
  }else if(state.background==='transparent'){
    for(let yy=0;yy<h;yy+=28)for(let xx=0;xx<w;xx+=28){
      c.fillStyle=((xx/28+yy/28)%2)<1?'#30404a':'#40525a';
      c.fillRect(xx,yy,28,28);
    }
  }else{
    c.fillStyle=state.background==='light'?'#d7e0d5':'#203440';
    c.fillRect(0,0,w,h);
    c.strokeStyle=state.background==='light'?'#536c6926':'#b6dccc22';
    c.lineWidth=1;
    for(let x=0;x<w;x+=38){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    for(let y=0;y<h;y+=38){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  }
}
function drawPose(c,w,h,t,zoom,handles=false){
  const selected=character(),pose=sampleCharacter(selected,clip().id,t);
  const effectiveZoom=selected.template==='monster.colossus'?zoom*.61:zoom;
  c.save();c.translate(w/2,h*.79);c.scale(effectiveZoom,effectiveZoom);
  drawRigActor(c,{},0,0,t,{
    id:selected.id,character:selected,pose,face:state.face,
    shadow:!handles,showHandles:handles&&state.handles,selected:state.selected
  });
  // The walk reference is an editor-only overlay. PNG exports remain clean.
  if(handles&&state.referenceOverlay&&isWalkRig(selected)){
    const frame=state.playing?Math.min(3,Math.floor(t/clip().duration%1*4)):
      state.referenceFrame;
    drawWalkReference(c,state.face,frame,0,0,
      selected.template==='monster.colossus'?1.65:1,state.referenceOpacity);
  }
  c.restore();
}
function resize(){
  const r=canvas.getBoundingClientRect();
  width=Math.max(1,r.width);height=Math.max(1,r.height);
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
}
function paint(now){
  const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
  if(state.playing){
    state.time+=dt;
    if(state.time>=clip().duration){
      if(clip().loop)state.time%=clip().duration;
      else{state.time=clip().duration;pause();}
    }
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  drawBackdrop(ctx,width,height);
  drawPose(ctx,width,height,state.time,state.zoom*2.2,true);
  if(now-refreshAt>100){
    refreshAt=now;
    $('scrub').value=state.time;
    $('time-label').textContent=state.time.toFixed(2)+' / '+clip().duration.toFixed(2)+' s';
    if(state.playing){
      refreshInspector();
      state.referenceFrame=Math.min(3,Math.floor(state.time/clip().duration*4));
      refreshReferenceUI();
    }
  }
  requestAnimationFrame(paint);
}
function pointerToRig(event){
  const r=canvas.getBoundingClientRect();
  const signed=state.face==='left'?-1:1;
  const size=state.zoom*2.2*(character().template==='monster.colossus'?.61*1.65:1);
  return {x:((event.clientX-r.left)-width/2)/size*signed,
    y:((event.clientY-r.top)-height*.79)/size};
}
// Selected bone has an arc and an amber rotation knob. Drag the knob for
// angular rotation; dragging the central joint uses a stable degree-per-pixel
// gesture so touching a pivot never causes a sudden jump or disassembly.
const TAU=Math.PI*2;
function rotationKnob(j){
  return {x:j.x+Math.cos(j.rotation-Math.PI/2)*15,
    y:j.y+Math.sin(j.rotation-Math.PI/2)*15};
}
function angleBetween(from,to){
  return Math.atan2(to.y-from.y,to.x-from.x);
}
function shortestAngle(delta){
  return Math.atan2(Math.sin(delta),Math.cos(delta));
}
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0&&event.pointerType==='mouse')return;
  const point=pointerToRig(event),handles=getRigHandles(currentPose(),character());
  let selected=null,dragKind='pivot',distance=Infinity;
  const highlighted=handles[state.selected];
  if(highlighted){
    const knob=rotationKnob(highlighted);
    if(Math.hypot(point.x-knob.x,point.y-knob.y)<7){
      selected=state.selected;dragKind='knob';
    }
  }
  if(!selected){
    for(const [id,j] of Object.entries(handles)){
      const d=Math.hypot(point.x-j.x,point.y-j.y);
      if(d<distance){distance=d;selected=id;}
    }
  }
  if(!selected||(dragKind==='pivot'&&distance>10))return;
  selectPart(selected);pause();
  try{
    ensureFrame();
    const startJoint=getRigHandles(currentPose(),character())[selected];
    const initial=activeFrame().pose[selected]?.rotation||0;
    const moveable=rigOffsetRange(selected,'x')[1]>0;
    const mode=dragKind==='knob'||state.tool==='rotate'||!moveable?'rotate':'move';
    dragging={id:event.pointerId,selected,mode,dragKind,
      initial,startPointer:point,pivot:startJoint,
      lastPointer:point,original:structuredClone(activeFrame().pose[selected]||{}),
      angle:angleBetween(startJoint,point)};
    canvas.setPointerCapture(event.pointerId);
  }catch(e){message(e.message,true);}
});
canvas.addEventListener('pointermove',event=>{
  if(!dragging||dragging.id!==event.pointerId)return;
  const d=dragging,point=pointerToRig(event);
  const frame=activeFrame();if(!frame)return;
  frame.pose[d.selected]||={};
  const joint=frame.pose[d.selected];
  if(d.mode==='rotate'){
    let degrees;
    if(d.dragKind==='knob'){
      const delta=shortestAngle(angleBetween(d.pivot,point)-d.angle);
      degrees=d.initial+delta*180/Math.PI;
    }else{
      const size=state.zoom*2.2;
      const signed=state.face==='left'?-1:1;
      degrees=d.initial+(point.x-d.startPointer.x)*size*.48*signed
        -(point.y-d.startPointer.y)*size*.18;
    }
    joint.rotation=round(boundedRigValue(d.selected,'rotation',degrees),.5);
  }else{
    // Positional edits are only permitted for the root, head/face and facial
    // features. Connected limbs never move their joint origins off the skeleton.
    const node=rigNodeDefinition(d.selected,character());
    const joints=getRigHandles(currentPose(),character());
    const parent=node.parent?joints[node.parent]:{x:0,y:0,rotation:0,scale:1};
    const x=point.x-parent.x,y=point.y-parent.y,cs=Math.cos(parent.rotation),sn=Math.sin(parent.rotation);
    const nx=(x*cs+y*sn)/parent.scale-node.x;
    const ny=(-x*sn+y*cs)/parent.scale-node.y;
    joint.x=round(boundedRigValue(d.selected,'x',nx),.25);
    joint.y=round(boundedRigValue(d.selected,'y',ny),.25);
  }
  d.lastPointer=point;
  refreshInspector();
});
function finishDrag(event){
  if(!dragging||dragging.id!==event.pointerId)return;
  dragging=null;save();refreshTimeline();
}
canvas.addEventListener('pointerup',finishDrag);
canvas.addEventListener('pointercancel',finishDrag);
canvas.addEventListener('lostpointercapture',()=>{
  if(dragging){dragging=null;save();refreshTimeline();}
});
function download(name,contents,mime){
  const blob=new Blob([contents],{type:mime});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function jsonDownload(single){
  const characters=single?[structuredClone(character())]:structuredClone(project.characters);
  const safe=validateRigProject({schema:RIG_SCHEMA,version:RIG_VERSION,characters});
  download((single?character().id:'cronicas-rig2d-project')+'.json',
    JSON.stringify(safe,null,2)+'\n','application/json');
}
$('export-character').addEventListener('click',()=>jsonDownload(true));
$('export-all').addEventListener('click',()=>jsonDownload(false));
$('json-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  if(file.size>1024*1024){message('JSON maior que 1 MB.',true);event.target.value='';return;}
  try{
    const imported=validateRigProject(JSON.parse(await file.text()));
    const map=new Map(project.characters.map(c=>[c.id,c]));
    for(const c of imported.characters)map.set(c.id,c);
    if(map.size>64)throw Error('Máximo de 64 personagens.');
    project.characters=[...map.values()];
    state.characterId=imported.characters[0].id;state.clipId='idle';state.time=0;
    save();refreshAll();message('JSON importado: '+imported.characters.length+' personagem(ns).');
  }catch(e){message('Falha ao importar: '+e.message,true);}
  event.target.value='';
});
$('export-png').addEventListener('click',()=>{
  const image=document.createElement('canvas');image.width=768;image.height=768;
  const c=image.getContext('2d');
  c.clearRect(0,0,768,768);
  // Never draw editor grid/handles in exported artwork.
  drawPose(c,768,768,state.time,7,false);
  image.toBlob(blob=>{
    if(!blob)return message('Falha na exportação PNG.',true);
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=character().id+'-'+clip().id+'-2d.png';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  },'image/png');
});
$('reset-project').addEventListener('click',()=>{
  if(!confirm('Descartar todos os personagens e animações salvos no navegador?'))return;
  project=newRigProject();state.characterId=RIG_IDS[0];state.clipId='idle';state.time=0;
  save();refreshAll();
});
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{last=0;});
renderReferenceGrid();refreshAll();resize();requestAnimationFrame(paint);
