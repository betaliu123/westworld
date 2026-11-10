export const SWINGS = [
  {duration: .64, strike: .25},
  {duration: .64, strike: .27},
  {duration: .86, strike: .36},
];

// One buffered input, one impact per swing. No target/roll is cached: the actual
// hit checks the current reach, facing and obstruction at the contact frame.
export class HeroCombat {
  constructor() { this.cancel(); this.clock = 0; this.lastEnd = -Infinity; this.combo = -1; }
  cancel() { this.swing = null; this.queued = undefined; }
  begin(target = null) {
    if (this.swing) {
      if (this.swing.age >= .1) this.queued = target;
      return null;
    }
    this.combo = this.clock - this.lastEnd < .38 ? (this.combo + 1) % SWINGS.length : 0;
    this.swing = { ...SWINGS[this.combo], age: 0, hit: false, target, index: this.combo };
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
    if (swing.age >= swing.duration) {
      const queued = this.queued;
      this.swing = null; this.queued = undefined; this.lastEnd = this.clock;
      if (queued !== undefined) next(queued);
    }
  }
  get remaining() { return this.swing ? Math.max(0, this.swing.duration - this.swing.age) : 0; }
}
