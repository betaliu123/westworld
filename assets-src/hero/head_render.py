"""Close renders of the built hero's head (hat hidden) from front and side, textured, for checking the scalp."""
import bpy, sys, math
path, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name == 'Hat': o.hide_render = True
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
head = arm.data.bones['mixamorig:Head'].head_local
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.color_type = 'TEXTURE'
sc.display.shading.light = 'FLAT'
sc.render.resolution_x = sc.render.resolution_y = 400
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = .3
for name, ang in [('front', 0), ('side', 90), ('back', 180)]:
    a = math.radians(ang)
    cam.location = (head.x + .6 * math.sin(a), head.y - .6 * math.cos(a), head.z + .05)
    cam.rotation_euler = (math.pi / 2, 0, a)
    sc.render.filepath = f'{out}-{name}.png'
    bpy.ops.render.render(write_still=True)
