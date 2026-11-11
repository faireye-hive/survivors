import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const canvas=document.querySelector('#warrior'),stage=canvas.parentElement;
const status=document.querySelector('#status'),error=document.querySelector('#error'),loading=document.querySelector('#load');
const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.01,50);
const gpu=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
gpu.setPixelRatio(Math.min(devicePixelRatio,2));gpu.outputColorSpace=T.SRGBColorSpace;
gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=1.08;
gpu.shadowMap.enabled=true;gpu.shadowMap.type=T.PCFSoftShadowMap;
const pmrem=new T.PMREMGenerator(gpu),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.38;
room.dispose();pmrem.dispose();
const hemi=new T.HemisphereLight('#f0f1ff','#323348',1.25);scene.add(hemi);
const key=new T.DirectionalLight('#fff0dc',2.6);key.position.set(-3,5,4);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-1.6,right:1.6,top:2.5,bottom:-1,near:.1,far:12});key.shadow.normalBias=.003;scene.add(key);
const rim=new T.DirectionalLight('#c5d9ff',2);rim.position.set(2,3,-3);scene.add(rim);
const fill=new T.DirectionalLight('#e0e6ff',.7);fill.position.set(3,2,3);scene.add(fill);
const plinth=new T.Mesh(new T.CylinderGeometry(.62,.64,.04,96),new T.MeshStandardMaterial({color:'#242e40',roughness:.8,metalness:.15}));
plinth.position.y=-.024;plinth.receiveShadow=true;scene.add(plinth);
const ring=new T.Mesh(new T.TorusGeometry(.626,.002,6,96),new T.MeshStandardMaterial({color:'#a78c5e',roughness:.45,metalness:.65}));
ring.rotation.x=Math.PI/2;ring.position.y=-.007;scene.add(ring);
const controls=new OrbitControls(camera,canvas);controls.minDistance=.55;controls.maxDistance=6;controls.maxPolarAngle=Math.PI*.56;
controls.enableDamping=true;controls.dampingFactor=.09;controls.autoRotateSpeed=.6;
const clay=new T.MeshStandardMaterial({color:'#a7a5a2',roughness:.8});
const wire=new T.MeshBasicMaterial({color:'#c6ba93',wireframe:true});
let model=null,triangles=0,request=0,currentView='three',raf=0,mixer=null,clips=[];
const clock=new T.Clock();
const originals=new Map();
function disposeModel(root){
  if(!root)return;root.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  root.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);if(node.isMesh){geometries.add(node.geometry);const mat=originals.get(node)||node.material;for(const m of Array.isArray(mat)?mat:[mat])materials.add(m);originals.delete(node);}});
  for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}
  for(const skeleton of skeletons)skeleton.dispose();for(const g of geometries)g.dispose();for(const t of textures)t.dispose();
}
function setSurface(){
  const mode=document.querySelector('#surface').value;
  model?.traverse(node=>{if(node.isMesh)node.material=mode==='clay'?clay:mode==='wire'?wire:originals.get(node);});
}
function view(name){
  currentView=name;controls.autoRotate=false;document.querySelector('#rotate').setAttribute('aria-pressed','false');
  const narrow=stage.clientWidth<600,dist=narrow?4.8:4.1;
  controls.target.set(0,['face','profile'].includes(name)?1.59:.94,0);
  if(name==='face')camera.position.set(.035,1.62,1.2);
  else if(name==='profile')camera.position.set(1.2,1.62,.02);
  else if(name==='back')camera.position.set(0,1.1,-dist);
  else if(name==='front')camera.position.set(0,1.08,dist);
  else camera.position.set(dist*.36,1.28,dist*.94);
  controls.update();
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
}
async function load(){
  const id=++request,quality=document.querySelector('#quality').value;
  const url=new URL(`models/warrior/fantasy-warrior${quality==='high'?'-high':quality==='game'?'-game':''}.glb`,document.baseURI).href;
  loading.hidden=false;error.textContent='';
  try{
    const gltf=await new GLTFLoader().loadAsync(url);
    if(id!==request){disposeModel(gltf.scene);return;}
    const next=gltf.scene;let count=0;
    next.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=false;originals.set(node,node.material);count+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;for(const m of Array.isArray(node.material)?node.material:[node.material])for(const value of Object.values(m))if(value?.isTexture)value.anisotropy=Math.min(8,gpu.capabilities.getMaxAnisotropy());}});
    mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);disposeModel(model);model=next;clips=gltf.animations;mixer=clips.length?new T.AnimationMixer(model):null;setAnimation();triangles=count;scene.add(model);setSurface();
    const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
    status.textContent=`${triangles.toLocaleString('pt-BR')} triângulos\n${size.y.toFixed(2).replace('.',',')} m de altura · 1 material\nTexturas incorporadas ao GLB`;
    document.querySelector('#download').href=url;loading.hidden=true;
  }catch(e){if(id===request){loading.hidden=true;error.textContent=`Não foi possível carregar o modelo: ${e.message}`;}}
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>view(button.dataset.view)));
document.querySelector('#rotate').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
document.querySelector('#surface').addEventListener('change',setSurface);
document.querySelector('#quality').addEventListener('change',load);
function setAnimation(){
  const select=document.querySelector('#animation');select.disabled=!mixer;mixer?.stopAllAction();
  const clip=clips.find(c=>c.name===select.value);if(clip)mixer.clipAction(clip).reset().play();
}
document.querySelector('#animation').addEventListener('change',setAnimation);
document.querySelector('#light').addEventListener('change',e=>{
  const neutral=e.target.value==='neutral';key.color.set(neutral?'#ffffff':'#fff0dc');rim.color.set(neutral?'#ffffff':'#c5d9ff');fill.color.set(neutral?'#ffffff':'#e0e6ff');hemi.color.set(neutral?'#ffffff':'#f0f1ff');
});
const resize=new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();gpu.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(stage);
view('three');load();
function animate(){raf=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.1);if(document.hidden)return;mixer?.update(dt);controls.update();gpu.render(scene,camera);}animate();
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);resize.disconnect();controls.dispose();mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);disposeModel(model);clay.dispose();wire.dispose();plinth.geometry.dispose();plinth.material.dispose();ring.geometry.dispose();ring.material.dispose();environment.dispose();gpu.dispose();},{once:true});
