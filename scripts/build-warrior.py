"""Refine a supplied GLB with registered paint projections; run with Blender.
All generated files belong to the output directory. The supplied GLB is read-only.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--sample', required=True, type=Path)
p.add_argument('--output', type=Path, default=ROOT / 'public/models/warrior')
p.add_argument('--paint', type=Path, default=ROOT / 'assets/warrior')
p.add_argument('--resolution', type=int, choices=[1024, 2048, 4096], default=4096)
p.add_argument('--ratio', type=float, default=.24)
p.add_argument('--nose-depth', type=float, default=.018, help='Additional stylized nose projection in meters, 0–0.035')
p.add_argument('--render', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
if not .08 <= a.ratio <= 1:
    p.error('--ratio must be within [0.08, 1]')
if not 0 <= a.nose_depth <= .035:
    p.error('--nose-depth must be within [0, .035]')
if not a.sample.is_file():
    p.error('input GLB does not exist')
a.output.mkdir(parents=True, exist_ok=True)
# This generator creates a new scene, never edits the user's source scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.bake.margin = 12
scene.render.bake.use_clear = True
scene.render.bake.margin_type = 'EXTEND'
scene.render.resolution_x, scene.render.resolution_y = 900, 1100
scene.render.resolution_percentage = 100
bpy.ops.import_scene.gltf(filepath=str(a.sample.resolve()))
objects = [o for o in scene.objects if o.type == 'MESH']
if len(objects) != 1:
    raise ValueError('This registered projection recipe expects the supplied single-mesh sample.')
high = objects[0]
high.name = 'Warrior_High_Source'
# Remove the glTF root without losing its transform, normalize in meters, ground at zero.
mat = high.matrix_world.copy()
high.parent = None
high.matrix_world = mat
bpy.context.view_layer.objects.active = high
bpy.ops.object.select_all(action='DESELECT')
high.select_set(True)
high.scale *= 1.85 / high.dimensions.z
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
high.location.z -= min(v.co.z for v in high.data.vertices)
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
# Sculpt an integrated bridge, tip and alar wings below the long center fringe.
# Restrict the deformation to facial skin; front hair locks remain untouched.
for vertex in high.data.vertices:
    x, y, z = vertex.co
    if abs(x) < .045 and 1.505 < z < 1.605 and -.108 < y < -.045:
        tip = math.exp(-((x/.012)**2 + ((z-1.543)/.014)**2)*1.4)
        bridge = .32*math.exp(-((x/.008)**2 + ((z-1.562)/.026)**2)*1.4)
        wings = .16*sum(math.exp(-(((x-side*.012)/.006)**2 + ((z-1.536)/.008)**2)*1.5) for side in (-1,1))
        vertex.co.y -= a.nose_depth*(tip+bridge+wings)
high.data.update()
for face in high.data.polygons:
    face.use_smooth = True
original_uv = high.data.uv_layers.active.name
source_triangles = sum(len(f.vertices) - 2 for f in high.data.polygons)
material = high.data.materials[0]
material.name = 'Warrior_Painted_PBR'
nt = material.node_tree
nodes, links = nt.nodes, nt.links
bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
original_color = bsdf.inputs['Base Color'].links[0].from_socket
original_metal = bsdf.inputs['Metallic'].links[0].from_socket
original_rough = bsdf.inputs['Roughness'].links[0].from_socket
# Keep existing UVs explicit: projection layers must never become the original texture UV.
uv = nodes.new('ShaderNodeUVMap'); uv.uv_map = original_uv
for n in list(nodes):
    if n.type == 'TEX_IMAGE':
        links.new(uv.outputs['UV'], n.inputs['Vector'])
# Material fallback on occluded surfaces and nearly grazing angles.
hsv = nodes.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = 1.16
links.new(original_color, hsv.inputs['Color'])
color_socket = hsv.outputs['Color']

bpy.ops.object.camera_add()
cam = bpy.context.object
cam.name = 'Projection_Camera'
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.12
scene.camera = cam
bvh = BVHTree.FromPolygons([v.co for v in high.data.vertices], [f.vertices[:] for f in high.data.polygons])

def smoothstep(lo, hi, v):
    t = min(1., max(0., (v - lo) / (hi - lo)))
    return t * t * (3. - 2. * t)

# Back paint has a slightly different vertical registration, recorded explicitly.
for label, location, vertical_scale, vertical_offset in [
    ('front', (0, -4, 1.05), 1., 0.),
    ('back', (0, 4, 1.05), .9633, .0481),
]:
    cam.location = location
    cam.rotation_euler = (Vector((0, 0, .94)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    direction = cam.rotation_euler.to_matrix() @ Vector((0, 0, 1))
    layer = high.data.uv_layers.new(name='Paint_' + label)
    attribute = high.data.attributes.new('visibility_' + label, 'FLOAT', 'POINT')
    projected, weights = [], []
    for vertex in high.data.vertices:
        point = vertex.co
        pos = world_to_camera_view(scene, cam, point)
        projected.append((pos.x, pos.y * vertical_scale + vertical_offset))
        # The supplied reconstruction has a thin inner shell with overlapping UVs.
        # Paint both sides of this shell consistently; depth still rejects other limbs.
        facing = abs(vertex.normal.dot(direction))
        weight = smoothstep(.12, .68, facing)
        if weight > 0:
            # Occlusion prevents the face being painted onto hair backs or arms onto torso.
            hit, _, _, distance = bvh.ray_cast(point + direction * 3, -direction, 3.01)
            weight *= 0. if hit is None else 1. - smoothstep(.025, .045, (hit-point).length)
        weights.append(weight)
    # Batch attribute writes: editing one value invalidates Blender's normal cache.
    # Never interleave these writes with vertex.normal reads on a dense sculpt.
    attribute.data.foreach_set('value', weights)
    layer.data.foreach_set('uv', [component for loop in high.data.loops for component in projected[loop.vertex_index]])
    print('REGISTERED', label, flush=True)
    uv_node = nodes.new('ShaderNodeUVMap'); uv_node.uv_map = layer.name
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str((a.paint / (label + '-paint.png')).resolve()))
    tex.extension = 'EXTEND'
    links.new(uv_node.outputs['UV'], tex.inputs['Vector'])
    mask = nodes.new('ShaderNodeAttribute'); mask.attribute_name = attribute.name
    # Reject the neutral studio backdrop where generated silhouettes differ slightly.
    # Silver paint falls back to the original hardware, retaining neutral metal color.
    saturation = nodes.new('ShaderNodeSeparateColor'); saturation.mode = 'HSV'
    links.new(tex.outputs['Color'], saturation.inputs[0])
    chroma = nodes.new('ShaderNodeMapRange')
    chroma.inputs['From Min'].default_value=.065; chroma.inputs['From Max'].default_value=.16
    links.new(saturation.outputs[1],chroma.inputs['Value'])
    visible = nodes.new('ShaderNodeMath'); visible.operation='MULTIPLY'
    links.new(mask.outputs['Fac'],visible.inputs[0]);links.new(chroma.outputs[0],visible.inputs[1])
    mix = nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MIX'
    links.new(visible.outputs[0], mix.inputs[0])
    links.new(color_socket, mix.inputs[1]); links.new(tex.outputs['Color'], mix.inputs[2])
    color_socket = mix.outputs[0]

high.data.uv_layers.active = high.data.uv_layers[original_uv]
high.data.uv_layers[original_uv].active_render = True
bpy.ops.object.select_all(action='DESELECT'); high.select_set(True)
bpy.context.view_layer.objects.active = high

def target_image(name, resolution, data=False):
    im = bpy.data.images.new(name, width=resolution, height=resolution, alpha=False)
    if data: im.colorspace_settings.name = 'Non-Color'
    node = nodes.new('ShaderNodeTexImage'); node.image = im
    links.new(uv.outputs['UV'], node.inputs['Vector'])
    for n in nodes: n.select = False
    node.select = True; nodes.active = node
    return im, node

def save_image(im, name):
    im.filepath_raw = str(a.output / name); im.file_format = 'PNG'; im.save(); im.pack()

emission = nodes.new('ShaderNodeEmission')
links.new(color_socket, emission.inputs['Color']); links.new(emission.outputs[0], out.inputs['Surface'])
albedo, albedo_node = target_image('Warrior_BaseColor', a.resolution)
bpy.ops.object.bake(type='EMIT')
save_image(albedo, 'base-color-high.png')
print('BAKED COLOR', flush=True)
# Consolidated roughness/metalness map. Neutral skin and cloth remain dielectric;
# imported metal mask identifies the sculpted hardware, never the skin/hair hue.
rough = nodes.new('ShaderNodeMapRange')
rough.inputs['From Min'].default_value = .28; rough.inputs['From Max'].default_value = .68
rough.inputs['To Min'].default_value = .3; rough.inputs['To Max'].default_value = .79
links.new(original_rough, rough.inputs['Value'])
metal = nodes.new('ShaderNodeMath'); metal.operation = 'MULTIPLY'; metal.inputs[1].default_value = 1.15; metal.use_clamp = True
links.new(original_metal, metal.inputs[0])
combine = nodes.new('ShaderNodeCombineColor'); combine.mode = 'RGB'; combine.inputs[0].default_value = 1.
links.new(rough.outputs[0], combine.inputs[1]); links.new(metal.outputs[0], combine.inputs[2])
links.new(combine.outputs[0], emission.inputs['Color'])
mr, mr_node = target_image('Warrior_ORM', 2048, True)
bpy.ops.object.bake(type='EMIT'); save_image(mr, 'orm-high.png')
links.new(bsdf.outputs[0], out.inputs['Surface'])
links.new(albedo_node.outputs['Color'], bsdf.inputs['Base Color'])
links.new(rough.outputs[0], bsdf.inputs['Roughness']); links.new(metal.outputs[0], bsdf.inputs['Metallic'])

# Bake original sculpt normals to the reduced mesh without changing its UV atlas.
low = high.copy(); low.data = high.data.copy(); scene.collection.objects.link(low)
low.name = 'Fantasy_Warrior'
low.data.materials.clear()
low_mat = bpy.data.materials.new('Warrior_Final_PBR'); low_mat.use_nodes = True
low.data.materials.append(low_mat)
bpy.ops.object.select_all(action='DESELECT'); low.select_set(True); bpy.context.view_layer.objects.active = low
# glTF stores a separate vertex at each UV seam. Collapse must operate on welded
# geometry, while per-loop UVs stay independent, or every island can tear open.
bm = bmesh.new(); bm.from_mesh(low.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000002)
bm.to_mesh(low.data); bm.free(); low.data.update()
low.data.validate(clean_customdata=True)
modifier = low.modifiers.new('Silhouette_preserving_reduction', 'DECIMATE'); modifier.ratio = a.ratio
bpy.ops.object.modifier_apply(modifier=modifier.name)
low.data.validate(clean_customdata=True)
for layer in list(low.data.uv_layers): low.data.uv_layers.remove(layer)
for attr in list(low.data.attributes):
    if attr.name.startswith('visibility_'): low.data.attributes.remove(attr)
low.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.003, area_weight=.2)
bpy.ops.object.mode_set(mode='OBJECT')
ln = low_mat.node_tree.nodes; ll = low_mat.node_tree.links
lb = next(n for n in ln if n.type == 'BSDF_PRINCIPLED')
low_albedo=bpy.data.images.new('Warrior_Optimized_BaseColor',width=a.resolution,height=a.resolution,alpha=False)
lcolor = ln.new('ShaderNodeTexImage'); lcolor.image = low_albedo
ll.new(lcolor.outputs['Color'], lb.inputs['Base Color'])
low_mr=bpy.data.images.new('Warrior_Optimized_ORM',width=2048,height=2048,alpha=False)
low_mr.colorspace_settings.name='Non-Color'
lorm = ln.new('ShaderNodeTexImage'); lorm.image = low_mr
sep = ln.new('ShaderNodeSeparateColor'); sep.mode = 'RGB'; ll.new(lorm.outputs['Color'], sep.inputs[0])
ll.new(sep.outputs[1], lb.inputs['Roughness']); ll.new(sep.outputs[2], lb.inputs['Metallic'])
high.select_set(True)
links.new(emission.outputs[0],out.inputs['Surface'])
for source_socket,target,name in [(albedo_node.outputs['Color'],lcolor,'base-color.png'),(mr_node.outputs['Color'],lorm,'orm.png')]:
    links.new(source_socket,emission.inputs['Color'])
    for n in ln:n.select=False
    saved_links=[(link.from_socket,link.to_socket) for link in list(target.outputs['Color'].links)]
    for link in list(target.outputs['Color'].links):ll.remove(link)
    target.select=True;ln.active=target
    bpy.ops.object.bake(type='EMIT',use_selected_to_active=True,cage_extrusion=.004,max_ray_distance=.015,margin=12)
    save_image(target.image,name)
    for from_socket,to_socket in saved_links:ll.new(from_socket,to_socket)
links.new(bsdf.outputs[0],out.inputs['Surface'])
normal = bpy.data.images.new('Warrior_Normal', width=2048, height=2048, alpha=False)
normal.colorspace_settings.name = 'Non-Color'
normal_node = ln.new('ShaderNodeTexImage'); normal_node.image = normal
for n in ln: n.select = False
normal_node.select = True; ln.active = normal_node
high.select_set(True)
bpy.ops.object.bake(type='NORMAL', use_selected_to_active=True, cage_extrusion=.004, max_ray_distance=.015, normal_space='TANGENT', margin=12)
save_image(normal, 'normal.png')
normal_map = ln.new('ShaderNodeNormalMap'); normal_map.inputs['Strength'].default_value = .75
ll.new(normal_node.outputs['Color'], normal_map.inputs['Color']); ll.new(normal_map.outputs[0], lb.inputs['Normal'])
print('BAKED NORMAL', flush=True)
# Source and optimized asset share the same painted material; normals only apply to low mesh.
high.hide_render = True; high.hide_set(True)
low['asset'] = 'Fantasy Warrior'; low['height_m'] = 1.85
low['source'] = a.sample.name
low['texture_workflow'] = 'Visibility-masked front/back paint projections baked to original UVs'
low['rigged'] = False
low['seed'] = 0
bpy.ops.object.select_all(action='DESELECT'); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.export_scene.gltf(filepath=str(a.output / 'fantasy-warrior.glb'), export_format='GLB', use_selection=True,
    export_yup=True, export_texcoords=True, export_normals=True, export_tangents=True,
    export_materials='EXPORT', export_image_format='AUTO', export_animations=False, export_extras=True)
# Export the full sculpt with the same baked paint, without the low-resolution normal map.
bpy.ops.object.select_all(action='DESELECT'); high.hide_set(False); high.select_set(True); bpy.context.view_layer.objects.active = high
high.data.materials.clear(); hm = low_mat.copy(); hm.name = 'Warrior_High_PBR'
high.data.materials.append(hm)
for node in hm.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image==low_albedo:node.image=albedo
    elif node.type=='TEX_IMAGE' and node.image==low_mr:node.image=mr
hb = next(n for n in hm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
for link in list(hb.inputs['Normal'].links): hm.node_tree.links.remove(link)
bpy.ops.export_scene.gltf(filepath=str(a.output / 'fantasy-warrior-high.glb'), export_format='GLB', use_selection=True,
    export_yup=True, export_texcoords=True, export_normals=True, export_tangents=True,
    export_materials='EXPORT', export_image_format='AUTO', export_animations=False)
high.hide_set(True)
# Source project keeps its projection graph and original UVs editable.
high.data.materials.clear(); high.data.materials.append(material)
low.select_set(True); bpy.context.view_layer.objects.active = low
summary = {'name':'Fantasy Warrior', 'source':a.sample.name, 'heightMeters':1.85, 'upAxis':'Y',
    'forwardAxis':'+Z', 'pivot':'ground center', 'rigged':False, 'animations':[], 'seed':0,
    'blender':bpy.app.version_string, 'sourceTriangles':source_triangles,
    'triangles':sum(len(f.vertices)-2 for f in low.data.polygons),
    'vertices':len(low.data.vertices), 'reductionRatio':a.ratio,
    'noseProjectionAddedMeters':a.nose_depth,
    'textures':{'baseColor':f'{a.resolution}x{a.resolution} sRGB', 'normal':'2048x2048 tangent +Y', 'orm':'2048x2048 linear, R=1/G=roughness/B=metallic'},
    'limitations':['Original single-mesh topology retained; not animation retopology.', 'Front/back projection paint blends to original texture on occluded and grazing surfaces.', 'No skeleton or animations.']}
(a.output/'manifest.json').write_text(json.dumps(summary,indent=2)+'\n')
# Studio preview is separate from the exported asset.
world = bpy.data.worlds.new('Studio'); world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.14,.19,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.world = world
scene.view_settings.view_transform = 'AgX'
for name,loc,power,size,color in [('Key',(-3,-4,5),350,4,(1,.93,.84)),('Fill',(3,-2,3),180,3,(.83,.9,1)),('Rim',(1,3,4),450,3,(.7,.83,1))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=.59, depth=.035, location=(0,0,-.023))
ground=bpy.context.object; ground.name='Display_Plinth'
gm=bpy.data.materials.new('Plinth');gm.diffuse_color=(.025,.036,.052,1);ground.data.materials.append(gm)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.042)); floor=bpy.context.object;floor.name='Studio_Floor';floor.data.materials.append(gm)
cam.location=(2,-4,1.35);cam.rotation_euler=(Vector((0,0,.94))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1200;scene.render.resolution_y=1450;scene.cycles.samples=48
# Pack inputs and output maps for a portable editable .blend.
for im in bpy.data.images:
    if im.source=='FILE' and not im.packed_file: im.pack()
bpy.ops.object.select_all(action='DESELECT');low.select_set(True);bpy.context.view_layer.objects.active=low
source_dir=ROOT/'assets/warrior';source_dir.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source_dir/'fantasy-warrior.blend'),compress=True)
if a.render:
    for label,loc in [('front',(0,-4,1.05)),('three-quarter',(2,-4,1.35)),('back',(0,4,1.05))]:
        cam.location=loc;cam.rotation_euler=(Vector((0,0,.94))-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(ROOT/'docs/previews'/('warrior-'+label+'.png'))
        bpy.ops.render.render(write_still=True)
    for label,loc in [('face',(0,-3,1.61)),('profile',(3,-.04,1.61))]:
        cam.data.ortho_scale=.63;cam.location=loc
        cam.rotation_euler=(Vector((0,0,1.59))-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(ROOT/'docs/previews'/('warrior-'+label+'.png'))
        bpy.ops.render.render(write_still=True)
print(json.dumps(summary),flush=True)
