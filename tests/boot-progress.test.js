import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {loadShare, trackBoot} from '../src/boot-progress.js';

function screen(p = '') {
  const style = {values: {'--p': p}, getPropertyValue(k) { return this.values[k] ?? ''; }, setProperty(k, v) { this.values[k] = String(v); }};
  const label = {textContent: '研墨'}, attrs = {}, classes = new Set(['loading']);
  const bar = {style, dataset: {}, querySelector: () => label, setAttribute: (k, v) => { attrs[k] = v; }};
  return {bar, label, attrs, classes, root: {querySelector: () => bar, classList: {remove: c => classes.delete(c)}}};
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
const settle = () => new Promise(r => setTimeout(r, 0));

test('the stroke goes from where the scripts left it to full, one equal step per finished load, and never back', () => {
  assert.equal(loadShare(.5, 0, 4), .5); assert.equal(loadShare(.5, 2, 4), .75); assert.equal(loadShare(.5, 4, 4), 1);
  assert.equal(loadShare(.5, 9, 4), 1, 'never past full'); assert.equal(loadShare(.3, 0, 0), 1, 'nothing to load is already full');
  let last = 0; for (let done = 0; done <= 40; done++) { const p = loadShare(.57, done, 40); assert.ok(p >= last); last = p; }
});

test('the entries appear only when every load has finished; a failed load counts and does not stall the stroke', async () => {
  const s = screen('0.5'), a = deferred(), b = deferred(), c = deferred();
  const finished = trackBoot(s.root, [a.promise, b.promise, c.promise]);
  assert.equal(s.bar.dataset.phase, 'models'); assert.notEqual(s.label.textContent, '研墨'); assert.equal(s.bar.style.values['--p'], '0.5');
  a.resolve(true); await settle();
  assert.ok(Math.abs(+s.bar.style.values['--p'] - (.5 + .5 / 3)) < 1e-9); assert.equal(s.attrs['aria-valuenow'], 67); assert.ok(s.classes.has('loading'));
  b.reject(new Error('model missing')); await settle();
  assert.ok(Math.abs(+s.bar.style.values['--p'] - (.5 + 1 / 3)) < 1e-9); assert.ok(s.classes.has('loading'), 'one still loading');
  c.resolve(false); await finished;
  assert.equal(+s.bar.style.values['--p'], 1); assert.equal(s.attrs['aria-valuenow'], 100); assert.equal(s.classes.has('loading'), false);
});

test('the title screen starts in its loading state with a still to show, and the game finishes the stroke', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), css = readFileSync(new URL('../opening.css', import.meta.url), 'utf8'), main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(html, /<section id="welcome" class="loading">/); assert.match(html, /id="boot" role="progressbar"/);
  assert.ok(html.indexOf('PerformanceObserver') < html.indexOf('src/main.js'), 'the first stretch runs before the game scripts');
  const still = css.match(/url\((assets\/ui\/[^)]+)\)/)?.[1]; assert.ok(still); assert.ok(html.includes(`href="${still}"`), 'the still is preloaded');
  assert.ok(existsSync(new URL('../' + still, import.meta.url)), 'the still exists');
  assert.match(main, /trackBoot\(\$\('welcome'\),world\.modelLoads\)/);
});
