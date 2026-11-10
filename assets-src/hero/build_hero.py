"""Tripo hero GLB -> src/models/hero.glb: drop stray meshes, split the straw hat into its own skinned mesh."""
import bpy, bmesh, sys, math
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
HAIR_FROM, HAIR_BLEND, HAIR_TONE = .905, .02, .14
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not o.name.startswith('tripo_node'):
        bpy.data.objects.remove(o, do_unlink=True)
body = next(o for o in bpy.data.objects if o.type == 'MESH')
body.name = 'Body'
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
head = arm.data.bones['mixamorig:Head'].head_local
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
seen, hat = set(), []
for v in bm.verts:
    if v.index in seen: continue
    stack, members = [v], []
    seen.add(v.index)
    while stack:
        cur = stack.pop(); members.append(cur)
        for e in cur.link_edges:
            o = e.other_vert(cur)
            if o.index not in seen: seen.add(o.index); stack.append(o)
    low = min(m.co.z for m in members)
    reach = max(math.hypot(m.co.x - head.x, m.co.y - head.y) for m in members)
    if (low > .862 and reach > .1) or low > .93:
        hat.extend(m.index for m in members)
bm.free()
print('HAT_VERTS', len(hat), 'OF', len(body.data.vertices))
bpy.context.view_layer.objects.active = body
for o in bpy.data.objects: o.select_set(o == body)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for i in hat: body.data.vertices[i].select = True
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
for o in bpy.data.objects:
    if o.type == 'MESH' and o != body: o.name = 'Hat'
# The scalp was hidden under the hat when generated and came out bare; darken it into hair.
hair = body.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for v in body.data.vertices:
    near = math.hypot(v.co.x - head.x, v.co.y - head.y) < .12
    t = min(1, max(0, (v.co.z - HAIR_FROM) / HAIR_BLEND)) if near else 0
    k = 1 - t * (1 - HAIR_TONE)
    hair.data[v.index].color = (k, k, k, 1)
body.data.color_attributes.active_color = hair
# The skull top is open under the hat: close it with a hair cap and topknot riding the Head bone.
from mathutils import Matrix
cap = bmesh.new()
for (cx, cy, cz), (rx, ry, rz) in [((head.x - .004, head.y, .902), (.063, .057, .057)),
                                   ((head.x - .012, head.y, .965), (.022, .02, .02))]:
    made = bmesh.ops.create_uvsphere(cap, u_segments=20, v_segments=12, radius=1)
    bmesh.ops.transform(cap, verts=made['verts'], matrix=Matrix.Translation((cx, cy, cz)) @ Matrix.Diagonal((rx, ry, rz, 1)))
mesh = bpy.data.meshes.new('Hair'); cap.to_mesh(mesh); cap.free()
for p in mesh.polygons: p.use_smooth = True
ink = bpy.data.materials.new('Hair'); ink.use_nodes = True
shader = ink.node_tree.nodes['Principled BSDF']
shader.inputs['Base Color'].default_value = (.035, .032, .03, 1); shader.inputs['Roughness'].default_value = 1
mesh.materials.append(ink)
cap_obj = bpy.data.objects.new('Hair', mesh); bpy.context.scene.collection.objects.link(cap_obj)
bone = arm.pose.bones['mixamorig:Head']
cap_obj.parent, cap_obj.parent_type, cap_obj.parent_bone = arm, 'BONE', bone.name
cap_obj.matrix_parent_inverse = (arm.matrix_world @ bone.matrix @ Matrix.Translation((0, bone.bone.length, 0))).inverted()

# Mixamo clips (same mixamorig bone names) are retargeted by world-space rotation relative to each rig's own
# rest pose, so differing bone axes don't matter; hips travel is scaled by hips height, with linear drift removed.
def world_rot(obj, m):
    return (obj.matrix_world.to_3x3().normalized() @ m.to_3x3().normalized()).to_quaternion()

def retarget(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    added = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in added if o.type == 'ARMATURE')
    for o in added:
        if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    start, end = (int(f) for f in src.animation_data.action.frame_range)
    bones = sorted((b for b in arm.data.bones if b.name in src.data.bones), key=lambda b: len(b.parent_recursive))
    src_rest = {b.name: world_rot(src, src.data.bones[b.name].matrix_local) for b in bones}
    tgt_rest = {b.name: world_rot(arm, b.matrix_local) for b in bones}
    arm_rot = arm.matrix_world.to_3x3().normalized().to_quaternion()
    def across(o):
        side = o.matrix_world @ o.data.bones['mixamorig:LeftUpLeg'].head_local - o.matrix_world @ o.data.bones['mixamorig:RightUpLeg'].head_local
        side.z = 0
        return side.normalized()
    face = across(src).rotation_difference(across(arm))
    src_rest = {k: face @ q for k, q in src_rest.items()}
    hips_src = src.matrix_world @ src.data.bones['mixamorig:Hips'].head_local
    ratio = (arm.matrix_world @ arm.data.bones['mixamorig:Hips'].head_local).z / hips_src.z
    frames, scene = [], bpy.context.scene
    for f in range(start, end + 1):
        scene.frame_set(f)
        pose = {}
        for b in bones:
            want = arm_rot.inverted() @ face @ world_rot(src, src.pose.bones[b.name].matrix) @ src_rest[b.name].inverted() @ tgt_rest[b.name]
            pose[b.name] = want
        hips = src.matrix_world @ src.pose.bones['mixamorig:Hips'].head
        frames.append((pose, face @ ((hips - hips_src) * ratio)))
    drift = (frames[-1][1] - frames[0][1]) / max(1, len(frames) - 1)
    act = bpy.data.actions.new(name)
    arm.animation_data_create(); arm.animation_data.action = act
    last = {}
    for i, (pose, travel) in enumerate(frames):
        for b in bones:
            pb = arm.pose.bones[b.name]; pb.rotation_mode = 'QUATERNION'
            rest = b.matrix_local.to_quaternion()
            if b.parent:
                prest = b.parent.matrix_local.to_quaternion()
                local = (pose[b.parent.name] @ prest.inverted() @ rest).inverted() @ pose[b.name]
            else:
                local = rest.inverted() @ pose[b.name]
            if b.name in last and last[b.name].dot(local) < 0: local.negate()
            last[b.name] = local
            pb.rotation_quaternion = local
            pb.keyframe_insert('rotation_quaternion', frame=i)
            if not b.parent:
                move = travel - drift * i
                move.z = travel.z
                pb.location = rest.inverted() @ (arm_rot.inverted() @ move)
                pb.keyframe_insert('location', frame=i)
    arm.animation_data.action = None
    track = arm.animation_data.nla_tracks.new(); track.name = name
    track.strips.new(name, 0, act)
    bpy.data.objects.remove(src, do_unlink=True)
    print('CLIP', name, len(frames), 'frames')

CLIPS = ['idle', 'idle_weightshift', 'walk', 'crouch_idle', 'crouch_walk', 'sit_idle', 'sit_talk', 'talk', 'argue', 'question']
clip_dir = sys.argv[sys.argv.index('--') + 3] if len(sys.argv) > sys.argv.index('--') + 3 else None
if clip_dir:
    import os
    bpy.context.scene.render.fps = 30
    for name in CLIPS: retarget(os.path.join(clip_dir, name + '.fbx'), name)
    for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=86,
                          export_animations=bool(clip_dir), export_animation_mode='NLA_TRACKS', export_optimize_animation_size=True,
                          export_apply=False, export_vertex_color='ACTIVE')
print('EXPORTED', out)
