"""Bake Mixamo samples to NPCs and the hero's stealth skeleton (numpy/scipy)."""
import importlib.util, json, uuid
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('rig', Path(__file__).with_name('retarget-motion.py'))
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
align = R.from_euler('y', 90, degrees=True)
for kind in ['commoner', 'guard', 'prince', 'woman', 'hero']:
    target = module.Rig(ROOT / ('src/models/hero.glb' if kind == 'hero' else f'src/models/npc-{kind}.glb'))
    mapped = {i: name for name, i in target.names.items() if name and name.startswith('mixamorig:')}
    hips = target.names['mixamorig:Hips']
    clips = []
    for path in sorted((ROOT / 'assets-src/animations/samples').glob('*.json')):
        if path.stem.startswith('crouch_') != (kind == 'hero'):
            continue
        src = json.loads(path.read_text())
        rest = {name: R.from_quat(q) for name,q in src['rest'].items()}
        rotations = {name: R.from_quat(q) for name,q in src['rotations'].items()}
        names = {i: name for i,name in mapped.items() if name in rest}
        pose = {i: [] for i in names}
        for frame in range(len(src['times'])):
            world = {}
            def visit(i):
                if i not in world:
                    if i in names:
                        name = names[i]
                        delta = rotations[name][frame] * rest[name].inv()
                        world[i] = align * delta * align.inv() * target.world_rest[i]
                    else:
                        p = target.parents.get(i)
                        world[i] = visit(p) * target.rest[i] if p is not None else target.rest[i]
                return world[i]
            for i in names:
                p = target.parents.get(i)
                q = (visit(p).inv() * visit(i)).as_quat() if p is not None else visit(i).as_quat()
                if pose[i] and np.dot(pose[i][-1], q) < 0: q = -q
                pose[i].append(q)
        tracks = []
        for i, values in pose.items():
            times = src['times']; values = np.array(values)
            if np.max(np.abs(values - values[0])) < 1e-5:
                times = [0, src['duration']]; values = values[[0, 0]]
            tracks.append(dict(name=names[i].replace(':','')+'.quaternion', type='quaternion',
                               times=np.round(times,5).tolist(), values=np.round(values,6).ravel().tolist()))
        pos = np.tile(target.nodes[hips]['translation'], (len(src['times']),1))
        ratio = pos[0,1] / src['hipRest'][1]
        pos[:,1] += (np.array(src['hipPositions'])[:,1] - src['hipRest'][1]) * ratio
        tracks.append(dict(name='mixamorigHips.position',type='vector',times=np.round(src['times'],5).tolist(),values=np.round(pos,6).ravel().tolist()))
        clips.append(dict(name=src['name'],uuid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'mixamo/npc/{kind}/{src["name"]}')),duration=src['duration'],tracks=tracks))
    output = ROOT / ('src/models/hero-stealth-motion.json' if kind == 'hero' else f'src/models/npc-{kind}-motion.json')
    output.write_text(json.dumps(dict(source='Adobe Mixamo',rootMotion='in-place XZ',clips=clips), separators=(',',':')))
    print(kind, len(clips), output.stat().st_size)
