import bpy, bmesh, sys, json
path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('tripo_node'))
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
seen, islands = set(), []
for v in bm.verts:
    if v.index in seen: continue
    stack, members = [v], []
    seen.add(v.index)
    while stack:
        cur = stack.pop(); members.append(cur)
        for e in cur.link_edges:
            o = e.other_vert(cur)
            if o.index not in seen: seen.add(o.index); stack.append(o)
    xs = [m.co for m in members]
    lo = [round(min(c[i] for c in xs), 3) for i in range(3)]
    hi = [round(max(c[i] for c in xs), 3) for i in range(3)]
    islands.append({'verts': len(members), 'min': lo, 'max': hi})
islands.sort(key=lambda i: -i['verts'])
# Vertices in the brim band: high and far from the head axis.
head = [v for v in bm.verts if v.co.z > .86]
print('ISLANDS ' + json.dumps({'count': len(islands), 'top': islands[:12], 'mesh_matrix': [list(r) for r in body.matrix_world], 'high_verts': len(head)}))
