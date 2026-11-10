"""Print bones, frame range and rest hips height of each Mixamo FBX, plus the hero rig's bones, as JSON lines."""
import bpy, sys, os, json
folder, hero = sys.argv[sys.argv.index('--') + 1:][:2]

def armature():
    return next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=hero)
a = armature()
print('HERO', json.dumps({'bones': [b.name for b in a.data.bones], 'hips': list((a.matrix_world @ a.data.bones['mixamorig:Hips'].head_local)[:])}))
for name in sorted(os.listdir(folder)):
    if not name.endswith('.fbx'): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(folder, name))
    a = armature(); act = a.animation_data.action if a.animation_data else None
    meshes = sum(o.type == 'MESH' for o in bpy.context.scene.objects)
    hips = next(b for b in a.data.bones if b.name.endswith('Hips'))
    print('FBX', json.dumps({'file': name, 'bones': len(a.data.bones), 'first': hips.name, 'meshes': meshes,
                             'range': list(act.frame_range) if act else None, 'fps': bpy.context.scene.render.fps,
                             'hips': [round(v, 3) for v in (a.matrix_world @ hips.head_local)]}))
