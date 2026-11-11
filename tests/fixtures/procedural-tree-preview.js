import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createProceduralTree,regenerateProceduralTree,disposeProceduralTree} from '../../src/render/three/assets/ProceduralTree.js';

const canvas=document.querySelector('#model'),stage=canvas.parentElement;
const stats=document.querySelector('#stats'),error=document.querySelector('#error');
const scene=new T.Scene();scene.background=new T.Color('#293d37');scene.fog=new T.Fog('#293d37',14,26);
const camera=new T.PerspectiveCamera(38,1,.1,50);camera.position.set(6,4.6,8);
const gpu=new T.WebGLRenderer({canvas,antialias:true});gpu.outputColorSpace=T.SRGBColorSpace;
gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=1.1;gpu.shadowMap.enabled=true;gpu.shadowMap.type=T.PCFShadowMap;
scene.add(new T.HemisphereLight('#e3f4e9','#3b433b',2.1));
const sun=new T.DirectionalLight('#ffe1b0',3.0);sun.position.set(-6,10,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;scene.add(sun);
const ground=new T.Mesh(new T.CircleGeometry(8,64),new T.MeshStandardMaterial({color:'#506e52',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,1.7,0);orbit.minDistance=3;orbit.maxDistance=19;orbit.maxPolarAngle=Math.PI*.49;orbit.update();
let tree=createProceduralTree();scene.add(tree);
function render(){
  gpu.render(scene,camera);
  let tris=0;tree.traverse(n=>{if(n.isMesh)tris+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;});
  const size=new T.Box3().setFromObject(tree).getSize(new T.Vector3());
  stats.textContent=`${Math.round(tris)} triângulos · ${tree.children.length} materiais\n${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m\nSeed: ${tree.userData.parameters.seed}`;
}
const observer=new ResizeObserver(()=>{
  const bounds=stage.getBoundingClientRect();gpu.setPixelRatio(Math.min(devicePixelRatio,2));gpu.setSize(bounds.width,bounds.height,false);
  camera.aspect=bounds.width/bounds.height;camera.updateProjectionMatrix();render();
});observer.observe(stage);orbit.addEventListener('change',render);
const ids=['height','age','canopySpread','leafDensity','lean'];
function updateLabels(){for(const id of ids)document.getElementById(id+'-val').textContent=document.getElementById(id).value;}
function inputs(){const p={seed:document.querySelector('#seed').value,quality:document.querySelector('#quality').value,leafColor:document.querySelector('#leafColor').value};for(const id of ids)p[id]=Number(document.getElementById(id).value);return p;}
function apply(){try{regenerateProceduralTree(tree,inputs());orbit.target.y=tree.userData.parameters.height*.5;orbit.update();error.textContent='';render();}catch(e){error.textContent=e.message;}}
for(const id of ids){document.getElementById(id).addEventListener('input',updateLabels);document.getElementById(id).addEventListener('change',apply);}
for(const id of ['leafColor','quality'])document.getElementById(id).addEventListener('change',apply);
document.querySelector('#regenerate').addEventListener('click',apply);
document.querySelector('#export').addEventListener('click',async e=>{
  e.target.disabled=true;
  try{
    const buffer=await new GLTFExporter().parseAsync(tree,{binary:true});
    const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));
    const a=document.createElement('a');a.href=url;a.download='procedural-tree.glb';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);error.textContent='';
  }catch(e){error.textContent=e.message;}finally{e.target.disabled=false;}
});
window.addEventListener('error',e=>error.textContent=e.message);
window.addEventListener('unhandledrejection',e=>error.textContent=String(e.reason));
window.addEventListener('beforeunload',()=>{observer.disconnect();disposeProceduralTree(tree);gpu.dispose();});
updateLabels();render();