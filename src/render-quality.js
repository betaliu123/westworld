// Keeps the picture at full quality unless this machine cannot hold a playable frame rate. It then gives up
// shadow detail first and render resolution second, one step at a time. Quality is never raised again during
// a session, so the picture does not pump; a reload starts from full quality.
const SCALES = [1, .8, .65, .5];      // render resolution per step, as a share of the normal pixel ratio
const SLOW = 24;                      // mean ms per frame above which play feels sluggish (about 42 fps)
const WINDOW = 1500;                  // ms of frames behind each verdict
const START = 5000, SETTLE = 500;     // ms ignored at the start of play (assets, shaders) and after a change (buffers)
const GAIN = .94;                     // a resolution step must cut frame time by 6% to be worth its blur

// mode: 'auto' adapts, 'full' never lowers quality, 'low' starts at the lowest step.
export function renderQuality(mode = 'auto') {
  let step = mode === 'low' ? SCALES.length : 0, locked = mode !== 'auto';
  let sum = 0, frames = 0, wait = START, slow = 0, before = 0, trial = false, wasted = 0, stalls = 0;
  return {
    get step() { return step; },
    // Step 1 halves shadow map size and refresh rate; later steps lower resolution.
    get lightShadows() { return step > 0; },
    get scale() { return SCALES[Math.max(0, step - 1)]; },
    // Takes the real time since the previous rendered frame; returns true when the quality just changed.
    frame(ms) {
      if (locked || !(ms > 0) || ms > 2000) return false; // the page was away
      if (wait > 0) { wait -= ms; return false; }
      sum += ms; frames++; if (ms > 250) stalls++;
      if (sum < WINDOW) return false;
      const mean = sum / frames, lone = stalls === 1 && frames > 1; sum = frames = stalls = 0;
      // One long frame among normal ones (loading, a tab switch) says nothing about render cost, so that stretch
      // is not judged. Several long frames are the frame rate: a choked graphics card paces frames unevenly.
      if (lone) return false;
      if (trial) {
        trial = false;
        // Fewer pixels bought nothing: the processor or a frame cap is the limit, so the sharpness comes back.
        // One retry is allowed in case the view simply got busier during the trial.
        if (mean > before * GAIN) { step--; slow = 0; wait = SETTLE; locked = ++wasted >= 2; return true; }
      }
      if (mean <= SLOW) { slow = 0; return false; }
      if (++slow < 2) return false;
      if (step >= SCALES.length) { locked = true; return false; }
      before = mean; step++; trial = step > 1; wait = SETTLE; slow = 1;
      return true;
    },
  };
}

// ?quality=full or ?quality=low pins the level, for comparisons and for showing the game on a known machine.
export const qualityMode = search => /[?&]quality=(full|low)\b/.exec(search || '')?.[1] || 'auto';
