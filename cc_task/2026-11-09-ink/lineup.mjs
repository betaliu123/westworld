import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';

// Shoot lineup.html once every model has mounted. Args: output label, query string.
const [label = 'lineup', query = ''] = process.argv.slice(2);
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: 1600, height: 900}})).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await p.goto('http://127.0.0.1:8091/cc_task/2026-11-09-ink/lineup.html' + query);
  await p.waitForFunction(() => /^(\d+)\/\1$/.test(document.title), null, {timeout: 60000}).catch(() => errors.push('not all models ready: ' + p.title()));
  await p.waitForTimeout(800);
  await p.screenshot({path: `cc_task/2026-11-09-ink/${label}.png`});
  console.log(label, await p.title(), errors.length ? 'ERRORS ' + errors.slice(0, 6).join(' | ') : 'no browser errors');
} finally { await b.close(); }
