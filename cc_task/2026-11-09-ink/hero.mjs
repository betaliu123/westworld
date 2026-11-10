import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

// Close shots of the skinned hero: idle, walking, crouched, sword drawn; `nohat` takes the hat off through the pack.
const hatOff = process.argv[2] === 'nohat', disguised = process.argv[2] === 'disguise';
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const c = await b.newContext({viewport: {width: 1280, height: 850}});
  const p = await c.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('503')) errors.push(m.text()); });
  const s = newArrival(); s.time = (10 * 60 - 360) / 6; s.player.x = 6; s.player.z = 36;
if (disguised) s.player.disguise = 'runner';
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  await p.locator('#continue').click();
  await p.waitForTimeout(2500);
  if (hatOff) {
    await p.getByRole('button', {name: /竹编斗笠/}).click();
    await p.getByRole('button', {name: '摘下斗笠'}).click();
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  }
  const canvas = p.locator('#world');
  const shot = async name => { await p.screenshot({path: `cc_task/2026-11-09-ink/hero-${hatOff ? 'nohat-' : disguised ? 'disguise-' : ''}${name}.png`, clip: {x: 390, y: 170, width: 500, height: 560}}); };
  const box = await canvas.boundingBox();
  await p.mouse.move(box.width / 2, box.height / 2); await p.mouse.down({button: 'right'});
  await p.mouse.move(box.width / 2 + 520, box.height / 2, {steps: 12}); await p.mouse.up({button: 'right'});
  await p.mouse.wheel(0, -900); await p.waitForTimeout(600);
  await shot('idle');
  if (!hatOff && !disguised) {
    await p.keyboard.down('s'); await p.waitForTimeout(450); await shot('walk'); await p.keyboard.up('s');
    await p.waitForTimeout(500);
    await p.keyboard.press('z'); await p.waitForTimeout(700); await shot('crouch'); await p.keyboard.press('z');
    await p.waitForTimeout(500);
    await p.keyboard.press('/'); await p.waitForTimeout(700); await shot('sword'); await p.keyboard.press('/');
  }
  console.log(process.argv[2] || 'hat', errors.length ? 'ERRORS ' + errors.slice(0, 5).join(' | ') : 'no browser errors');
} finally { await b.close(); }
