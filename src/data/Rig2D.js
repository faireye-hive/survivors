/**
 * Shared, versioned 2D rig and timeline format for the game and character studio.
 * Coordinates are logical Canvas pixels relative to the feet (0, 0).
 * A frame's pose is keyed by node id; numbers are bounded, never evaluated.
 */
export const RIG_SCHEMA='cronicas-do-eter/rig2d';
export const RIG_VERSION=1;
export const RIG_STORAGE='cronicas.2d.rigs.v1';
export const NODE_ORDER=['body','head','eyeL','eyeR','mouth','armL','handL','armR','handR','legL','footL','legR','footR','weapon'];
export const NODES=Object.freeze({
  body:{parent:null,x:0,y:-25,label:'Tronco'},
  head:{parent:'body',x:0,y:-23,label:'Cabeça'},
  eyeL:{parent:'head',x:-5,y:-2,label:'Olho esquerdo'},
  eyeR:{parent:'head',x:5,y:-2,label:'Olho direito'},
  mouth:{parent:'head',x:0,y:7,label:'Boca'},
  armL:{parent:'body',x:-14,y:-8,label:'Braço esquerdo'},
  handL:{parent:'armL',x:-2,y:17,label:'Mão esquerda'},
  armR:{parent:'body',x:14,y:-8,label:'Braço direito'},
  handR:{parent:'armR',x:2,y:17,label:'Mão direita'},
  legL:{parent:'body',x:-8,y:12,label:'Perna esquerda'},
  footL:{parent:'legL',x:-1,y:15,label:'Pé esquerdo'},
  legR:{parent:'body',x:8,y:12,label:'Perna direita'},
  footR:{parent:'legR',x:1,y:15,label:'Pé direito'},
  weapon:{parent:'handR',x:3,y:0,label:'Arma'},
});
const P=(name,shape,colors)=>Object.freeze({name,shape,colors:Object.freeze(colors)});
export const RIG_PRESETS=Object.freeze({
  'hero.guardian':P('Guerreiro','guardian',{primary:'#8f9eaa',secondary:'#405668',accent:'#e8be76',skin:'#d7a886',outline:'#1d2b38',eyes:'#253942',metal:'#ecf3e7'}),
  'hero.mage':P('Arcanista','mage',{primary:'#657fbc',secondary:'#364d88',accent:'#9fe5ee',skin:'#e0b496',outline:'#222941',eyes:'#293b58',metal:'#d9f4ff'}),
  'hero.ranger':P('Andarilho','ranger',{primary:'#4f9a7a',secondary:'#285d4d',accent:'#c7de95',skin:'#cda181',outline:'#1f3430',eyes:'#304d46',metal:'#f2eac9'}),
  'monster.slime':P('Limo','slime',{primary:'#63bba2',secondary:'#318c7b',accent:'#b9f5c6',skin:'#76cdb5',outline:'#254a48',eyes:'#203b3c',metal:'#d7fff0'}),
  'monster.bat':P('Morcego','bat',{primary:'#8c7bab',secondary:'#594769',accent:'#dbb6ef',skin:'#af98be',outline:'#30293e',eyes:'#ffb0bb',metal:'#e8d4ff'}),
  'monster.skeleton':P('Esqueleto','skeleton',{primary:'#e0dfca',secondary:'#a3a99c',accent:'#eac389',skin:'#e5e1cb',outline:'#465158',eyes:'#23333b',metal:'#fff4de'}),
  'monster.wraith':P('Espectro','wraith',{primary:'#4e9aab',secondary:'#28546d',accent:'#a5fff3',skin:'#7ccad1',outline:'#153447',eyes:'#b4fff4',metal:'#d8ffff'}),
  'monster.colossus':P('Colosso','colossus',{primary:'#8d9b91',secondary:'#536f6c',accent:'#efc684',skin:'#b7a68b',outline:'#283d45',eyes:'#ffe4a1',metal:'#e0dbbf'}),
});
export const RIG_IDS=Object.freeze(Object.keys(RIG_PRESETS));
// Only the anatomical parts that exist in each species can be edited or drawn.
// The face pivot is hidden inside the slime's single body: not a second head.
const HERO_NODES=Object.freeze([...NODE_ORDER]);
export const RIG_ANATOMY=Object.freeze({
  guardian:HERO_NODES,mage:HERO_NODES,ranger:HERO_NODES,
  slime:Object.freeze(['body','head','eyeL','eyeR','mouth']),
  bat:Object.freeze(['body','head','eyeL','eyeR','mouth','armL','armR']),
  skeleton:Object.freeze(['body','head','eyeL','eyeR','mouth','armL','handL','armR','handR','legL','legR']),
  wraith:Object.freeze(['body','head','eyeL','eyeR','armL','armR']),
  colossus:Object.freeze(['body','head','eyeL','eyeR','mouth','armL','armR','legL','legR']),
});
const anatomyLayout={
  slime:{body:{x:0,y:-13},head:{x:0,y:0},eyeL:{x:-6,y:-4},eyeR:{x:6,y:-4},mouth:{x:0,y:5}},
  bat:{body:{x:0,y:-18},head:{x:0,y:-10},eyeL:{x:-5,y:-2},eyeR:{x:5,y:-2},
    mouth:{x:0,y:6},armL:{x:-10,y:-5},armR:{x:10,y:-5}},
  skeleton:{body:{x:0,y:-26},head:{x:0,y:-22},eyeL:{x:-5,y:-3},eyeR:{x:5,y:-3},
    mouth:{x:0,y:8},armL:{x:-12,y:-10},armR:{x:12,y:-10},
    legL:{x:-7,y:12},legR:{x:7,y:12}},
  wraith:{body:{x:0,y:-23},head:{x:0,y:-14},eyeL:{x:-4,y:0},eyeR:{x:4,y:0},
    armL:{x:-13,y:-6},armR:{x:13,y:-6}},
  colossus:{body:{x:0,y:-31},head:{x:0,y:-24},eyeL:{x:-5,y:0},eyeR:{x:5,y:0},
    mouth:{x:0,y:8},armL:{x:-19,y:-9},armR:{x:19,y:-9},
    legL:{x:-12,y:12},legR:{x:12,y:12}},
};
export function rigShape(characterOrTemplate='hero.guardian'){
  const template=typeof characterOrTemplate==='string'?characterOrTemplate:characterOrTemplate?.template;
  return RIG_PRESETS[template]?.shape||'guardian';
}
export function visibleRigNodes(characterOrTemplate='hero.guardian'){
  return RIG_ANATOMY[rigShape(characterOrTemplate)]||HERO_NODES;
}
export function rigNodeDefinition(id,characterOrTemplate='hero.guardian'){
  const node=NODES[id];
  if(!node)return null;
  const override=anatomyLayout[rigShape(characterOrTemplate)]?.[id];
  return override?{...node,...override}:node;
}
/** Offsets for connected bones stay locked; move their rotation, not their pivot.
 * Independent facial features move only within their host head/face.
 */
export function rigOffsetRange(id,key){
  if(key!=='x'&&key!=='y')return [-90,90];
  if(id==='body')return [-90,90];
  if(id==='head')return [-3,3];
  if(id==='eyeL'||id==='eyeR')return [-4,4];
  if(id==='mouth')return [-5,5];
  return [0,0];
}
export function boundedRigValue(id,key,value){
  if(key==='scale')return Math.max(.2,Math.min(3,value));
  if(key==='rotation')return Math.max(-180,Math.min(180,value));
  const [min,max]=rigOffsetRange(id,key);
  return Math.max(min,Math.min(max,value));
}

const ACTIONS=['idle','walk','attack','hit'];
const colorPattern=/^#[a-fA-F0-9]{6}$/;
const idPattern=/^[a-z][a-z0-9._-]{0,39}$/;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const createFrame=(time,pose={})=>({time,pose:structuredClone(pose)});
export function createClips(template){
  const bat=template==='monster.bat',slime=template==='monster.slime';
  return [
    {id:'idle',duration:1.2,loop:true,frames:[
      createFrame(0,{body:{y:0},eyeL:{scale:1},eyeR:{scale:1}}),
      createFrame(.6,{body:{y:-1.8},head:{rotation:2},eyeL:{scale:.8},eyeR:{scale:.8}}),
      createFrame(1.2,{body:{y:0},head:{rotation:0},eyeL:{scale:1},eyeR:{scale:1}})]},
    {id:'walk',duration:.7,loop:true,frames:[
      createFrame(0,{body:{y:0},legL:{rotation:-21},legR:{rotation:21},
        armL:{rotation:bat?-28:17},armR:{rotation:bat?28:-17},footL:{rotation:9},footR:{rotation:-9}}),
      createFrame(.35,{body:{y:slime?-5:-2},legL:{rotation:21},legR:{rotation:-21},
        armL:{rotation:bat?28:-17},armR:{rotation:bat?-28:17},footL:{rotation:-9},footR:{rotation:9}}),
      createFrame(.7,{body:{y:0},legL:{rotation:-21},legR:{rotation:21},
        armL:{rotation:bat?-28:17},armR:{rotation:bat?28:-17},footL:{rotation:9},footR:{rotation:-9}})]},
    {id:'attack',duration:.56,loop:false,frames:[
      createFrame(0,{}),
      createFrame(.2,{body:{rotation:7},head:{rotation:-8},armR:{rotation:-48},
        handR:{rotation:-20},weapon:{rotation:-48},armL:{rotation:12},mouth:{scale:1.4}}),
      createFrame(.56,{})]},
    {id:'hit',duration:.4,loop:false,frames:[
      createFrame(0,{}),
      createFrame(.16,{head:{rotation:13},body:{rotation:-9},eyeL:{scale:.7},eyeR:{scale:.7}}),
      createFrame(.4,{})]},
  ];
}
export function newCharacter(template,id=template,name){
  if(!RIG_PRESETS[template])throw Error('Modelo desconhecido');
  return {id,template,name:name||RIG_PRESETS[template].name,
    colors:{...RIG_PRESETS[template].colors},clips:createClips(template)};
}
export function newRigProject(){
  return {schema:RIG_SCHEMA,version:RIG_VERSION,
    characters:RIG_IDS.map(id=>newCharacter(id))};
}
function checkNumber(n,lo,hi,desc){
  if(!Number.isFinite(n)||n<lo||n>hi)throw Error('Valor inválido: '+desc);
  return n;
}
/** Validate imported JSON and rebuild a safe plain object without extra fields. */
export function validateRigProject(raw){
  if(!raw||raw.schema!==RIG_SCHEMA||raw.version!==RIG_VERSION||
    !Array.isArray(raw.characters)||raw.characters.length<1||raw.characters.length>64)
    throw Error('Formato rig2d incompatível (schema/version/characters).');
  const seen=new Set();
  const project={schema:RIG_SCHEMA,version:RIG_VERSION,characters:[]};
  for(const character of raw.characters){
    if(!character||typeof character.id!=='string'||!idPattern.test(character.id)||
      seen.has(character.id)||!RIG_PRESETS[character.template])throw Error('ID ou modelo de personagem inválido.');
    seen.add(character.id);
    const name=String(character.name||character.id).trim().slice(0,60);
    if(!name)throw Error('Nome do personagem vazio.');
    const colors={...RIG_PRESETS[character.template].colors};
    for(const key of Object.keys(colors)){
      if(character.colors?.[key]!==undefined){
        if(typeof character.colors[key]!=='string'||!colorPattern.test(character.colors[key]))
          throw Error('Cor inválida: '+key);
        colors[key]=character.colors[key];
      }
    }
    if(!Array.isArray(character.clips)||character.clips.length<1||character.clips.length>16)
      throw Error('O personagem precisa de 1 a 16 animações.');
    const clips=[];const usedClips=new Set();
    for(const clip of character.clips){
      if(!clip||typeof clip.id!=='string'||!idPattern.test(clip.id)||usedClips.has(clip.id))
        throw Error('Código de animação inválido ou duplicado.');
      usedClips.add(clip.id);
      const duration=checkNumber(clip.duration,.1,60,'duration');
      if(typeof clip.loop!=='boolean'||!Array.isArray(clip.frames)||
        clip.frames.length<1||clip.frames.length>180)throw Error('Keyframes inválidos.');
      const frames=[];let previous=-1;
      for(const frame of clip.frames){
        const time=checkNumber(frame?.time,0,duration,'time');
        if(time<=previous)throw Error('Os tempos dos keyframes devem ser crescentes.');
        previous=time;
        if(!frame.pose||typeof frame.pose!=='object'||Array.isArray(frame.pose))
          throw Error('Pose inválida.');
        const pose={};
        for(const [node,part] of Object.entries(frame.pose)){
          if(!NODES[node]||!part||typeof part!=='object'||Array.isArray(part))
            throw Error('Peça desconhecida: '+node);
          pose[node]={};
          for(const [key,value] of Object.entries(part)){
            if(!['x','y','rotation','scale'].includes(key))throw Error('Propriedade inválida: '+key);
            const ranges={x:[-90,90],y:[-90,90],rotation:[-180,180],scale:[.2,3]};
            const checked=checkNumber(value,...ranges[key],node+'.'+key);
            pose[node][key]=boundedRigValue(node,key,checked);
          }
        }
        frames.push({time,pose});
      }
      clips.push({id:clip.id,duration,loop:clip.loop,frames});
    }
    project.characters.push({id:character.id,template:character.template,name,colors,clips});
  }
  return project;
}
export function readRigProject(){
  try{
    const stored=globalThis.localStorage?.getItem(RIG_STORAGE);
    return stored?validateRigProject(JSON.parse(stored)):newRigProject();
  }catch{return newRigProject();}
}
export function storeRigProject(project){
  const safe=validateRigProject(project);
  globalThis.localStorage?.setItem(RIG_STORAGE,JSON.stringify(safe));
  return safe;
}
export function characterIdForActor(actor){
  if(actor?.classId)return 'hero.'+actor.classId;
  return 'monster.'+(actor?.type||'slime');
}
export function sampleClip(clip,time){
  const frames=clip?.frames||[];
  if(!frames.length)return {};
  const duration=clip.duration||1;
  const t=clip.loop?((time%duration)+duration)%duration:clamp(time,0,duration);
  // Avoid floating-point interpolation drift at the exact saved keyframe.
  for(const frame of frames)if(Math.abs(frame.time-t)<1e-9)return structuredClone(frame.pose);
  let a=frames[0],b=frames[frames.length-1];
  if(t<=a.time)return structuredClone(a.pose);
  if(t>=b.time)return structuredClone(b.pose);
  for(let i=1;i<frames.length;i++)if(t<=frames[i].time){a=frames[i-1];b=frames[i];break;}
  const k=clamp((t-a.time)/(b.time-a.time),0,1);
  const pose={};
  for(const node of new Set([...Object.keys(a.pose),...Object.keys(b.pose)])){
    pose[node]={};
    for(const field of ['x','y','rotation','scale']){
      if(a.pose[node]?.[field]===undefined&&b.pose[node]?.[field]===undefined)continue;
      const base=field==='scale'?1:0;
      const aa=a.pose[node]?.[field]??base,bb=b.pose[node]?.[field]??base;
      if(field==='rotation'){
        const diff=((bb-aa+540)%360)-180;
        pose[node][field]=aa+diff*k;
      }else pose[node][field]=aa+(bb-aa)*k;
    }
  }
  return pose;
}
export function findClip(character,action){
  return character?.clips.find(clip=>clip.id===action)||
    character?.clips.find(clip=>clip.id==='idle')||character?.clips[0];
}
export function sampleCharacter(character,action,time){
  return sampleClip(findClip(character,action),time);
}
