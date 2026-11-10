"""Tripo rigged NPC GLB -> src/models/<name>.glb: keep the generated body mesh only, name it Body, JPEG textures."""
import bpy, sys
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not o.name.startswith('tripo_node'):
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for i, o in enumerate(meshes): o.name = 'Body' if i == 0 else f'Body{i}'
print('MESHES', len(meshes), 'VERTS', sum(len(o.data.vertices) for o in meshes))
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=86, export_animations=False, export_apply=False)
print('EXPORTED', out)
