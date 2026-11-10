import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

// Gate-view skyline check with the HUD hidden. Args: label hour [x z up] ('up' drags the camera to look up).
const [label = 'skyline', hour = '10', x = '6', z = '36', yaw = ''] = process.argv.slice(2);
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: 1280, height: 850}})).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const s = newArrival(); s.time = (+hour * 60 - 360) / 6; s.player.x = +x; s.player.z = +z;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  const go = await p.locator('#continue').waitFor({state: 'visible', timeout: 15000}).then(() => true, () => false);
  if (!go) {
    console.log('no #continue;', errors.slice(0, 6).join(' | ') || 'no errors');
    console.log(await p.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.id || '-') + ':' + b.textContent.trim().slice(0, 12) + ':' + (b.offsetParent ? 'shown' : 'hidden')).join('  ')));
    await p.screenshot({path: `cc_task/2026-11-10-world/${label}.png`});
  } else {
    await p.locator('#continue').click();
    await p.waitForTimeout(4000);
    await p.addStyleTag({content: 'body>*:not(#world){visibility:hidden!important}'});
    await p.mouse.move(640, 425); await p.mouse.wheel(0, 400); await p.waitForTimeout(900);
    if (yaw === 'up') { await p.mouse.down({button: 'right'}); await p.mouse.move(640, 370, {steps: 6}); await p.mouse.up({button: 'right'}); await p.waitForTimeout(700); }
    await p.screenshot({path: `cc_task/2026-11-10-world/${label}.png`});
    console.log(label, errors.length ? 'ERRORS ' + errors.slice(0, 5).join(' | ') : 'no browser errors');
  }
} finally { await b.close(); }
