import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

// Motion-feel probes: running stride, mid-jump, landing, and the first frames of a 180° direction change.
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: 1280, height: 850}})).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('503')) errors.push(m.text()); });
  const s = newArrival(); s.time = (10 * 60 - 360) / 6; s.player.x = 6; s.player.z = 36;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  await p.locator('#continue').click();
  await p.waitForTimeout(2500);
  const box = await p.locator('#world').boundingBox();
  await p.mouse.move(box.width / 2, box.height / 2); await p.mouse.down({button: 'right'});
  await p.mouse.move(box.width / 2 + 260, box.height / 2, {steps: 8}); await p.mouse.up({button: 'right'});
  await p.mouse.wheel(0, -900); await p.waitForTimeout(500);
  const clip = {x: 340, y: 120, width: 600, height: 640}, shot = n => p.screenshot({path: `cc_task/2026-11-09-ink/feel-${n}.png`, clip});
  await p.keyboard.down('d'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(900); await shot('run');
  await p.keyboard.up('ShiftLeft'); await p.waitForTimeout(300);
  await p.keyboard.press('Space'); await p.waitForTimeout(120); await shot('jump');
  await p.waitForTimeout(500); await shot('land');
  await p.keyboard.up('d'); await p.keyboard.down('a');
  for (let i = 0; i < 3; i++) await shot('turn-' + i);
  await p.keyboard.up('a');
  console.log(errors.length ? 'ERRORS ' + errors.slice(0, 5).join(' | ') : 'no browser errors');
} finally { await b.close(); }
