import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

// NPC model check: stand at a spot, look toward the given yaw-drag, zoom, shoot; optionally draw the sword.
const [label = 'npc-gate', x = '0', z = '33', drag = '0', zoom = '-300', sword = ''] = process.argv.slice(2);
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: 1280, height: 850}})).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('503')) errors.push(m.text()); });
  const s = newArrival(); s.time = (10 * 60 - 360) / 6; s.player.x = +x; s.player.z = +z;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  await p.locator('#continue').click();
  await p.waitForTimeout(4000);
  const box = await p.locator('#world').boundingBox();
  if (+drag) { await p.mouse.move(box.width / 2, box.height / 2); await p.mouse.down({button: 'right'}); await p.mouse.move(box.width / 2 + +drag, box.height / 2, {steps: 8}); await p.mouse.up({button: 'right'}); }
  await p.mouse.move(box.width / 2, box.height / 2); await p.mouse.wheel(0, +zoom); await p.waitForTimeout(700);
  if (sword) { await p.keyboard.press('Slash'); await p.waitForTimeout(700); }
  await p.screenshot({path: `cc_task/2026-11-09-ink/${label}.png`});
  console.log(label, errors.length ? 'ERRORS ' + errors.slice(0, 6).join(' | ') : 'no browser errors');
} finally { await b.close(); }
