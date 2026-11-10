"""Compare rest and frame-1 world directions of arm/leg bones between the hero rig and a Mixamo FBX."""
import bpy, sys
hero, fbx = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=hero)
tgt = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bpy.ops.import_scene.fbx(filepath=fbx)
src = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o != tgt)
bpy.context.scene.frame_set(1)
fmt = lambda v: '(%+.2f %+.2f %+.2f)' % tuple(v.normalized())
for name in ['mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:Spine', 'mixamorig:LeftUpLeg']:
    out = []
    for o in (tgt, src):
        b, pb = o.data.bones[name], o.pose.bones[name]
        rest = o.matrix_world.to_3x3() @ (b.tail_local - b.head_local)
        posed = o.matrix_world.to_3x3() @ (pb.tail - pb.head)
        out.append(f'rest {fmt(rest)} posed {fmt(posed)}')
    print('DIR', name, '| hero', out[0], '| fbx', out[1])
print('POSEBASIS', [(pb.name, [round(x, 3) for x in pb.rotation_quaternion]) for pb in tgt.pose.bones if pb.rotation_quaternion.angle > .05][:8])
