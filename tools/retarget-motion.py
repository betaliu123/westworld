"""Extract bone animation, not meshes/textures, from a local reference GLB.

Usage: python tools/retarget-motion.py SOURCE.glb src/models/hero.glb OUTPUT.json
Requires numpy + scipy. The source's redistribution license must be checked separately.
World movement stays in the game controller: X/Z root translation is discarded.
"""
import argparse
import hashlib
import json
import struct
import uuid
from pathlib import Path

import numpy as np
from scipy.spatial.transform import Rotation, Slerp


class Rig:
    def __init__(self, path):
        self.raw = Path(path).read_bytes()
        size = struct.unpack_from('<I', self.raw, 12)[0]
        self.gltf = json.loads(self.raw[20:20 + size])
        self.binary = self.raw[28 + size:]
        self.nodes = self.gltf['nodes']
        self.names = {n.get('name'): i for i, n in enumerate(self.nodes)}
        self.parents = {c: i for i, n in enumerate(self.nodes) for c in n.get('children', [])}
        self.rest = [Rotation.from_quat(n.get('rotation', [0, 0, 0, 1])) for n in self.nodes]
        self.world_rest = self.world(self.rest)

    def world(self, locals):
        result = {}

        def visit(i):
            if i not in result:
                p = self.parents.get(i)
                result[i] = (visit(p) * locals[i]) if p is not None else locals[i]
            return result[i]

        for i in range(len(self.nodes)):
            visit(i)
        return result

    def accessor(self, index):
        a = self.gltf['accessors'][index]
        v = self.gltf['bufferViews'][a['bufferView']]
        assert a['componentType'] == 5126 and 'sparse' not in a
        count = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        return np.ndarray((a['count'], count), dtype='<f4', buffer=self.binary,
                          offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
                          strides=(v.get('byteStride', count * 4), 4)).copy()


def retarget(source, target):
    # Source forward +Z, our model forward +X (its wrapper turns it back to +Z).
    alignment = Rotation.from_euler('y', 90, degrees=True)
    mapped = {i: source.names[name] for name, i in target.names.items()
              if name and name.startswith('mixamorig:') and name in source.names}
    hips = target.names['mixamorig:Hips']
    source_hips = mapped[hips]
    height_ratio = target.nodes[hips]['translation'][1] / source.nodes[source_hips]['translation'][1]
    clips = []
    for animation in source.gltf['animations']:
        samplers = []
        duration = 0
        for channel in animation['channels']:
            s = animation['samplers'][channel['sampler']]
            if channel['target']['node'] not in mapped.values():
                continue
            times = source.accessor(s['input']).ravel().astype(float)
            values = source.accessor(s['output'])
            duration = max(duration, float(times[-1]))
            assert s.get('interpolation', 'LINEAR') == 'LINEAR'
            samplers.append((channel['target'], times, values))
        times = np.linspace(0, duration, round(duration * 24) + 1)
        poses = {i: [] for i in mapped}
        hip_positions = []
        sampled = []
        for channel, key_times, values in samplers:
            ts = np.clip(times, key_times[0], key_times[-1])
            if channel['path'] == 'rotation':
                sampled.append((channel, Slerp(key_times, Rotation.from_quat(values))(ts)))
            elif channel['path'] == 'translation':
                sampled.append((channel, np.array([np.interp(ts, key_times, values[:, j]) for j in range(3)]).T))
        for frame in range(len(times)):
            local = source.rest.copy()
            position = np.array(source.nodes[source_hips]['translation'])
            for channel, values in sampled:
                if channel['path'] == 'rotation':
                    local[channel['node']] = values[frame]
                elif channel['node'] == source_hips:
                    position = values[frame]
            source_world = source.world(local)
            world = {}

            def target_world(i):
                if i not in world:
                    if i in mapped:
                        s = mapped[i]
                        delta = source_world[s] * source.world_rest[s].inv()
                        world[i] = alignment * delta * alignment.inv() * target.world_rest[i]
                    else:
                        p = target.parents.get(i)
                        world[i] = (target_world(p) * target.rest[i]) if p is not None else target.rest[i]
                return world[i]

            for i in mapped:
                p = target.parents.get(i)
                q = (target_world(p).inv() * target_world(i)).as_quat() if p is not None else target_world(i).as_quat()
                if poses[i] and np.dot(poses[i][-1], q) < 0:
                    q = -q
                poses[i].append(q)
            pos = np.array(target.nodes[hips]['translation'])
            pos[1] += (position[1] - source.nodes[source_hips]['translation'][1]) * height_ratio
            hip_positions.append(pos)

        tracks = []
        for i, values in poses.items():
            tracks.append({'name': target.nodes[i]['name'].replace(':', '') + '.quaternion',
                           'type': 'quaternion', 'times': np.round(times, 6).tolist(),
                           'values': np.round(values, 6).ravel().tolist()})
        tracks.append({'name': 'mixamorigHips.position', 'type': 'vector',
                       'times': np.round(times, 6).tolist(), 'values': np.round(hip_positions, 6).ravel().tolist()})
        # Constant finger/end-joint tracks need only endpoints, retaining the rest pose.
        for track in tracks:
            width = 4 if track['type'] == 'quaternion' else 3
            values = np.array(track['values']).reshape(-1, width)
            if np.max(np.abs(values - values[0])) < .00001:
                track['times'] = [0, round(duration, 6)]
                track['values'] = [*values[0], *values[0]]
        clips.append({'name': animation['name'], 'uuid': str(uuid.uuid5(uuid.NAMESPACE_URL, 'sumiro/hero/' + animation['name'])), 'duration': duration, 'tracks': tracks})
    return {'source': 'https://xikhar.github.io/sumiro/assets/player/player.glb',
            'sourceSHA256': hashlib.sha256(source.raw).hexdigest(),
            'targetSHA256': hashlib.sha256(target.raw).hexdigest(),
            'license': 'Unverified; local evaluation only. Not included in publication.',
            'rootMotion': 'in-place XZ; vertical hip pose retained', 'clips': clips}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source'); parser.add_argument('target'); parser.add_argument('output')
    args = parser.parse_args()
    result = retarget(Rig(args.source), Rig(args.target))
    Path(args.output).write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
    print(f"Retargeted {len(result['clips'])} clips to {args.output}")
