import * as T from '../vendor/three.module.js';

// Combat effects drawn as ink on paper: a blade leaves a brush stroke, a blow throws ink that blots the ground and dries.
// Everything is pooled and black ink only; nothing here decides a hit, it only shows one that happened.
const INK = new T.Color('#15140f');
const DROPS = 72, BLOTS = 56, MARKS = 8, TRAIL_SAMPLES = 24, TRAIL_SUB = 4, TRAIL_STEP = 1 / 60;
const GROUND = .05, GROW_FROM = .5;

function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// One shared brush texture. R: a tapered stroke (pressed at the left, flicked off at the right),
// G: dry-brush fibres running along the stroke, B: a soft halo of the stroke for a paper-coloured rim.
let brush = null;
export function brushTexture() {
  if (brush || !globalThis.document?.createElement) return brush;
  const W = 256, H = 48, rnd = seeded(7), body = new Float32Array(W * H), fibre = new Float32Array(W * H);
  const wobble = Array.from({length: 9}, () => rnd() - .5), sample = (list, t) => { const f = t * (list.length - 1), i = Math.min(list.length - 2, Math.floor(f)), k = f - i; return list[i] + (list[i + 1] - list[i]) * k * k * (3 - 2 * k); };
  for (let x = 0; x < W; x++) {
    const t = x / (W - 1), press = Math.min(1, t / .05), flick = 1 - Math.max(0, (t - .82) / .18) ** 1.6;
    const half = H * .34 * press ** .5 * (1 - .32 * t) * flick * (1 + .18 * sample(wobble, t)), mid = H / 2 + H * .05 * Math.sin(t * 2.6 + .4);
    for (let y = 0; y < H; y++) body[y * W + x] = Math.max(0, Math.min(1, half - Math.abs(y + .5 - mid) + .5));
  }
  for (let y = 0; y < H; y++) { let v = rnd(); const row = rnd(); for (let x = 0; x < W; x++) { v += (rnd() - .5) * .22; v += (row - v) * .06; v = Math.max(0, Math.min(1, v)); fibre[y * W + x] = v; } }
  const halo = Float32Array.from(body), pass = new Float32Array(W * H);
  for (let round = 0; round < 2; round++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let sum = 0, n = 0; for (let k = -4; k <= 4; k++) { const q = x + k; if (q >= 0 && q < W) { sum += halo[y * W + q]; n++; } } pass[y * W + x] = sum / n; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let sum = 0, n = 0; for (let k = -4; k <= 4; k++) { const q = y + k; if (q >= 0 && q < H) { sum += pass[q * W + x]; n++; } } halo[y * W + x] = sum / n; }
  }
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { image.data[i * 4] = body[i] * 255; image.data[i * 4 + 1] = fibre[i] * 255; image.data[i * 4 + 2] = Math.min(1, halo[i] * 1.6) * 255; image.data[i * 4 + 3] = 255; }
  ctx.putImageData(image, 0, 0);
  brush = new T.CanvasTexture(canvas); brush.wrapS = T.RepeatWrapping; brush.wrapT = T.ClampToEdgeWrapping;
  return brush;
}

// Thrown ink, flung toward +x from a wet core at (SPLAT_CORE, .5): tapering streaks that end in a bead, and loose drops.
const SPLAT_CORE = .3;
function splatTexture() {
  const S = 256, canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
  const c = canvas.getContext('2d'), rnd = seeded(31), TAU = Math.PI * 2;
  const blob = (x, y, r) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(.78, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  c.fillStyle = '#000'; c.fillRect(0, 0, S, S);
  const cx = S * SPLAT_CORE, cy = S / 2, R = S * .1;
  for (let i = 0; i < 12; i++) { const a = rnd() * TAU, d = rnd() * R * .75; blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (.45 + rnd() * .6)); }
  for (let i = 0; i < 26; i++) {
    const forward = rnd() < .78, a = forward ? (rnd() - .5) * 1.25 : rnd() * TAU, d = R * (forward ? 2 + rnd() * 4.4 : 1.3 + rnd() * 1.3), w = R * (.1 + rnd() * .2);
    for (let s = 0; s <= 14; s++) { const t = s / 14; blob(cx + Math.cos(a) * d * t, cy + Math.sin(a) * d * t, Math.max(.8, w * (1 - .8 * t))); }
    blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * (.45 + rnd() * .5));
  }
  for (let i = 0; i < 50; i++) { const a = rnd() < .7 ? (rnd() - .5) * 1.7 : rnd() * TAU, d = R * (1.2 + rnd() * 5.6); blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (.04 + rnd() * rnd() * .2)); }
  return new T.CanvasTexture(canvas);
}

const markVertex = `
uniform vec2 uSize; uniform float uAngle,uPivot,uGrow; varying vec2 vUv;
void main(){
  vUv=uv; vec2 p=vec2(position.x+uPivot,position.y)*uSize*uGrow; float c=cos(uAngle),s=sin(uAngle);
  vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);
  mv.xy+=vec2(p.x*c-p.y*s,p.x*s+p.y*c); mv.z+=.55;
  gl_Position=projectionMatrix*mv;
}`;
const markFragment = `
uniform sampler2D uMap,uBrush; uniform float uAge,uStroke,uSeed,uOpacity; uniform vec3 uInk; varying vec2 vUv;
void main(){
  float body=mix(texture2D(uMap,vUv).r,texture2D(uBrush,vUv).r,uStroke);
  float fibre=texture2D(uBrush,vec2(vUv.x*mix(.8,.3,uStroke)+uSeed,vUv.y)).g;
  // A stroke is drawn from its pressed end; thrown ink is simply there.
  float drawn=mix(1.,smoothstep(0.,.1,uAge*5.-vUv.x+.1),uStroke);
  float dry=smoothstep(.25,1.,uAge)*1.15-.12+uStroke*.34;
  float a=body*drawn*smoothstep(dry,dry+.22,fibre*.75+body*.25)*(1.-smoothstep(.82,1.,uAge));
  if(a<.02)discard;
  gl_FragColor=vec4(uInk,a*uOpacity);
}`;
const blotVertex = `
attribute vec2 aFade; varying vec2 vUv; varying vec2 vFade;
void main(){ vUv=uv; vFade=aFade; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const blotFragment = `
uniform vec3 uInk; varying vec2 vUv; varying vec2 vFade;
void main(){
  vec2 q=vUv*2.-1.; float ang=atan(q.y,q.x);
  // Uneven lobes, different for every blot; ink pools a little darker at the rim.
  float seed=vFade.y*6.283;
  float r=length(q)*(1.+.2*sin(ang*3.+seed*3.)+.12*sin(ang*5.+seed*7.)+.07*sin(ang*9.+seed*13.));
  float a=smoothstep(.98,.8,r)*mix(.6,.82,smoothstep(.4,.85,r))*smoothstep(0.,.3,vFade.x);
  if(a<.02)discard;
  gl_FragColor=vec4(uInk,a);
}`;
const trailVertex = `
attribute vec3 aInfo; varying vec3 vInfo;
void main(){ vInfo=aInfo; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const trailFragment = `
uniform sampler2D uBrush; uniform float uOpacity; uniform vec3 uInk; varying vec3 vInfo;
void main(){
  // x: distance along the stroke, y: across it (0 near the hand, 1 at the tip), z: wetness left (1 fresh, 0 dry)
  // Bristles let go one by one as the stroke dries, and the hand side lifts first, so the tail thins toward the tip's path.
  float fibre=texture2D(uBrush,vec2(vInfo.x,vInfo.y)).g;
  float dry=mix(.96,.12,vInfo.z), lift=mix(.6,0.,vInfo.z);
  float a=smoothstep(dry,dry+.07,fibre)*smoothstep(lift,lift+.25,vInfo.y)*smoothstep(1.,.95,vInfo.y)*smoothstep(0.,.1,vInfo.z);
  if(a<.02)discard;
  gl_FragColor=vec4(uInk,a*uOpacity);
}`;
const blend = {transparent: true, depthWrite: false};

// A ribbon swept by two moving points. Sparse frames are rounded with a spline, so a slow machine still gets a curve.
class Trail {
  constructor(scene, texture, {life, opacity}) {
    this.life = life; this.samples = []; this.length = 0;
    const rows = (TRAIL_SAMPLES - 1) * TRAIL_SUB + 1, index = [];
    this.position = new Float32Array(rows * 6); this.info = new Float32Array(rows * 6);
    for (let i = 0; i < rows - 1; i++) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new T.BufferGeometry();
    this.positionAttr = new T.BufferAttribute(this.position, 3); this.infoAttr = new T.BufferAttribute(this.info, 3);
    this.positionAttr.setUsage(T.DynamicDrawUsage); this.infoAttr.setUsage(T.DynamicDrawUsage);
    g.setAttribute('position', this.positionAttr); g.setAttribute('aInfo', this.infoAttr); g.setIndex(index); g.setDrawRange(0, 0);
    this.mesh = new T.Mesh(g, new T.ShaderMaterial({uniforms: {uBrush: {value: texture}, uOpacity: {value: opacity}, uInk: {value: INK}}, vertexShader: trailVertex, fragmentShader: trailFragment, side: T.DoubleSide, ...blend}));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; this.mesh.visible = false; this.mesh.userData.environmentEffect = true; scene.add(this.mesh);
  }
  add(near, far, now) {
    const s = this.samples, last = s.at(-1), open = !last || this.closed || now - last.at > .12;
    this.closed = false;
    // The newest sample follows the blade every frame and is only kept once it is a sixtieth of a second from the
    // one before, so a fast display does not use the samples up on a shorter stroke.
    const before = s.at(-2);
    if (!open && !last.open && before && last.at - before.at < TRAIL_STEP) { this.length = last.u - last.step; s.pop(); }
    const step = open ? 7.3 : far.distanceTo(s.at(-1).far) * .22; // a new stroke starts on fresh fibres
    this.length += step;
    s.push({near: near.clone(), far: far.clone(), at: now, u: this.length, step, open});
    if (s.length > TRAIL_SAMPLES) s.shift();
  }
  end() { this.closed = true; }
  update(now) {
    const s = this.samples;
    while (s.length && now - s[0].at > this.life) s.shift();
    if (s.length < 2) { this.mesh.visible = false; return; }
    let row = 0;
    const write = (near, far, u, wet) => { const o = row * 6; this.position.set([near.x, near.y, near.z, far.x, far.y, far.z], o); this.info.set([u, 0, wet, u, 1, wet], o); row++; };
    const spline = (a, b, c, d, t) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    const point = (key, i, t, out) => { const a = s[Math.max(0, i - 1)], b = s[i], c = s[i + 1], d = s[Math.min(s.length - 1, i + 2)]; const p0 = b.open ? b : a, p3 = c.open || d.open ? c : d; return out.set(spline(p0[key].x, b[key].x, c[key].x, p3[key].x, t), spline(p0[key].y, b[key].y, c[key].y, p3[key].y, t), spline(p0[key].z, b[key].z, c[key].z, p3[key].z, t)); };
    const near = new T.Vector3(), far = new T.Vector3();
    for (let i = 0; i < s.length - 1; i++) {
      const b = s[i], c = s[i + 1];
      // Separate strokes are not joined: the sheet between them is given no ink.
      if (c.open) { write(b.near, b.far, b.u, 1 - (now - b.at) / this.life); write(b.near, b.far, b.u, 0); write(c.near, c.far, c.u, 0); continue; }
      for (let k = 0; k < TRAIL_SUB; k++) { const t = k / TRAIL_SUB; write(point('near', i, t, near), point('far', i, t, far), b.u + (c.u - b.u) * t, 1 - (now - (b.at + (c.at - b.at) * t)) / this.life); }
    }
    const end = s.at(-1); write(end.near, end.far, end.u, 1 - (now - end.at) / this.life);
    this.positionAttr.needsUpdate = this.infoAttr.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, (row - 1) * 6); this.mesh.visible = true;
  }
}

// The two points of a held sword that sweep its stroke, in the sword group's own space: partway up the blade
// and the tip. Read from the model's bounds, so a different sword needs no hand-set numbers. Null until it has loaded.
export function bladeEnds(sword) {
  const box = new T.Box3(), inverse = new T.Matrix4(), local = new T.Matrix4(), corner = new T.Vector3();
  sword.updateWorldMatrix(true, true); inverse.copy(sword.matrixWorld).invert();
  sword.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.boundingBox || o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox; local.multiplyMatrices(inverse, o.matrixWorld);
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) box.expandByPoint(corner.set(x, y, z).applyMatrix4(local));
  });
  if (box.isEmpty()) return null;
  const size = box.getSize(new T.Vector3()), axis = size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
  // The hand holds the group's origin, so the tip is the end farther from it.
  const tipSide = Math.abs(box.max[axis]) > Math.abs(box.min[axis]) ? 'max' : 'min', tip = box.getCenter(new T.Vector3()), hilt = tip.clone();
  tip[axis] = box[tipSide][axis]; hilt[axis] = box[tipSide === 'max' ? 'min' : 'max'][axis];
  return {near: hilt.lerp(tip, .38), far: tip};
}

export class InkFx {
  constructor(scene, {wet = () => false} = {}) {
    this.scene = scene; this.wet = wet; this.now = 0; this.rnd = seeded(101);
    const texture = brushTexture(), splat = splatTexture();
    this.drops = Array.from({length: DROPS}, () => ({life: 0, p: new T.Vector3(), v: new T.Vector3(), r: 0}));
    this.dropMesh = new T.InstancedMesh(new T.SphereGeometry(1, 6, 5), new T.MeshBasicMaterial({color: INK}), DROPS);
    this.blots = Array.from({length: BLOTS}, () => ({life: 0, span: 1}));
    const flat = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.blotFade = new T.InstancedBufferAttribute(new Float32Array(BLOTS * 2), 2); this.blotFade.setUsage(T.DynamicDrawUsage); flat.setAttribute('aFade', this.blotFade);
    this.blotMesh = new T.InstancedMesh(flat, new T.ShaderMaterial({uniforms: {uInk: {value: INK}}, vertexShader: blotVertex, fragmentShader: blotFragment, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...blend}), BLOTS);
    const none = new T.Matrix4().makeScale(0, 0, 0);
    for (const m of [this.dropMesh, this.blotMesh]) { for (let i = 0; i < m.count; i++) m.setMatrixAt(i, none); m.frustumCulled = false; m.userData.environmentEffect = true; scene.add(m); }
    this.blotMesh.renderOrder = 2; this.nextDrop = this.nextBlot = this.nextMark = 0;
    const quad = new T.PlaneGeometry(1, 1);
    this.marks = Array.from({length: MARKS}, () => {
      const mesh = new T.Mesh(quad, new T.ShaderMaterial({uniforms: {uMap: {value: splat}, uBrush: {value: texture}, uAge: {value: 0}, uStroke: {value: 0}, uSeed: {value: 0}, uOpacity: {value: 1}, uSize: {value: new T.Vector2(1, 1)}, uAngle: {value: 0}, uPivot: {value: 0}, uGrow: {value: 1}, uInk: {value: INK}}, vertexShader: markVertex, fragmentShader: markFragment, ...blend}));
      mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.visible = false; mesh.userData.environmentEffect = true; scene.add(mesh);
      return {mesh, age: 0, life: 0};
    });
    this.blade = new Trail(scene, texture, {life: .3, opacity: .9});
    this.smear = new Trail(scene, texture, {life: .34, opacity: .5});
    this.dummy = new T.Object3D(); this.up = new T.Vector3(0, 1, 0); this.a = new T.Vector3(); this.b = new T.Vector3();
  }
  // Screen angle of a world direction, so brushwork follows the blow as the camera sees it.
  angle(camera, point, direction) {
    this.a.copy(point).project(camera); this.b.copy(point).add(direction).project(camera);
    return Math.atan2(this.b.y - this.a.y, (this.b.x - this.a.x) * camera.aspect);
  }
  mark(point, {stroke, width, height, angle, life}) {
    const m = this.marks[this.nextMark]; this.nextMark = (this.nextMark + 1) % MARKS;
    const u = m.mesh.material.uniforms; m.age = 0; m.life = life; m.mesh.position.copy(point); m.mesh.visible = true;
    u.uStroke.value = stroke ? 1 : 0; u.uSize.value.set(width, height); u.uAngle.value = angle; u.uSeed.value = this.rnd(); u.uAge.value = 0;
    u.uPivot.value = stroke ? 0 : .5 - SPLAT_CORE; u.uGrow.value = stroke ? 1 : GROW_FROM; // thrown ink spreads from the point it left
  }
  drop(point, direction, speed) {
    const d = this.drops[this.nextDrop]; this.nextDrop = (this.nextDrop + 1) % DROPS; const r = this.rnd;
    d.life = 1.6; d.r = .018 + r() * r() * .05; d.p.copy(point).add(this.a.set((r() - .5) * .2, (r() - .5) * .3, (r() - .5) * .2));
    const push = speed * (.3 + r() * r() * 1.2); d.v.set((direction.x + (r() - .5) * 1.3) * push, (.35 + r() * .9) * push, (direction.z + (r() - .5) * 1.3) * push);
  }
  blot(x, z, width, depth = width, turn = this.rnd() * 6.28, span = 7) {
    if (this.wet(x, z)) return;
    const i = this.nextBlot; this.nextBlot = (i + 1) % BLOTS; const b = this.blots[i]; b.life = b.span = span;
    this.dummy.position.set(x, GROUND, z); this.dummy.rotation.set(0, turn, 0); this.dummy.scale.set(width, 1, depth); this.dummy.updateMatrix();
    this.blotMesh.setMatrixAt(i, this.dummy.matrix); this.blotMesh.instanceMatrix.needsUpdate = true;
    this.blotFade.setXY(i, 1, this.rnd()); this.blotFade.needsUpdate = true;
  }
  // power about 1 for an ordinary cut; a felling blow throws more.
  impact(camera, point, direction, power = 1, detail = 1) {
    const r = this.rnd, away = this.angle(camera, point, direction);
    const spread = 1.35 + .65 * power;
    this.mark(point, {stroke: false, width: spread, height: spread, angle: away, life: .5 + .12 * power});
    this.mark(point, {stroke: true, width: 1.5 + .4 * power, height: .19, angle: away + Math.PI / 2 + (r() - .5) * 1.1, life: .26});
    for (let i = Math.round((9 + 9 * power) * detail); i > 0; i--) this.drop(point, direction, 3.4 + 1.8 * power);
    this.blot(point.x + direction.x * .5, point.z + direction.z * .5, .22 + .16 * power, .34 + .3 * power, Math.atan2(direction.x, direction.z));
  }
  // Two blades meeting throw a short spray and no stain.
  clash(camera, point, direction, detail = 1) {
    this.mark(point, {stroke: true, width: .95, height: .13, angle: this.angle(camera, point, direction) + Math.PI / 2, life: .2});
    for (let i = Math.round(5 * detail); i > 0; i--) this.drop(point, direction, 2.6);
  }
  // Scuffed ink along a quick step.
  streak(from, to) {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz) || 1, turn = Math.atan2(dx, dz), r = this.rnd;
    for (let i = 0; i < 5; i++) { const t = .12 + r() * .7, side = (r() - .5) * .5; this.blot(from.x + dx * t - dz / length * side, from.z + dz * t + dx / length * side, .05 + r() * .06, length * (.18 + r() * .22), turn, 2.4); }
  }
  trailAdd(near, far) { this.blade.add(near, far, this.now); }
  trailEnd() { this.blade.end(); }
  smearAdd(near, far) { this.smear.add(near, far, this.now); }
  smearEnd() { this.smear.end(); }
  update(dt) {
    this.now += dt;
    let moved = false;
    for (let i = 0; i < DROPS; i++) {
      const d = this.drops[i]; if (d.life <= 0) continue; moved = true;
      d.life -= dt; d.v.y -= 15 * dt; d.p.addScaledVector(d.v, dt);
      if (d.p.y <= GROUND || d.life <= 0) {
        if (d.p.y <= GROUND) this.blot(d.p.x, d.p.z, d.r * 5, d.r * 5, undefined, 5);
        d.life = 0; this.dummy.scale.set(0, 0, 0); this.dummy.updateMatrix(); this.dropMesh.setMatrixAt(i, this.dummy.matrix); continue;
      }
      // Drawn out along its flight, like ink flicked from a brush.
      const speed = d.v.length(); this.dummy.position.copy(d.p); this.dummy.quaternion.setFromUnitVectors(this.up, this.a.copy(d.v).multiplyScalar(1 / Math.max(speed, .001)));
      this.dummy.scale.set(d.r, d.r * (1 + Math.min(3, speed * .16)), d.r); this.dummy.updateMatrix(); this.dropMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (moved) this.dropMesh.instanceMatrix.needsUpdate = true;
    let faded = false;
    for (let i = 0; i < BLOTS; i++) { const b = this.blots[i]; if (b.life <= 0) continue; b.life = Math.max(0, b.life - dt); this.blotFade.setX(i, b.life / b.span); faded = true; }
    if (faded) this.blotFade.needsUpdate = true;
    for (const m of this.marks) { if (!m.mesh.visible) continue; m.age += dt; if (m.age >= m.life) { m.mesh.visible = false; continue; } const u = m.mesh.material.uniforms; u.uAge.value = m.age / m.life; if (!u.uStroke.value) u.uGrow.value = GROW_FROM + (1 - GROW_FROM) * (1 - (1 - Math.min(1, m.age / .09)) ** 2); }
    this.blade.update(this.now); this.smear.update(this.now);
  }
}
