/* 3D Procedural Artist — reference implementation. MIT-style use: copy/adapt freely.
 * Requires a compatible Three.js instance passed as the first argument.
 * Y-up, 1 world unit = 1 meter. All geometry created in JS, no external model assets.
 */

function stoneMat(T, color) {
  return new T.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0.0 });
}
function woodMat(T, color) {
  return new T.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.0 });
}

function mesh(T, geom, material, parent, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geom, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(T, parent, mat, w, h, d, x = 0, y = 0, z = 0) {
  return mesh(T, new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
}
function seedNoise(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

/** A 6-sided hard-surface beveled/tapered block made as custom BufferGeometry. */
function taperedPrism(T, w, h, d, inset = 0.12) {
  const b = [
    [-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]
  ];
  const t = [
    [-w/2+inset,h,-d/2+inset], [w/2-inset,h,-d/2+inset],
    [w/2-inset,h,d/2-inset], [-w/2+inset,h,d/2-inset]
  ];
  const quads = [
    [b[0],b[1],b[2],b[3]], [t[3],t[2],t[1],t[0]],
    [b[1],b[0],t[0],t[1]], [b[2],b[1],t[1],t[2]],
    [b[3],b[2],t[2],t[3]], [b[0],b[3],t[3],t[0]]
  ];
  const pos=[];
  for (const q of quads) {
    for (const i of [0,1,2,0,2,3]) pos.push(...q[i]);
  }
  // Deliberately explicit UVs per quad (does not depend on vertex welds).
  const goodUv=[];
  for (let q=0;q<quads.length;q++) goodUv.push(0,0, 1,0, 1,1, 0,0, 1,1, 0,1);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(goodUv,2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/** True 2D stone arch opening, extruded with depth, not a painted rectangle. */
function gateArch(T, fullWidth, fullHeight, depth, openingWidth, springY) {
  const w=fullWidth/2, r=openingWidth/2;
  const outline = new T.Shape();
  // Concave perimeter creates an open-bottom arch without a touching/crossing hole.
  outline.moveTo(-w,0); outline.lineTo(-r,0); outline.lineTo(-r,springY);
  outline.absarc(0,springY,r,Math.PI,0,true);
  outline.lineTo(r,0); outline.lineTo(w,0); outline.lineTo(w,fullHeight);
  outline.lineTo(-w,fullHeight); outline.closePath();
  const geo = new T.ExtrudeGeometry(outline, {
    depth, steps: 1, bevelEnabled: true, bevelThickness: 0.045,
    bevelSize: 0.045, bevelSegments: 1, curveSegments: 12
  });
  geo.translate(0,0,-depth/2);
  return geo;
}

/** Solid sloped roof panel, explicitly triangulated with outward-oriented faces. */
function roofPanel(T, corners, thickness=0.13) {
  const lower = corners.map(p => [p[0],p[1]-thickness,p[2]]);
  const verts=[...corners,...lower];
  const faces=[ [0,1,2,3], [7,6,5,4], [0,4,5,1],
    [1,5,6,2], [2,6,7,3], [3,7,4,0] ];
  const pos=[], uv=[];
  for (const face of faces) {
    for (const i of [0,1,2,0,2,3]) {
      pos.push(...verts[face[i]]);
    }
    uv.push(0,0,1,0,1,1,0,0,1,1,0,1);
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}

function makeWall(T, parent, materials, len, center, angle, threshold, random) {
  const root = new T.Group(); root.position.set(...center); root.rotation.y=angle;
  parent.add(root);
  // foundation and recessed plinth
  const stone = materials.wall;
  box(T,root,materials.foundation,len+.24,.62,1.38,0,.31,0);
  const body = new T.Group(); body.name='stone-wall'; root.add(body);
  const s=new T.Shape(); s.moveTo(-len/2,0); s.lineTo(len/2,0);
  s.lineTo(len/2,3.05); s.lineTo(-len/2,3.05); s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:1.03, bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:1});
  g.translate(0,0,-.515);
  mesh(T,g,stone,body,0,.53,0);
  // alternating joints visible from either side. Inset quoin blocks create depth.
  const spacing=1.08;
  const joints=[];
  for(let j=1;j<=3;j++) {
    const y=.62+j*.75;
    box(T,body,materials.mortar,len,.037,1.13,0,y,0);
    for(let x=-len/2+(j%2)*spacing/2; x<len/2-.1; x+=spacing) {
      joints.push([x,y+.30,.58],[x,y+.30,-.58]);
    }
  }
  // One instanced batch replaces hundreds of individual mortar seam draw calls.
  const jointGeom = new T.BoxGeometry(.035,.68,.02);
  const jointBatch = new T.InstancedMesh(jointGeom,materials.mortar,joints.length);
  const jtemp = new T.Object3D();
  joints.forEach(([x,y,z],i)=>{
    jtemp.position.set(x,y,z);jtemp.updateMatrix();jointBatch.setMatrixAt(i,jtemp.matrix);
  });
  body.add(jointBatch);
  const buttressPositions=[];
  for(let x=-len/2+1.25;x<len/2-.4;x+=3.5) {
    buttressPositions.push([x,.52,.63],[x,.52,-.63]);
  }
  const buttressBatch=new T.InstancedMesh(taperedPrism(T,.85,2.55,.9,.15),
    materials.quoin,buttressPositions.length);
  buttressBatch.castShadow=true;buttressBatch.receiveShadow=true;
  buttressPositions.forEach(([x,y,z],i)=>{
    jtemp.position.set(x,y,z);jtemp.rotation.y=0;
    jtemp.updateMatrix();buttressBatch.setMatrixAt(i,jtemp.matrix);
  });
  body.add(buttressBatch);
  const top = new T.Group(); top.name='battlements'; root.add(top);
  box(T,top,materials.cap,len+.32,.24,1.34,0,3.63,0);
  const n=Math.max(3,Math.floor(len/1.0));
  const merlonGeom=new T.BoxGeometry(.62,.76,1.13);
  const inst = new T.InstancedMesh(merlonGeom,materials.quoin,Math.ceil(n/2));
  inst.castShadow=true; inst.receiveShadow=true;
  const temp=new T.Object3D();
  for(let i=0,k=0;i<n;i+=2,k++) {
    temp.position.set(-len/2+(i+.5)*len/n,4.13,0);
    temp.updateMatrix(); inst.setMatrixAt(k,temp.matrix);
  }
  top.add(inst);
  body.userData.revealAt = threshold;
  top.userData.revealAt = Math.min(1,threshold+.15);
  return [body,top];
}

function tower(T,parent,mat,x,z,random) {
  const foundation=new T.Group(), body=new T.Group(), top=new T.Group();
  for(const g of [foundation,body,top]) {g.position.set(x,0,z);parent.add(g);}
  const stone=mat.wall;
  const base=mesh(T,new T.CylinderGeometry(1.85,2.15,.67,10),mat.foundation,foundation,0,.34,0);
  base.rotation.y=Math.PI/10;
  mesh(T,new T.CylinderGeometry(1.60,1.83,4.9,10),stone,body,0,3.04,0).rotation.y=Math.PI/10;
  mesh(T,new T.CylinderGeometry(1.77,1.72,.35,10),mat.cap,top,0,5.58,0).rotation.y=Math.PI/10;
  // polygonal rim with spaced crenellations; positions computed from same ring.
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5; const rad=1.62;
    const m=box(T,top,mat.quoin,.8,.77,.37,Math.sin(a)*rad,6.05,Math.cos(a)*rad);
    m.rotation.y=a;
  }
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5;
    const inset=1.67;
    box(T,body,mat.mortar,.025,.13,.38,Math.sin(a)*inset,3.05,Math.cos(a)*inset).rotation.y=a;
  }
  foundation.userData.revealAt=.16;
  body.userData.revealAt=.57+random()*.075;
  top.userData.revealAt=.82;
  return [foundation,body,top];
}

function doorLeaf(T,parent,materials,hinge,dir) {
  const pivot=new T.Group(); pivot.position.set(hinge,0,0);
  pivot.rotation.y=dir*.85;
  parent.add(pivot);
  const width=1.12;
  for(let i=0;i<5;i++) {
    box(T,pivot,materials.wood,width/5+.008,2.5,.14,dir*(i+.5)*width/5,1.25,0);
  }
  for(const y of [.42,1.28,2.09]) {
    box(T,pivot,materials.iron,width,.125,.17,dir*width/2,y,-.01);
  }
  box(T,pivot,materials.iron,.10,.32,.24,dir*.12,1.23,.10);
  return pivot;
}

function house(T,parent,materials,x,z,random) {
  const width=6.1, depth=5.2, h=2.9, apex=5.15, over=.44;
  const root=new T.Group(); root.position.set(x,0,z); parent.add(root);
  const groups=[0.14,0.33,0.54,0.73,0.89,0.97].map(t=>{
    const g=new T.Group();g.userData.revealAt=t;root.add(g);return g;
  });
  const [foundation,frames,walls,roof,trim,finish]=groups;
  box(T,foundation,materials.foundation,width+.35,.36,depth+.35,0,.18,0);
  // Uprights and heavy lintels establish true timber-frame structure.
  for(const side of [-1,1]) for(const end of [-1,1]) {
    box(T,frames,materials.wood,.28,h,.28,side*width/2,h/2+.35,end*depth/2);
    box(T,frames,materials.wood,.24,.26,depth+.36,side*width/2,h+.32,0);
  }
  for(const end of [-1,1]) box(T,frames,materials.wood,width+.25,.27,.25,0,h+.32,end*depth/2);
  for(const side of [-1,1]) box(T,walls,materials.plaster,.14,h-.15,depth-.40,side*width/2,h/2+.40,0);
  box(T,walls,materials.plaster,width-.42,h-.15,.16,0,h/2+.4,-depth/2);
  // Front façade has a REAL doorway: no solid wall behind the frame.
  const doorway=1.35;
  const partWidth=(width-.42-doorway)/2;
  const leftX=-(doorway/2+partWidth/2), rightX=-leftX;
  for(const xSide of [leftX,rightX]) {
    box(T,walls,materials.plaster,partWidth,h-.15,.17,xSide,h/2+.4,depth/2);
  }
  box(T,walls,materials.plaster,doorway,.62,.17,0,h-.62/2+.3,depth/2);
  // Solid gable infill prevents daylight leaking beneath the roof peak.
  const gableProfile=new T.Shape();
  gableProfile.moveTo(-width/2,h+.25); gableProfile.lineTo(width/2,h+.25);
  gableProfile.lineTo(0,apex-.18); gableProfile.closePath();
  for (const end of [-1,1]) {
    const geo=new T.ExtrudeGeometry(gableProfile,{depth:.17,bevelEnabled:false});
    mesh(T,geo,materials.plaster,walls,0,0,end*depth/2-.085);
  }
  // Door frame and panel are separate (door can be animated by the game).
  box(T,trim,materials.wood,.19,2.29,.31,-doorway/2,1.5,depth/2+.08);
  box(T,trim,materials.wood,.19,2.29,.31,doorway/2,1.5,depth/2+.08);
  box(T,trim,materials.wood,doorway+.24,.19,.32,0,2.57,depth/2+.08);
  box(T,finish,materials.wood,doorway-.15,2.08,.15,0,1.42,depth/2+.09);
  // Chimney and small decorative mullioned windows.
  for(const bx of [-2.1,2.1]) {
    box(T,trim,materials.wood,.93,.14,.24,bx,1.85,depth/2+.17);
    box(T,trim,materials.wood,.93,.14,.24,bx,1.02,depth/2+.17);
    box(T,trim,materials.wood,.14,.88,.24,bx-.48,1.43,depth/2+.17);
    box(T,trim,materials.wood,.14,.88,.24,bx+.48,1.43,depth/2+.17);
    box(T,trim,materials.window,.72,.65,.05,bx,1.43,depth/2+.19);
    box(T,trim,materials.wood,.075,.72,.09,bx,1.43,depth/2+.235);
  }
  // Hand-built roof geometry: two thick inclined mesh panels with overhanging eaves.
  const X=width/2+over, Z=depth/2+over, eave=h+.45;
  const L=[[0,apex,Z],[0,apex,-Z],[-X,eave,-Z],[-X,eave,Z]];
  const R=[[X,eave,Z],[X,eave,-Z],[0,apex,-Z],[0,apex,Z]];
  mesh(T,roofPanel(T,L),materials.roof,roof);
  mesh(T,roofPanel(T,R),materials.roof,roof);
  box(T,roof,materials.wood,.25,.25,2*Z+.1,0,apex,0);
  // Exposed rafters give depth to the roof's outline.
  for(const front of [-1,1]) for(const side of [-1,1]) {
    const a=new T.Vector3(0,apex,front*Z), b=new T.Vector3(side*X,eave,front*Z);
    const v=b.clone().sub(a);
    const beam=box(T,trim,materials.wood,.13,v.length(),.18,0,0,0);
    beam.position.copy(a.clone().add(b).multiplyScalar(.5));
    beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());
  }
  // Roof shingle seams: pitched lines parallel to ridge, subtle and inexpensive.
  for(let i=1;i<=7;i++) {
    const t=i/8;
    const y=apex+(eave-apex)*t+.012;
    for (const side of [-1,1]) {
      box(T,trim,materials.roofEdge,.044,.044,depth+2*over,side*X*t,y,0);
    }
  }
  box(T,finish,materials.stoneAccent,.83,.48,.73,1.8,apex-.27,-1.05);
  root.userData.category='workshop';
  return root;
}

/**
 * @param {object} THREE - imported Three.js namespace
 * @param {object} opts - {size:22, seed:3, progress:1}
 * @returns {THREE.Group} fortress root containing staged geometry
 */
export function createFortress(THREE, opts={}) {
  if (!THREE?.Group || !THREE?.ExtrudeGeometry) throw new TypeError('A compatible Three.js namespace is required');
  const size = Math.max(17,Math.min(36, Number(opts.size ?? 22)));
  const random=seedNoise(opts.seed ?? 42);
  const root=new THREE.Group(); root.name='Procedural Survival Base';
  root.userData={THREE,stageGroups:[],stages:[],assetId:'survival-base-v1',
    category:'fortification',units:'meters',seed:opts.seed ?? 42,
    bounds:{width:size+4,depth:size+4,height:6.5}};
  const materials={
    wall:stoneMat(THREE,0x8c8b81),
    foundation:stoneMat(THREE,0x60645c),
    mortar:stoneMat(THREE,0x4f5751),
    quoin:stoneMat(THREE,0xa4a597),
    cap:stoneMat(THREE,0xaaa99e),
    stoneAccent:stoneMat(THREE,0x9b9786),
    wood:woodMat(THREE,0x684631),
    plaster:stoneMat(THREE,0xc5b99b),
    roof:stoneMat(THREE,0x444b55),
    roofEdge:stoneMat(THREE,0x323941),
    iron:new THREE.MeshStandardMaterial({color:0x262d33,roughness:.61,metalness:.7}),
    window:new THREE.MeshStandardMaterial({color:0x477588,roughness:.22,metalness:.1}),
    blueprint:new THREE.MeshStandardMaterial({color:0xb8a66b,roughness:1,transparent:true,opacity:.65})
  };
  root.userData.materials=materials;
  const s=size/2;
  const guides=new THREE.Group(); guides.name='site-markers'; root.add(guides);
  // Deliberately visible building site at zero progress.
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    box(THREE,guides,materials.blueprint,.26,.4,.26,sx*s,.22,sz*s);
  }
  const paths=materials.blueprint;
  for(const side of [-1,1]) {
    box(THREE,guides,paths,size,.065,.10,0,.04,side*s);
    box(THREE,guides,paths,.10,.065,size,side*s,.04,0);
  }
  guides.userData.showUntil=.27;
  // Main wall ring with real gate opening in front (+Z).
  const wallGroup=new THREE.Group(); root.add(wallGroup);
  const segmentThresholds=[.30,.35,.40,.44,.48];
  const gateW=5.0;
  const frontPart=(size-gateW)/2;
  for(const sign of [-1,1]) {
    const x=sign*(gateW/2+frontPart/2);
    root.userData.stageGroups.push(...makeWall(THREE,wallGroup,materials,frontPart,[x,0,s],0,segmentThresholds[sign===-1?0:1],random));
  }
  root.userData.stageGroups.push(...makeWall(THREE,wallGroup,materials,size, [0,0,-s],0,.39,random));
  for(const sign of [-1,1]) {
    root.userData.stageGroups.push(...makeWall(THREE,wallGroup,materials,size,[sign*s,0,0],Math.PI/2,.46,random));
  }
  const gateFoundation=new THREE.Group(); gateFoundation.userData.revealAt=.16; root.add(gateFoundation);
  box(THREE,gateFoundation,materials.foundation,5.2,.39,1.68,0,.195,s);
  const gateFrame=new THREE.Group(); gateFrame.position.z=s; gateFrame.userData.revealAt=.66; root.add(gateFrame);
  mesh(THREE,gateArch(THREE,5.0,4.75,1.28,2.8,2.50),materials.quoin,gateFrame);
  box(THREE,gateFrame,materials.cap,5.4,.30,1.46,0,4.77,0);
  const gateLeaves=new THREE.Group();gateLeaves.position.z=s;gateLeaves.userData.revealAt=.94;root.add(gateLeaves);
  doorLeaf(THREE,gateLeaves,materials,-1.32,-1);
  doorLeaf(THREE,gateLeaves,materials,1.32,1);
  const gateMerlons=new THREE.Group(); gateMerlons.userData.revealAt=.91; gateMerlons.position.z=s;root.add(gateMerlons);
  for(let i=-2;i<=2;i++) box(THREE,gateMerlons,materials.quoin,.66,.76,1.11,i*1.0,5.30,0);
  root.userData.stageGroups.push(gateFoundation,gateFrame,gateLeaves,gateMerlons);
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    root.userData.stageGroups.push(...tower(THREE,root,materials,sx*s,sz*s,random));
  }
  const workshop=house(THREE,root,materials,3.65,-3.5,random);
  root.userData.stageGroups.push(...workshop.children);
  // Lumber and masonry supplies briefly visible during construction.
  const supplies=new THREE.Group(); supplies.name='resource-supplies'; supplies.position.set(-4,0,5);root.add(supplies);
  for(let i=0;i<4;i++){
    box(THREE,supplies,materials.wood,1.2,.25,.3,(i%2)*.35,.25+Math.floor(i/2)*.30,i*.15);
  }
  for(let i=0;i<6;i++) {
    const b=box(THREE,supplies,materials.foundation,.48,.35,.53,i*.33,0.23,-1.25+Math.floor(i/3)*.55);
    b.rotation.y=(random()-.5)*.3;
  }
  supplies.userData.showUntil=.60;
  root.userData.hideAfter=[guides,supplies];
  setFortressProgress(root,opts.progress ?? 1);
  return root;
}

/** Idempotent, discrete physical construction sequence from 0 (site) to 1 (complete). */
export function setFortressProgress(root, progress) {
  const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
  for(const g of root.userData.stageGroups ?? []) g.visible=p >= g.userData.revealAt-1e-9;
  for(const g of root.userData.hideAfter ?? []) g.visible=p <= g.userData.showUntil+1e-9;
  root.userData.progress=p;
  return root;
}

/** Dispose only this generated asset; its materials and geometries belong to it. */
export function disposeFortress(root) {
  const geos=new Set(), mats=new Set();
  root.traverse(obj=>{
    if(obj.geometry) geos.add(obj.geometry);
    if(obj.material) for(const m of (Array.isArray(obj.material)?obj.material:[obj.material])) mats.add(m);
  });
  geos.forEach(g=>g.dispose()); mats.forEach(m=>m.dispose());
  root.removeFromParent();
}