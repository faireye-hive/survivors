import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAetherOre,regenerateAetherOre} from '../../src/render/three/assets/AetherOre.js';

const canvas=document.querySelector('#model'),stage=canvas.parentElement,status=document.querySelector('#status'),error=document.querySelector('#error');
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.05,40);
camera.position.set(3.5,2.6,4.7);
const gpu=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
gpu.setPixelRatio(Math.min(devicePixelRatio,2));gpu.outputColorSpace=T.SRGBColorSpace;
gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=1.1;
gpu.shadowMap.enabled=true;gpu.shadowMap.type=T.PCFShadowMap;
const hemi=new T.HemisphereLight('#deefec','#253333',2);scene.add(hemi);
const sun=new T.DirectionalLight('#ffddb0',3.4);sun.position.set(-3,6,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});sun.shadow.normalBias=.012;scene.add(sun);
const rim=new T.DirectionalLight('#b2e6e2',1.5);rim.position.set(3,3,-4);scene.add(rim);
const ground=new T.Mesh(new T.CylinderGeometry(1.85,1.85,.08,80),new T.MeshStandardMaterial({color:'#263a3a',roughness:1,metalness:0}));
ground.position.y=-.045;ground.receiveShadow=true;scene.add(ground);
const lip=new T.Mesh(new T.TorusGeometry(1.87,.008,4,100),new T.MeshBasicMaterial({color:'#64877b'}));lip.rotation.x=Math.PI/2;lip.position.y=-.035;scene.add(lip);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.55,0);controls.minDistance=2.4;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.47;controls.update();
let ore=createAetherOre(),imported=false;scene.add(ore);
function render(){
  gpu.render(scene,camera);
  let triangles=0,meshes=0;ore.traverse(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;meshes++;}});
  const bounds=new T.Box3().setFromObject(ore).getSize(new T.Vector3());
  status.textContent=`${imported?'GLB reaberto':'Fonte procedural'}\n${triangles} triângulos · ${meshes} materiais\n${bounds.x.toFixed(2)} × ${bounds.y.toFixed(2)} × ${bounds.z.toFixed(2)} m\n${gpu.info.memory.geometries} geometrias na cena`;
}
function release(root){
  root.removeFromParent();const geometries=new Set(),materials=new Set();
  root.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const m of (Array.isArray(n.material)?n.material:[n.material]))materials.add(m);}});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
const resize=new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();gpu.setSize(width,height,false);camera.aspect=width/height;camera.zoom=width<760?.82:1;camera.updateProjectionMatrix();render();});resize.observe(stage);
controls.addEventListener('change',render);
function inputs(){return {seed:document.querySelector('#seed').value,scale:Number(document.querySelector('#scale').value),weathering:Number(document.querySelector('#weathering').value),crystalAmount:Number(document.querySelector('#crystalAmount').value),crystalColor:document.querySelector('#crystalColor').value};}
function apply(){
  try{
    const p=inputs();
    if(imported){const next=createAetherOre(p);next.position.copy(ore.position);next.quaternion.copy(ore.quaternion);release(ore);ore=next;scene.add(ore);imported=false;}
    else regenerateAetherOre(ore,p);
    error.textContent='';document.querySelector('#compare').textContent='Abrir modelo exportado';render();
  }catch(e){error.textContent=e.message;}
}
document.querySelector('#regenerate').addEventListener('click',apply);
for(const id of ['scale','weathering','crystalAmount']){
  document.querySelector(`#${id}`).addEventListener('input',e=>{
    const value=Number(e.target.value);document.querySelector(`#${id}-value`).textContent=id==='scale'?`${value.toFixed(2)}×`:`${Math.round(value*100)}%`;
  });
  document.querySelector(`#${id}`).addEventListener('change',apply);
}
document.querySelector('#crystalColor').addEventListener('change',apply);
document.querySelector('#lighting').addEventListener('change',e=>{
  const neutral=e.target.value==='neutral';sun.color.set(neutral?'#ffffff':'#ffddb0');rim.color.set(neutral?'#ffffff':'#b2e6e2');hemi.color.set(neutral?'#ffffff':'#deefec');render();
});
document.querySelector('#compare').addEventListener('click',async e=>{
  try{
    const result=await new GLTFLoader().loadAsync('/models/aether-ore.glb');
    result.scene.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
    release(ore);ore=result.scene;scene.add(ore);imported=true;error.textContent='';e.target.textContent='GLB reaberto · aplique para voltar';render();
  }catch(e){error.textContent=`Não foi possível reabrir o GLB: ${e.message}`;}
});
document.querySelector('#export').addEventListener('click',async e=>{
  const button=e.target;button.disabled=true;
  try{
    const buffer=await new GLTFExporter().parseAsync(ore,{binary:true});
    const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'})),a=document.createElement('a');
    a.href=url;a.download='aether-ore.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);error.textContent='';
  }catch(e){error.textContent=e.message;}finally{button.disabled=false;}
});
window.addEventListener('error',e=>{error.textContent=e.message;});
window.addEventListener('unhandledrejection',e=>{error.textContent=String(e.reason);});
render();
