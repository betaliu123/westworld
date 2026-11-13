"""Blender --background --python tools/export-mixamo.py -- SOURCE_DIR OUTPUT_DIR.
Export rest-space/world-space bone samples; no meshes or textures in runtime data.
"""
import bpy, json, sys, math
from pathlib import Path
from mathutils import Matrix

source, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
output.mkdir(parents=True, exist_ok=True)
up = Matrix.Rotation(-math.pi / 2, 4, 'X')
def quat(matrix):
    q = matrix.to_quaternion().normalized()
    return [q.x, q.y, q.z, q.w]
for path in source.glob('*.fbx'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(path))
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    scene = bpy.context.scene
    action = arm.animation_data.action
    start, end = action.frame_range
    bones = list(arm.pose.bones)
    rest = {b.name: quat(up @ arm.matrix_world @ b.bone.matrix_local) for b in bones}
    rest_positions = {b.name: list((up @ arm.matrix_world @ b.bone.matrix_local).translation) for b in bones}
    hips = next(b for b in bones if b.name.replace(':', '') == 'mixamorigHips')
    rest_hip = list((up @ arm.matrix_world @ hips.bone.matrix_local).translation)
    fps = scene.render.fps / scene.render.fps_base
    duration = (end - start) / fps
    count = round(duration * 24) + 1
    times = [i * duration / (count - 1) for i in range(count)]
    rotations = {b.name: [] for b in bones}
    positions = []
    for t in times:
        frame = start + t * fps
        scene.frame_set(int(frame), subframe=frame % 1)
        for b in bones:
            rotations[b.name].append(quat(up @ arm.matrix_world @ b.matrix))
        positions.append(list((up @ arm.matrix_world @ hips.matrix).translation))
    result = dict(name=path.stem, duration=duration, times=times, rest=rest, restPositions=rest_positions,
                  hipRest=rest_hip, hipPositions=positions, rotations=rotations)
    (output / (path.stem + '.json')).write_text(json.dumps(result), encoding='utf8')
    print(path.stem, len(bones), duration, rest_hip)
