import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

// Game frame with every DOM overlay hidden, used as the specimen backdrop. Args: label x z hour.
const [label = 'scene', x = '0', z = '35', hour = '10'] = process.argv.slice(2);
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: 1520, height: 1008}})).newPage();
  const s = newArrival(); s.time = (+hour * 60 - 360) / 6; s.player.x = +x; s.player.z = +z;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  await p.locator('#continue').click();
  await p.waitForTimeout(4500);
  await p.addStyleTag({content: 'body>*:not(#world){visibility:hidden!important}'});
  await p.mouse.move(760, 500); await p.mouse.wheel(0, -150); await p.waitForTimeout(900);
  await p.screenshot({path: `cc_task/2026-11-10-ui/${label}.png`});
  console.log(label, 'ok');
} finally { await b.close(); }
