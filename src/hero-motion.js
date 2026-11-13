import * as T from '../vendor/three.module.js';

// A small adapter, independent of the reference game's controller or quest state.
// Animation never translates the actor: navigation, collisions and jump physics own that.
export class HeroMotion {
  constructor(model, clips) {
    this.mixer = new T.AnimationMixer(model);
    this.actions = new Map(clips.map(clip => [clip.name, this.mixer.clipAction(clip)]));
    this.time = 0;
    this.base = null;
    this.once = null;
    this.wasAir = false;
    this.wasDead = false;
    this.weapon = false;
    this.suspended = false;
  }

  // skip starts the clip that many seconds in (the rest is fitted to duration); fade is the blend-in time.
  cue(name, duration, hold = false, {skip = 0, fade = .15} = {}) {
    if (!this.actions.has(name)) return false;
    this.once = {name, end: this.time + (duration || this.actions.get(name).getClip().duration), duration, hold};
    this.play(name, {once: true, duration, restart: true, skip, fade});
    return true;
  }

  play(name, {once = false, duration, restart = false, speed = 1, skip = 0, fade = .15} = {}) {
    const next = this.actions.get(name);
    if (!next) return;
    if (this.base !== name || restart) {
      const previous = this.actions.get(this.base);
      const phase = previous && !once && !this.once ? previous.time / previous.getClip().duration : 0;
      next.reset();
      next.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(duration ? (next.getClip().duration - skip) / duration : speed);
      next.time = once ? skip : (phase % 1) * next.getClip().duration;
      next.play();
      if (previous && previous !== next) {
        previous.fadeOut(fade);
        next.fadeIn(fade);
      }
      this.base = name;
    } else if (!once) next.setEffectiveTimeScale(speed);
  }

  reset() {
    this.mixer.stopAllAction();
    this.base = this.once = null;
    this.wasAir = this.wasDead = this.weapon = false;
    this.custodyPhase = null;
  }

  cancelAttack() {
    if (this.once?.name.startsWith('attack_')) this.once = null;
  }

  update(dt, state) {
    this.time += dt;
    const custody=state.custody;
    if(custody?.phase==='lift'&&this.actions.has('death')){
      if(this.custodyPhase!=='lift'){this.reset();this.play('death',{once:true,restart:true,fade:0});this.custodyPhase='lift';}
      const action=this.actions.get('death');action.paused=true;action.time=action.getClip().duration*(1-custody.progress);this.mixer.update(0);return true;
    }
    if(this.custodyPhase==='lift')this.reset();
    const dead = state.hp <= 0 && !custody;
    // Bespoke actions (flute, pressure points, eating) keep their own
    // hand/prop choreography; do not replace them with an unrelated stock clip.
    const hasCrouch = this.actions.has('crouch_idle') && this.actions.has('crouch_walk');
    const fallback = dead ? !this.actions.has('death') : (state.fallback || (state.crouched && !hasCrouch) || state.disguised);
    if (fallback) {
      if (!this.suspended) this.reset();
      this.suspended = true;
      this.weapon = state.armed;
      return false;
    }
    if (this.suspended) { this.reset(); this.suspended = false; }
    if (dead && !this.wasDead) this.cue('death', 1.25, true);
    if (!dead && this.wasDead) this.reset();
    this.wasDead = dead;
    if (!dead) {
      if (state.hurt) this.cue('hit', .36);
      if (state.armed !== this.weapon && !this.once) this.cue(state.armed ? 'draw' : 'sheathe');
      this.weapon = state.armed;
      const air = state.airborne;
      if (air && !this.wasAir) this.cue(state.speed > .5 ? 'jump_fwd' : 'jump_up', .3);
      if (!air && this.wasAir) this.cue('land', .25);
      this.wasAir = air;
    }
    if (this.once && !this.once.hold && this.time >= this.once.end) this.once = null;
    if (!this.once) {
      if (state.airborne) {
        if(!this.actions.has('fall')){this.reset();return false;}
        this.play('fall');
      }
      else {
        const speed = state.speed || 0;
        const name = state.crouched && hasCrouch ? (speed < .15 ? 'crouch_idle' : 'crouch_walk')
          : speed < .15 ? (state.armed ? 'idle_sword' : 'stand_idle')
          : state.armed ? 'run_sword' : speed < 1.8 ? 'walk' : speed < 4.3 ? 'jog' : 'sprint';
        if(!this.actions.has(name)){this.reset();return false;}
        const authoredSpeed = {crouch_walk: 1.15, walk: 1.4, jog: 3.3, sprint: 6.2, run_sword: 3.6}[name];
        this.play(name, {speed: authoredSpeed ? T.MathUtils.clamp(speed / authoredSpeed, .45, 1.5) : 1});
      }
    }
    this.mixer.update(dt);
    return true;
  }
}
