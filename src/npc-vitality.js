import * as T from '../vendor/three.module.js';
import {brushTexture} from './ink-fx.js';
import {visibleBetween} from './npc-awareness.js';

// A wounded person's condition, drawn as one brush stroke above the head: black for what is left, a grey
// length for what was just lost, faint dry strokes for the rest. It turns cinnabar once they are badly hurt.
// It appears only over someone who is fighting the player and already hurt. A passer-by who was clipped
// carries no stroke, healthy or wounded.
export const VITALITY = {linger: 4.5, fallen: .9, hold: .28, drain: .55, low: .3, reach: 15};

export function stepVitality(v, {hp, max, fighting = false, seen = true, now, dt}) {
  const part = Math.max(0, Math.min(1, hp / max));
  v ??= {hp, part, lag: part, until: -Infinity, struck: -Infinity, alpha: 0};
  // A blow the player could not see leaves nothing to show; the stroke starts from what is seen later.
  if (hp < v.hp && seen) { v.until = now + (hp > 0 ? VITALITY.linger : VITALITY.fallen); v.struck = now; }
  else if (hp < v.hp) v.lag = part;
  v.hp = hp; v.part = part; v.low = part <= VITALITY.low;
  if (part >= v.lag) v.lag = part;
  else if (now - v.struck > VITALITY.hold) v.lag = Math.max(part, v.lag - VITALITY.drain * dt);
  const shown = seen && fighting && hp > 0 && hp < max;
  v.alpha = shown ? Math.min(1, v.alpha + dt / .14) : Math.max(0, v.alpha - dt / .6);
  return v;
}

const vertex = `
uniform vec2 uSize; varying vec2 vUv;
void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*uSize; gl_Position=projectionMatrix*mv; }`;
const fragment = `
uniform sampler2D uBrush; uniform float uPart,uLag,uAlpha,uLow; uniform vec3 uInk,uGrey,uWarn,uPaper; varying vec2 vUv;
void main(){
  vec4 t=texture2D(uBrush,vUv);
  // The boundary follows the fibres, so the stroke ends raggedly, as a brush lifts off.
  float x=vUv.x+(t.g-.5)*.035;
  float left=smoothstep(uPart+.012,uPart-.012,x), lost=smoothstep(uLag+.012,uLag-.012,x)-left;
  float gone=1.-left-lost;
  // What is gone stays as a brush run dry, so the stroke that is left can be read against its full length.
  vec3 c=mix(uInk,uWarn,uLow)*left+uGrey*lost+uInk*gone;
  float body=t.r*(left+lost*.9+gone*(.12+.6*smoothstep(.46,.58,t.g)));
  float rim=clamp(t.b-t.r,0.,1.)*.6;
  float a=max(body,rim)*uAlpha;
  if(a<.02)discard;
  gl_FragColor=vec4(mix(uPaper,c,clamp(body/max(body+rim,.001),0.,1.)),a);
}`;
const WIDTH = 92, HEIGHT = 17; // screen pixels
const HEIGHT_ABOVE = 2.3;      // metres: over the head, under the name at 2.7

export function mountVitality(world) {
  const texture = brushTexture();
  if (!texture) return {update() {}};
  const quad = new T.PlaneGeometry(1, 1), shared = {uBrush: {value: texture}, uInk: {value: new T.Color('#2c2a24')}, uGrey: {value: new T.Color('#7b766a')}, uWarn: {value: new T.Color('#a63a2b')}, uPaper: {value: new T.Color('#ece3cf')}};
  const bars = new Map();
  function bar(actor) {
    const mesh = new T.Mesh(quad, new T.ShaderMaterial({uniforms: {...shared, uPart: {value: 1}, uLag: {value: 1}, uAlpha: {value: 0}, uLow: {value: 0}, uSize: {value: new T.Vector2(1, 1)}}, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false}));
    mesh.frustumCulled = false; mesh.renderOrder = 19; mesh.visible = false; mesh.userData.environmentEffect = true;
    mesh.position.y = HEIGHT_ABOVE; actor.add(mesh);
    return mesh;
  }
  return {
    update(dt) {
      const s = world.sim.s, hero = world.hero.position, quiet = !!world.cinematic, viewHeight = world.viewHeight || world.canvas?.clientHeight || 800;
      const pixel = 2 * Math.tan(world.camera.fov * Math.PI / 360) / viewHeight;
      for (const [id, n] of world.npcs) {
        const st = s.people[id], max = st.maxHp || 100, a = n.actor, fighting = st.awareness?.state === 'fight' || !!n.chasing;
        // Everyone's last condition is remembered, so the first wound shows too; sight is only worked out for
        // someone whose stroke could be showing.
        let entry = bars.get(id);
        if (!entry) { bars.set(id, {v: stepVitality(null, {hp: st.hp, max, seen: false, now: world.t, dt}), mesh: null}); continue; }
        const live = entry.v.alpha > 0 || st.hp < entry.v.hp || fighting && st.hp > 0 && st.hp < max;
        const distance = live ? a.position.distanceTo(hero) : Infinity;
        const seen = live && distance < VITALITY.reach && visibleBetween(hero, a.position, world.obstacles, s.ecosystem?.objects);
        entry.v = stepVitality(entry.v, {hp: st.hp, max, fighting, seen, now: world.t, dt});
        // It thins out toward the edge of the distance at which it can be read.
        const alpha = quiet || !live ? 0 : entry.v.alpha * Math.max(0, Math.min(1, (VITALITY.reach - distance) / 3));
        if (alpha <= .01) { if (entry.mesh) entry.mesh.visible = false; continue; }
        const mesh = entry.mesh ??= bar(a), u = mesh.material.uniforms, scale = pixel * world.camera.position.distanceTo(a.position);
        mesh.visible = true; u.uPart.value = entry.v.part; u.uLag.value = entry.v.lag; u.uAlpha.value = alpha; u.uLow.value = entry.v.low ? 1 : 0; u.uSize.value.set(WIDTH * scale, HEIGHT * scale);
      }
    },
  };
}
