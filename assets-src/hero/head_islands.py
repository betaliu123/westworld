"""List Body islands around the head of the built hero, to spot hat fragments left behind."""
import bpy, bmesh, sys, math, json
path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name == 'Body')
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
head = arm.data.bones['mixamorig:Head'].head_local
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
seen, out = set(), []
for v in bm.verts:
    if v.index in seen: continue
    stack, members = [v], []
    seen.add(v.index)
    while stack:
        cur = stack.pop(); members.append(cur)
        for e in cur.link_edges:
            o = e.other_vert(cur)
            if o.index not in seen: seen.add(o.index); stack.append(o)
    hi = max(m.co.z for m in members)
    if hi < .84: continue
    out.append({'verts': len(members), 'low': round(min(m.co.z for m in members), 3), 'high': round(hi, 3),
                'reach': round(max(math.hypot(m.co.x - head.x, m.co.y - head.y) for m in members), 3)})
print('HEAD', json.dumps({'head': [round(c, 3) for c in head], 'islands': sorted(out, key=lambda i: -i['high'])}))
