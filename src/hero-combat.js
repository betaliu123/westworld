// skip: seconds of the clip's wind-up that are not played, so contact follows the click sooner.
// chain: from this age a buffered click starts the next swing instead of waiting out the recovery.
export const SWINGS = [
  {duration: .5, strike: .14, chain: .38, skip: .1},
  {duration: .5, strike: .16, chain: .38, skip: .1},
  {duration: .68, strike: .21, chain: .54, skip: .14},
];

export const SWING_COST = 4;

// Running speed in metres a second. With a blade drawn it is the fastest the armed run clip can follow without the feet sliding.
export const SPRINT = {plain: 6.2, armed: 5.2};

// A raised blade takes a blow from the front: chip is the share of damage that still gets through.
// A blow caught within `window` seconds of raising it is turned aside whole. Practice (trained) steadies both.
// Raising the blade again within `repress` seconds gives no such window, so hammering the key does not turn every blow.
export const GUARD = {cost: 6, chip: .4, chipTrained: .25, window: .25, windowTrained: .4, repress: .5};
export const guardChip = tier => tier >= 2 ? GUARD.chipTrained : GUARD.chip;
export const guardWindow = tier => tier >= 3 ? GUARD.windowTrained : GUARD.window;

// The ink wave: a cut thrown forward. It leaves the blade `release` seconds into the cast, travels `range` metres at `speed`,
// and strikes each person within `radius` of it once, `power` times as hard as an ordinary cut.
export const WAVE = {cooldown: 12, cast: .62, release: .2, speed: 16, range: 12, radius: 1.7, power: 1.5};

// A quick step out of reach. It grants no immunity: a blow misses only because, at its contact frame,
// the body really is somewhere else. It starts fast and settles: dodgeTravel is the ground covered by a given age.
export const DODGE = {time: .26, distance: 3.1, cost: 10, cooldown: .55};
export const dodgeTravel = age => { const k = Math.min(1, Math.max(0, age / DODGE.time)); return DODGE.distance * (1 - (1 - k) ** 2); };

// A swing at an opponent standing just out of reach steps in during its wind-up, and keeps after them if they give ground.
// sight: how far away such an opponent is noticed; keep: the distance the step stops at; reach: the most one swing covers;
// speed: the fastest the body is carried.
export const LUNGE = {sight: 3.8, keep: 2, reach: 1.4, speed: 9};
// Ground covered this frame toward an opponent `distance` away, so as to stand at striking distance when the cut lands.
export const lungeStep = (distance, left, untilStrike, dt) => {
  const gap = distance - LUNGE.keep;
  return gap > .02 && left > 0 ? Math.min(gap, left, LUNGE.speed * dt, gap * dt / Math.max(untilStrike, dt)) : 0;
};

// Bodies do not pass through each other in a fight: walking into an opponent stops this far off. Given the offset from
// them, standOff is the step back out; the quick step is exempt and slips past.
export const BODY_GAP = .8;
export const standOff = (x, z) => {
  const d = Math.hypot(x, z);
  return d < BODY_GAP && d > .01 ? {x: x / d * (BODY_GAP - d), z: z / d * (BODY_GAP - d)} : null;
};

// How near an object must be to take a cut that also has a person in its arc: nothing takes it from someone squarely faced
// and in plain view; otherwise the nearer of the two does.
export const FACED = .8;
export const objectReach = ({distance, align, clear}) => align > FACED && clear ? 0 : distance;

// What a landed blow does to the picture: a held frame, a camera jolt and a brief narrowing of the view.
// stop is seconds of near-stillness; shake and punch are 0..1.
export const IMPACT = {
  light: {stop: .065, shake: .2, punch: .42},
  down: {stop: .15, shake: .36, punch: .85},
  hurt: {stop: .06, shake: .3, punch: .5},
  guard: {stop: .04, shake: .12, punch: .2},
  parry: {stop: .16, shake: .3, punch: .7},
  cast: {stop: .05, shake: .26, punch: .6},
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
