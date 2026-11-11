import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

let templatePromise;
function template(){
  if(!templatePromise){
    const base=import.meta.env?.BASE_URL??'/';
    templatePromise=new GLTFLoader().loadAsync(`${base}models/warrior/fantasy-warrior-game.glb`)
      .catch(error=>{templatePromise=null;throw error;});
  }
  return templatePromise;
}

// Clone bones per actor; geometry, textures and materials belong to the shared cache.
export function mountWarriorTemplate(root,gltf){
  if(root.userData.released)return false;
  for(const name of ['Idle','Walk','Attack'])if(!gltf.animations.some(clip=>clip.name===name))throw new Error('Warrior GLB requires Idle, Walk and Attack clips');
  const actor=clone(gltf.scene),model=new T.Group();model.add(actor);
  actor.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=false;}});
  const previous=root.userData.model;
  if(previous){
    model.position.copy(previous.position);model.quaternion.copy(previous.quaternion);
    previous.removeFromParent();previous.traverse(node=>{if(node.userData.ownGeometry)node.geometry.dispose();});
  }
  root.add(model);root.userData.model=model;delete root.userData.rig;
  const mixer=new T.AnimationMixer(actor),actions={};
  for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
  actions.Attack.setLoop(T.LoopOnce,1);actions.Attack.clampWhenFinished=true;actions.Attack.setDuration(.27);
  let current='Idle',lastTime=null,lastAttack=0;actions.Idle.play();
  root.userData.asset='fantasy-warrior';
  root.userData.animateWarrior=(actorState,time)=>{
    const dt=lastTime===null?0:T.MathUtils.clamp(time-lastTime,0,.1);lastTime=time;
    const moving=Math.hypot(actorState.vx||0,actorState.vy||0)>4,attack=actorState.attackPose||0;
    const next=attack>0?'Attack':moving?'Walk':'Idle';
    if(next!==current||next==='Attack'&&attack>lastAttack+.03){
      actions[current].fadeOut(.06);actions[next].reset().fadeIn(.06).play();current=next;
    }
    lastAttack=attack;mixer.update(dt);
  };
  root.userData.releaseWarrior=()=>{
    mixer.stopAllAction();mixer.uncacheRoot(actor);
    const skeletons=new Set();actor.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);});
    for(const skeleton of skeletons)skeleton.dispose();
    delete root.userData.animateWarrior;delete root.userData.releaseWarrior;
  };
  return true;
}

export function attachDetailedWarrior(root){
  // Node tests and server-side geometry generation keep the synchronous fallback.
  if(typeof window==='undefined')return root;
  root.userData.assetLoading=true;
  template().then(gltf=>mountWarriorTemplate(root,gltf)).catch(error=>{
    if(!root.userData.released){root.userData.assetError=error.message;console.warn('Guerreiro detalhado indisponível; usando modelo procedural.',error);}
  }).finally(()=>{root.userData.assetLoading=false;});
  return root;
}

export function releaseWarriorActor(root){
  root.userData.released=true;root.userData.releaseWarrior?.();
}
