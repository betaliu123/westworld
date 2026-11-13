// The loading stroke on the title screen has two stretches. While the scripts are still arriving nothing of the game
// runs, so an inline script in index.html moves the stroke as files come in (their number is not known in advance, so it
// only approaches a share of the whole). Once the world exists this module takes the stroke from wherever it stands
// to full, one equal step per model that has finished loading, and then lets the entries appear.

// Where the stroke stands with `done` of `total` loads finished, having started this stretch at `from`.
export const loadShare = (from, done, total) => total > 0 ? from + (1 - from) * Math.min(done, total) / total : 1;

// A load that failed still counts as finished: the stroke must not stall on it. Entering then reports the failure itself.
export function trackBoot(screen, loads) {
  const bar = screen.querySelector('#boot'), from = Math.min(1, Math.max(0, parseFloat(bar.style.getPropertyValue('--p')) || 0));
  let done = 0;
  const paint = () => { const p = loadShare(from, done, loads.length); bar.style.setProperty('--p', p); bar.setAttribute('aria-valuenow', Math.round(p * 100)); };
  bar.dataset.phase = 'models'; bar.querySelector('span').textContent = '点染人物';
  paint();
  return Promise.all(loads.map(load => Promise.resolve(load).catch(() => {}).then(() => { done++; paint(); })))
    .then(() => { screen.classList.remove('loading'); });
}
