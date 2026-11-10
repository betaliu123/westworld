import bpy, sys, json
path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
info = {'objects': [], 'bones': [], 'images': []}
for o in bpy.data.objects:
    entry = {'name': o.name, 'type': o.type, 'dims': [round(v, 3) for v in o.dimensions]}
    if o.type == 'MESH':
        o.data.calc_loop_triangles()
        entry['tris'] = len(o.data.loop_triangles)
        entry['groups'] = len(o.vertex_groups)
    info['objects'].append(entry)
    if o.type == 'ARMATURE':
        info['bones'] = [(b.name, b.parent.name if b.parent else None, [round(v, 3) for v in b.head_local]) for b in o.data.bones]
for img in bpy.data.images:
    info['images'].append([img.name, list(img.size)])
print('INSPECT ' + json.dumps(info))
