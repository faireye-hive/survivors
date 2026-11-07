/**
 * Fit the current rig in the Studio Canvas without leaving an empty strip
 * below the feet. Shared by the rendered preview, pointer picking and PNG.
 * All coordinates are CSS pixels (the caller handles device pixel ratio).
 */
import {getRigHandles} from '../render/characters/RigRenderer.js';

const BOXES=Object.freeze({
  body:[-31,-35,31,24],head:[-25,-27,25,20],
  eyeL:[-4,-5,4,5],eyeR:[-4,-5,4,5],mouth:[-6,-5,6,5],
  armL:[-35,-24,35,24],armR:[-35,-24,35,24],
  handL:[-9,-10,9,11],handR:[-9,-10,9,11],
  legL:[-14,-9,14,24],legR:[-14,-9,14,24],
  footL:[-12,-9,12,9],footR:[-12,-9,12,9],
  weapon:[-15,-41,15,17]
});
const CONSTRAINTS=Object.freeze({top:16,bottom:14,side:18});

/** Determine the actual bounding rectangle of this keyframe's visible rig. */
export function rigViewBounds(character,pose={}){
  const joints=getRigHandles(pose,character);
  let minX=-22,minY=-24,maxX=22,maxY=8;
  for(const [id,j] of Object.entries(joints)){
    // Slime's head is a facial anchor inside its body, not a second shell.
    if(id==='head'&&character?.template==='monster.slime')continue;
    const box=BOXES[id]||[-8,-8,8,8];
    const cs=Math.cos(j.rotation),sn=Math.sin(j.rotation);
    for(const lx of [box[0],box[2]])for(const ly of [box[1],box[3]]){
      const x=j.x+(lx*cs-ly*sn)*j.scale;
      const y=j.y+(lx*sn+ly*cs)*j.scale;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
  }
  return {minX,minY,maxX,maxY};
}

/**
 * viewport.zoom is the Canvas transform preceding drawRigActor; the
 * colossus then applies its own x1.65 renderer scale.
 * Fit is only a reduction: user's zoom preference remains unchanged.
 */
export function studioViewport(w,h,requestedZoom,character,pose={}){
  const width=Math.max(1,w),height=Math.max(1,h);
  const bounds=rigViewBounds(character,pose);
  const shapeScale=character?.template==='monster.colossus'?1.65:1;
  const preference=character?.template==='monster.colossus'
    ?requestedZoom*.61:requestedZoom;
  const geometryWidth=Math.max(1,(bounds.maxX-bounds.minX)*shapeScale);
  const geometryHeight=Math.max(1,(bounds.maxY-bounds.minY)*shapeScale);
  const availableWidth=Math.max(1,width-CONSTRAINTS.side*2);
  const availableHeight=Math.max(1,height-CONSTRAINTS.top-CONSTRAINTS.bottom);
  const zoom=Math.min(preference,availableWidth/geometryWidth,availableHeight/geometryHeight);
  const total=zoom*shapeScale;
  const x=width*.5-(bounds.minX+bounds.maxX)*.5*total;
  // Position the lowest visible pixel just above the timeline, not 20% up
  // the canvas. This also works when preview is smaller due to auto-fit.
  const y=height-CONSTRAINTS.bottom-bounds.maxY*total;
  return {x,y,zoom,scale:total,bounds};
}
