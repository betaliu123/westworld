import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

const [label = 'ink', query = '', hour = '10', width = '1280', height = '850'] = process.argv.slice(2);
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const c = await b.newContext({viewport: {width: +width, height: +height}, deviceScaleFactor: 1});
  const p = await c.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const s = newArrival();
  s.time = (+hour * 60 - 360) / 6;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/' + query);
  await p.locator('#continue').click();
  await p.waitForTimeout(2500);
  await p.screenshot({path: `cc_task/2026-11-09-ink/${label}.png`});
  console.log(label, errors.length ? 'ERRORS ' + errors.slice(0, 5).join(' | ') : 'no browser errors');
} finally { await b.close(); }
