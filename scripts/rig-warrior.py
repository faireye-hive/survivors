"""Build a reproducible lightweight game rig from the finished static warrior.
Blender 5.3: blender -b --python-exit-code 1 -P scripts/rig-warrior.py
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/warrior'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(OUT/'fantasy-warrior.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
world=mesh.matrix_world.copy();mesh.parent=None;mesh.matrix_world=world
bpy.context.view_layer.objects.active=mesh
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh.name='Warrior_Game_Mesh'
# Game textures are independent copies; full-resolution studio maps stay untouched.
for material in mesh.data.materials:
 for node in material.node_tree.nodes:
  if node.type=='TEX_IMAGE' and node.image:
   original=node.image;color=original.colorspace_settings.name=='sRGB';resolution=2048 if color else 1024
   source='base-color.png' if color else 'normal.png' if 'normal' in original.name.lower() else 'orm.png'
   im=bpy.data.images.load(str(OUT/source),check_existing=False);im.colorspace_settings.name='sRGB' if color else 'Non-Color';node.image=im
   im.scale(resolution,resolution)
   name='game-base-color.png' if color else 'game-normal.png' if 'normal' in original.name.lower() else 'game-orm.png'
   im.filepath_raw=str(OUT/name);im.file_format='PNG';im.save();im.pack()
arm=bpy.data.armatures.new('Warrior_Skeleton');rig=bpy.data.objects.new('Warrior_Rig',arm);bpy.context.scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
specs={}
def bone(name,head,tail,parent=None):
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
 specs[name]=(Vector(head),Vector(tail));return b
bone('Hips',(0,0,.94),(0,0,1.08))
bone('Spine',(0,0,1.08),(0,0,1.25),'Hips')
bone('Chest',(0,0,1.25),(0,0,1.42),'Spine')
bone('Neck',(0,0,1.42),(0,0,1.49),'Chest')
bone('Head',(0,0,1.49),(0,0,1.72),'Neck')
for side,sign in [('L',1),('R',-1)]:
 bone('Clavicle.'+side,(sign*.04,0,1.36),(sign*.18,0,1.36),'Chest')
 bone('UpperArm.'+side,(sign*.18,0,1.36),(sign*.265,0,1.16),'Clavicle.'+side)
 bone('Forearm.'+side,(sign*.265,0,1.16),(sign*.335,-.01,.97),'UpperArm.'+side)
 bone('Hand.'+side,(sign*.335,-.01,.97),(sign*.33,-.02,.86),'Forearm.'+side)
 bone('Thigh.'+side,(sign*.12,0,.94),(sign*.15,0,.57),'Hips')
 bone('Shin.'+side,(sign*.15,0,.57),(sign*.17,0,.19),'Thigh.'+side)
 bone('Foot.'+side,(sign*.17,0,.19),(sign*.17,-.13,.065),'Shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
groups={name:mesh.vertex_groups.new(name=name) for name in specs}
def distance(point,name):
 a,b=specs[name];delta=b-a;t=max(0,min(1,(point-a).dot(delta)/delta.length_squared));return (point-a-delta*t).length

def nearest(point,names):
 pairs=sorted((distance(point,name),name) for name in names)[:3]
 weights=[(name,1/max(d,.018)**4) for d,name in pairs];total=sum(w for _,w in weights)
 return {name:w/total for name,w in weights}
for vertex in mesh.data.vertices:
 x,y,z=vertex.co;side='L' if x>=0 else 'R';ax=abs(x)
 arm_names=[n+'.'+side for n in ['Clavicle','UpperArm','Forearm','Hand']]
 # Pouch and belt remain on hips, not on the adjacent hanging hand.
 is_arm=z>.80 and z<1.44 and ax>(.18 if z>1.26 else .25) and min(distance(vertex.co,n) for n in arm_names)<.105
 if is_arm:
  candidates=arm_names+(['Chest'] if z>1.28 else [])
  weights=nearest(vertex.co,candidates)
 elif z<.9:
  weights=nearest(vertex.co,[n+'.'+side for n in ['Thigh','Shin','Foot']])
  hip=max(0,min(1,(z-.76)/.14))
  if ax<.045 and z>.74:hip=max(hip,.75)
  weights={n:w*(1-hip) for n,w in weights.items()};weights['Hips']=hip
 elif z>1.48:weights={'Head':1.}
 else:
  anchors=[(.95,'Hips'),(1.13,'Spine'),(1.33,'Chest'),(1.45,'Neck'),(1.49,'Head')]
  weights={'Hips':1.}
  for (za,na),(zb,nb) in zip(anchors,anchors[1:]):
   if za<=z<=zb:
    t=(z-za)/(zb-za);t=t*t*(3-2*t);weights={na:1-t,nb:t};break
 for name,value in weights.items():
  if value>1e-5:groups[name].add([vertex.index],value,'REPLACE')
mesh.parent=rig
mod=mesh.modifiers.new('Warrior_Skin','ARMATURE');mod.object=rig
rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
scene=bpy.context.scene;scene.render.fps=30
for action_name,end,step in [('Idle',60,10),('Walk',30,3),('Attack',12,2)]:
 action=bpy.data.actions.new(action_name);rig.animation_data.action=action
 for frame in range(0,end+1,step):
  phase=frame/end*2*math.pi
  for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
  if action_name=='Idle':
   rig.pose.bones['Chest'].rotation_euler.x=.012*math.sin(phase)
   rig.pose.bones['Head'].rotation_euler.z=.018*math.sin(phase)
   for side,sign in [('L',1),('R',-1)]:rig.pose.bones['UpperArm.'+side].rotation_euler.z=sign*.016*math.sin(phase)
  elif action_name=='Walk':
   rig.pose.bones['Hips'].location.y=.013*abs(math.sin(phase))
   for side,sign in [('L',1),('R',-1)]:
    swing=math.sin(phase)*sign
    rig.pose.bones['Thigh.'+side].rotation_euler.x=.38*swing
    rig.pose.bones['Shin.'+side].rotation_euler.x=-.48*max(0,-swing)
    rig.pose.bones['Foot.'+side].rotation_euler.x=.1*swing
    rig.pose.bones['UpperArm.'+side].rotation_euler.x=-.24*swing
    rig.pose.bones['Forearm.'+side].rotation_euler.x=-.12-.08*max(0,swing)
   rig.pose.bones['Chest'].rotation_euler.z=.035*math.sin(phase)
  else:
   strike=math.sin(math.pi*frame/end)
   rig.pose.bones['Chest'].rotation_euler.z=-.17*strike
   rig.pose.bones['UpperArm.R'].rotation_euler.x=1.2*strike
   rig.pose.bones['Forearm.R'].rotation_euler.x=.35*strike
   rig.pose.bones['Head'].rotation_euler.z=.08*strike
  for pb in rig.pose.bones:
   pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
   if pb.name=='Hips':pb.keyframe_insert('location',frame=frame,group=pb.name)
 action.use_fake_user=True
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
options=dict(filepath=str(OUT/'fantasy-warrior-game.glb'),export_format='GLB',use_selection=True,
 export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,
 export_frame_range=False,export_skins=True,export_all_influences=False,export_tangents=True)
props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys();options={k:v for k,v in options.items() if k in props}
bpy.ops.export_scene.gltf(**options)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/warrior/fantasy-warrior-rig.blend'),compress=True)
manifest=json.loads((OUT/'manifest.json').read_text());manifest['game']={'file':'fantasy-warrior-game.glb','rigged':True,'bones':len(specs),'animations':['Idle','Walk','Attack'],'baseColorResolution':2048,'dataMapResolution':1024,'bytes':(OUT/'fantasy-warrior-game.glb').stat().st_size}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['game']),flush=True)
