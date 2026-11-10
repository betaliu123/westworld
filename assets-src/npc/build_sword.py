"""Tripo sword GLB -> src/models/sword.glb laid out like the procedural sword: guard at the origin,
grip toward +Y, blade toward -Y, blade width along X, overall length LENGTH."""
import bpy, sys
from mathutils import Matrix, Vector
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
LENGTH = 1.08
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
sword = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o != sword: bpy.data.objects.remove(o, do_unlink=True)
pts = [v.co.copy() for v in sword.data.vertices]
lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
ext = [hi[i] - lo[i] for i in range(3)]
a = max(range(3), key=lambda i: ext[i])
b, c = sorted([i for i in range(3) if i != a], key=lambda i: -ext[i])
# The guard is the widest cross-section; the grip lies on the shorter side of it.
bins = 60
width = [0.0] * bins
for p in pts:
    k = min(bins - 1, int((p[a] - lo[a]) / ext[a] * bins))
    width[k] = max(width[k], abs(p[b] - (lo[b] + hi[b]) / 2))
guard_k = max(range(bins), key=lambda k: width[k])
guard = lo[a] + (guard_k + .5) / bins * ext[a]
grip_sign = 1 if hi[a] - guard < guard - lo[a] else -1
ea, eb = Vector([0, 0, 0]), Vector([0, 0, 0])
ea[a] = grip_sign; eb[b] = 1
ec = eb.cross(ea)
# Rows map old axes onto the glTF frame (X=width, Y=grip, Z=thin); the exporter converts Blender Z-up to glTF Y-up.
rot = Matrix((eb, ea, ec)).to_4x4()
centre = Vector([(lo[i] + hi[i]) / 2 for i in range(3)]); centre[a] = guard
blender_from_gltf = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
sword.data.transform(blender_from_gltf @ Matrix.Scale(LENGTH / ext[a], 4) @ rot @ Matrix.Translation(-centre))
sword.name = 'Sword'
print('SWORD axis', a, 'width axis', b, 'guard bin', guard_k, 'grip sign', grip_sign)
sword.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=86, export_animations=False)
print('EXPORTED', out)
