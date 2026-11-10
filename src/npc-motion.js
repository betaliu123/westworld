import * as T from '../vendor/three.module.js';

// Presentation temperament, independent from relationship/check randomness.
const PROFILES = {
  reserved: {idles:['idle','stand_relaxed','idle'], gesture:.16, chance:.5},
  composed: {idles:['stand_relaxed','breathe','idle'], gesture:.22, chance:.65},
  elder: {idles:['elder_idle','breathe','elder_idle'], gesture:.17, chance:.55},
  lively: {idles:['stand_relaxed','breathe','idle_weightshift'], gesture:.34, chance:.8},
};
export function npcMotionProfile(id, kind) {
  if (['old_constable','elder','beggar'].includes(id)) return 'elder';
  if (['traveler','inspector','gang_boss','scribe'].includes(id) || ['prince','guard'].includes(kind)) return 'reserved';
  if (['gate_merchant','merchant','matchmaker','inn','tea_host','qing'].includes(id)) return 'lively';
  return 'composed';
}

// Rendering only. Never move the actor root or change gameplay/check results.
export function npcMotionName(state, variation = 0) {
  if (state.hp <= 0 || state.fallback || state.armed || state.stunned) return null;
  if (state.speed > .12) return 'walk';
  if (state.seated) return state.talking && !state.upperBody ? 'sit_talk' : 'sit_idle';
  if (state.talking && !state.upperBody) return state.angry ? 'argue' : variation ? 'question' : 'talk';
  return state.formal && !state.upperBody ? 'idle' : 'breathe';
}

export class NpcMotion {
  constructor(model, clips, seed = .5, walkSpeed = 1.8, profile = 'composed') {
    this.mixer = new T.AnimationMixer(model);
    this.actions = new Map(clips.map(c => [c.name, this.mixer.clipAction(c)]));
    this.seed = ((seed % 1) + 1) % 1;
    this.walkSpeed = walkSpeed;
    this.weights = new Map();
    this.current = null; this.speed = 0; this.turn = 0;
    this.profile = PROFILES[profile] || PROFILES.composed;
    this.randomState = (this.seed * 0xffffffff) >>> 0 || 1;
    this.idleAge = Infinity; this.speechAge = 0; this.idle = null; this.gestureWeight = 0;
  }
  random() {
    this.randomState = (Math.imul(this.randomState,1664525) + 1013904223) >>> 0;
    return this.randomState / 0x100000000;
  }
  chooseIdle() {
    const pool=this.profile.idles.filter(n=>this.actions.has(n));
    const other=pool.filter(n=>n!==this.idle);
    const available=other.length?other:pool;
    this.idle=available.length?available[Math.floor(this.random()*available.length)]:'breathe';
    this.idleAge=0; this.idleDuration=12+this.random()*9;
  }
  reset() {
    this.mixer.stopAllAction(); this.weights.clear();
    this.current = null; this.speed = 0; this.wasTalking = false;
  }
  update(dt, state) {
    if (!npcMotionName(state)) { if (this.current) this.reset(); return false; }
    const speaking = state.talking && !state.upperBody;
    if (speaking && !this.wasTalking) this.turn++;
    const newSpeech = speaking && !this.wasTalking;
    this.wasTalking = speaking;
    this.idleAge += dt;
    if (!this.idle || newSpeech || (this.idleAge>this.idleDuration && !speaking && !state.upperBody)) this.chooseIdle();
    if(newSpeech) { this.speechAge=0; this.gestureWeight=this.random()<this.profile.chance?this.profile.gesture:0; }
    this.speechAge+=dt;
    const variation = (this.turn + Math.floor(this.seed * 7)) % 3 === 0;
    const raw = Math.max(0, state.speed || 0);
    this.speed += (raw - this.speed) * (1 - Math.exp(-10 * dt));
    const moving = this.speed > .04 && !(state.seated && raw < .12);
    // Shorten the stride at low speed instead of restarting walk on route corners.
    const walkWeight = moving ? T.MathUtils.smoothstep(this.speed, .04, .8) : 0;
    const idle = state.seated?'sit_idle':state.upperBody?'breathe':this.idle;
    const speech = state.seated?'sit_talk':state.angry?'argue':variation?'question':'talk';
    // Small intermittent expression, surrounded by breathing/listening, not constant gesticulation.
    const pulse=.35+.65*Math.pow(Math.sin(Math.min(this.speechAge,3)*Math.PI/3),2);
    const gesture = speaking && this.actions.has(speech) ? (state.angry?.7:this.gestureWeight*pulse) : 0;
    const desired = new Map([[idle, (1 - walkWeight)*(1-gesture)], ['walk', walkWeight]]);
    if(gesture) desired.set(speech,(1-walkWeight)*gesture);
    this.current = walkWeight > .02 ? 'walk' : gesture>.5?speech:idle;
    if (!this.actions.has(this.current)) { this.reset(); return false; }
    if (!this.weights.size) for (const [name, weight] of desired) this.weights.set(name, weight);
    const blend = 1 - Math.exp(-12 * dt);
    for (const [name, action] of this.actions) {
      const goal = desired.get(name) || 0, old = this.weights.get(name) || 0;
      const weight = old + (goal - old) * blend;
      this.weights.set(name, weight);
      if (weight < .0001 && goal === 0) {
        action.setEffectiveWeight(0);
        if(name==='walk')action.setEffectiveTimeScale(0);
        continue;
      }
      if (!action.isScheduled()) {
        action.reset().setLoop(T.LoopRepeat, Infinity).play();
        action.time = /talk|question|argue/.test(name) ? 0 : this.seed * action.getClip().duration;
      } else if (newSpeech && name === speech) action.time = 0;
      action.setEffectiveWeight(weight);
      // Calibrated to the skeleton's leg scale. Zero weight preserves gait phase.
      action.setEffectiveTimeScale(name === 'walk'
        ? T.MathUtils.clamp(this.speed / (this.walkSpeed * Math.max(.35, walkWeight)), 0, 2.4)
        : .92 + this.seed * .12);
    }
    this.mixer.update(dt);
    return true;
  }
}
