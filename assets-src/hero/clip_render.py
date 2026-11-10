"""Render chosen frames of the built hero's clips side-on and front-on, to check retargeted poses."""
import bpy, sys, math
path, out = sys.argv[sys.argv.index('--') + 1:][:2]
SHOTS = [('walk', 8), ('walk', 24), ('crouch_walk', 8), ('sit_idle', 40), ('talk', 60), ('idle', 1)]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.animation_data_create()
for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'
sc.render.resolution_x, sc.render.resolution_y = 300, 360
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.4
print('ACTIONS', [a.name for a in bpy.data.actions])
for clip, frame in SHOTS:
    act = next(a for a in bpy.data.actions if a.name.startswith(clip) and not a.name.startswith(clip + '_'))
    arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    sc.frame_set(frame)
    for view, ang in [('side', 90), ('front', 0)]:
        a = math.radians(ang)
        cam.location = (3 * math.sin(a), -3 * math.cos(a), .5); cam.rotation_euler = (math.pi / 2, 0, a)
        sc.render.filepath = f'{out}{clip}-{frame}-{view}.png'
        bpy.ops.render.render(write_still=True)
