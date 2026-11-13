// skip: seconds of the clip's wind-up that are not played, so contact follows the click sooner.
// chain: from this age a buffered click starts the next swing instead of waiting out the recovery.
export const SWINGS = [
  {duration: .5, strike: .14, chain: .38, skip: .1},
  {duration: .5, strike: .16, chain: .38, skip: .1},
  {duration: .68, strike: .21, chain: .54, skip: .14},
];

export const SWING_COST = 8;

// A quick step out of reach. It grants no immunity: a blow misses only because, at its contact frame,
// the body really is somewhere else. It starts fast and settles: dodgeTravel is the ground covered by a given age.
export const DODGE = {time: .26, distance: 3.1, cost: 10, cooldown: .55};
export const dodgeTravel = age => { const k = Math.min(1, Math.max(0, age / DODGE.time)); return DODGE.distance * (1 - (1 - k) ** 2); };

// A swing at an opponent standing just out of reach steps in during its wind-up.
// sight: how far away such an opponent is noticed; keep: the distance the step stops at; reach: the most it covers.
export const LUNGE = {sight: 3.8, keep: 2, reach: 1.4};

// What a landed blow does to the picture: a held frame, a camera jolt and a brief narrowing of the view.
// stop is seconds of near-stillness; shake and punch are 0..1.
export const IMPACT = {
  light: {stop: .045, shake: .1, punch: .3},
  down: {stop: .11, shake: .22, punch: .7},
  hurt: {stop: .05, shake: .24, punch: .45},
  guard: {stop: .03, shake: .07, punch: .15},
};
export class ImpactFeel {
  constructor(calm = false) { this.stop = this.shake = this.punch = 0; this.calm = calm; }
  // calm (reduced motion) keeps the held frame but drops the camera movement.
  hit({stop = 0, shake = 0, punch = 0} = {}) {
    this.stop = Math.max(this.stop, stop);
    if (!this.calm) { this.shake = Math.max(this.shake, shake); this.punch = Math.max(this.punch, punch); }
  }
  // Real frame time in, world time out.
  step(dt) {
    const held = Math.min(dt, this.stop);
    this.stop -= held;
    this.shake *= Math.exp(-dt * 11); this.punch *= Math.exp(-dt * 9);
    if (this.shake < .004) this.shake = 0;
    if (this.punch < .004) this.punch = 0;
    return dt - held * .94;
  }
}

// One buffered input, one impact per swing. No target/roll is cached: the actual
// hit checks the current reach, facing and obstruction at the contact frame.
export class HeroCombat {
  constructor(swings=SWINGS) { this.swings=swings;this.cancel(); this.clock = 0; this.lastEnd = -Infinity; this.combo = -1; }
  cancel() { this.swing = null; this.queued = undefined; }
  begin(target = null) {
    if (this.swing) {
      if (this.swing.age >= .1) this.queued = target;
      return null;
    }
    this.combo = this.clock - this.lastEnd < .38 ? (this.combo + 1) % this.swings.length : 0;
    this.swing = { ...this.swings[this.combo], age: 0, hit: false, target, index: this.combo };
    return this.swing;
  }
  step(dt, allowed, impact, next) {
    this.clock += dt;
    if (!allowed) { this.cancel(); return; }
    const swing = this.swing;
    if (!swing) return;
    swing.age += dt;
    if (!swing.hit && swing.age >= swing.strike) {
      swing.hit = true;
      impact(swing.target);
    }
    // The impact may trigger a dialogue, death, or other action that cancels us.
    if (this.swing !== swing) return;
    if (swing.age >= (this.queued !== undefined && swing.hit ? swing.chain ?? swing.duration : swing.duration)) {
      const queued = this.queued;
      this.swing = null; this.queued = undefined; this.lastEnd = this.clock;
      if (queued !== undefined) next(queued);
    }
  }
  get remaining() { return this.swing ? Math.max(0, this.swing.duration - this.swing.age) : 0; }
}
