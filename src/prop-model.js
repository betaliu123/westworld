import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';

const loader = new GLTFLoader(), cache = new Map();
const base = file => new URL(`./models/${file}`, import.meta.url).href;

function load(file) {
  if (!cache.has(file)) cache.set(file, new Promise((resolve, reject) => loader.load(base(file), g => resolve(g.scene), undefined, reject)));
  return cache.get(file);
}

// Replaces the box stand-in once the generated mesh arrives. `height` is the upright size;
// `lay` turns that upright length flat onto the parent's XZ plane.
export function fitProp(group, file, {height = 1, lay = false, keep = () => false} = {}) {
  if (!globalThis.document?.createElement || !group) return;
  load(file).then(src => {
    const model = src.clone(true), meshes = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      o.geometry.computeBoundingBox();
      meshes.push(o);
    });
    if (meshes.length > 1) {
      for (const o of meshes) {
        const s = o.geometry.boundingBox.getSize(new T.Vector3());
        const thin = Math.min(s.x, s.y, s.z), wide = Math.max(s.x, s.y, s.z);
        if (thin < wide * 0.03 && wide > 0.4) o.visible = false;
      }
    }
    const bounds = new T.Box3(), part = new T.Box3();
    const measure = () => {
      bounds.makeEmpty();
      model.updateMatrixWorld(true);
      model.traverse(o => { if (o.isMesh && o.visible) bounds.union(part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); });
    };
    measure();
    if (lay && !bounds.isEmpty()) {
      const raw = bounds.getSize(new T.Vector3());
      if (raw.x <= raw.y && raw.x <= raw.z) model.rotation.z = -Math.PI / 2;
      else if (raw.z <= raw.x && raw.z <= raw.y) model.rotation.x = -Math.PI / 2;
      measure();
    }
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new T.Vector3());
    const scale = height / Math.max(lay ? Math.max(size.x, size.z) : size.y, 1e-4);
    const center = bounds.getCenter(new T.Vector3());
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    for (const child of [...group.children]) if (child.isMesh && !keep(child)) child.visible = false;
    group.add(model);
  }).catch(error => console.warn('prop model failed; keeping the stand-in', file, error));
}
