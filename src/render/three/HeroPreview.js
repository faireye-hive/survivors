import * as T from 'three';
import {humanoid,animateActor,part,group} from './Models.js';
import {releaseWarriorActor} from './assets/WarriorActor.js';

// The class picker dresses the same articulated hero in three equipment sets.
export class HeroPreview{
  constructor(canvas){
    this.canvas=canvas;this.gpu=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
    this.gpu.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    this.gpu.outputColorSpace=T.SRGBColorSpace;this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.3;
    this.scene=new T.Scene();this.scene.add(new T.HemisphereLight('#e6f1e4','#23453d',3));
    const light=new T.DirectionalLight('#ffe1a1',4);light.position.set(-3,5,4);this.scene.add(light);
    const rim=new T.DirectionalLight('#8bdded',2);rim.position.set(3,3,-3);this.scene.add(rim);
    this.camera=new T.PerspectiveCamera(35,1,.1,20);this.camera.position.set(2,1.8,4.3);this.camera.lookAt(0,1,0);
    const platform=group(this.scene);part(platform,'cylinder','#24453f',[0,-.07,0],[.85,.12,.85]);
    const ring=part(platform,'ring','#adcbab',[0,0,0],[.78,.78,.78],true);ring.rotation.x=-Math.PI/2;
    this.setForm('guardian');
    this.animate=now=>{
      this.raf=requestAnimationFrame(this.animate);if(this.canvas.closest('[hidden]')||document.hidden)return;
      const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
      if(w!==this.width||h!==this.height){this.width=w;this.height=h;this.gpu.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
      animateActor(this.actor,{vx:0,vy:0,facing:.75+Math.sin(now*.00035)*.6},now/1000);
      this.canvas.dataset.heroModel=this.actor.userData.asset||'procedural';
      this.gpu.render(this.scene,this.camera);
    };this.raf=requestAnimationFrame(this.animate);
  }
  releaseActor(){if(this.actor){releaseWarriorActor(this.actor);this.scene.remove(this.actor);this.actor.traverse(o=>{if(o.userData.ownGeometry)o.geometry.dispose();});}}
  setForm(form){if(this.form===form)return;this.releaseActor();this.actor=humanoid(form);this.scene.add(this.actor);this.form=form;this.canvas.setAttribute('aria-label','Herói 3D · '+({guardian:'Guerreiro',mage:'Arcanista',ranger:'Andarilho'}[form]||form));}
  capture(){
    const w=this.width||360,h=this.height||190;this.gpu.setSize(w,h,false);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.gpu.render(this.scene,this.camera);
    return this.canvas.toDataURL('image/png');
  }
  destroy(){cancelAnimationFrame(this.raf);this.releaseActor();this.gpu.dispose();}
}
