import * as T from '../vendor/three.module.js';

const ray = new T.Ray(), box = new T.Box3(), point = new T.Vector3();
function height(o) {
  if (o.sightHeight !== undefined) return o.sightHeight;
  if (o.cameraHeight !== undefined) return o.cameraHeight;
  if (o.id === 'book-desk' || o.id?.includes('table')) return 1.15;
  if (o.id === 'river-fence') return 2.15;
  if (o.id === 'privacy-hedge') return 1.65;
  if (o.id?.startsWith('city-wall')) return 3.4;
  if (o.id?.startsWith('stall:') || o.id === 'wanted-board') return 2.9;
  return 4.5;
}

// Cast the camera boom against padded physical blockers. Broken objects stop blocking
// both the player and the camera, and low tables do not act like full-height walls.
export function clearCameraPosition(focus, desired, obstacles, states = {}) {
  const direction = desired.clone().sub(focus), length = direction.length();
  if (length < .001) return desired.clone();
  ray.set(focus, direction.multiplyScalar(1 / length));
  let distance = length;
  for (const o of obstacles) {
    if (states[o.id]?.hp === 0 || states[o.id]?.open || states[o.id]?.cameraCutaway) continue;
    box.min.set(o.x - o.w / 2 - .22, -.1, o.z - o.d / 2 - .22);
    box.max.set(o.x + o.w / 2 + .22, height(o) + .15, o.z + o.d / 2 + .22);
    // The focus may be in the padding of a wall at very close range; casting from
    // inside it would make the far face look like a new obstruction.
    if (box.containsPoint(focus)) continue;
    if (ray.intersectBox(box, point)) distance = Math.min(distance, Math.max(.12, focus.distanceTo(point) - .08));
  }
  return ray.at(distance, new T.Vector3());
}

// Prefer a clear side of the speaker rather than pushing the lens into their face.
export function clearDialogueCamera(focus, desired, obstacles, states = {}) {
  const offset = desired.clone().sub(focus), axis = new T.Vector3(0, 1, 0);
  let best = clearCameraPosition(focus, desired, obstacles, states);
  let score = best.distanceTo(focus);
  for (const angle of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const candidate = focus.clone().add(offset.clone().applyAxisAngle(axis, angle));
    const safe = clearCameraPosition(focus, candidate, obstacles, states);
    const candidateScore = safe.distanceTo(focus) - Math.abs(angle) * .12;
    if (candidateScore > score + .15) { best = safe; score = candidateScore; }
  }
  return best;
}

export function followOrbit(camera, focus, desired, obstacles, states, dt, fov) {
  const safe = clearCameraPosition(focus, desired, obstacles, states);
  // Retract promptly, recover gently. Clamp again after smoothing so the camera
  // cannot cut through a corner while the player turns.
  const retracting = safe.distanceToSquared(focus) + .1 < camera.position.distanceToSquared(focus);
  camera.position.lerp(safe, 1 - Math.exp(-(retracting ? 20 : 7) * dt));
  camera.position.copy(clearCameraPosition(focus, camera.position, obstacles, states));
  camera.fov += (fov - camera.fov) * (1 - Math.exp(-6 * dt));
  camera.lookAt(focus);
}
