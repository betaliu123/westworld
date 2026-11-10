import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';

// Load the Sumiro reference headless, save its scripts for reading, list every asset, and shoot once loaded.
const out = 'cc_task/2026-11-09-ink/ref/';
mkdirSync(out + 'src', {recursive: true});
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: 1280, height: 720}})).newPage();
  const assets = [];
  p.on('response', async r => {
    const url = r.url(), rel = url.replace('https://xikhar.github.io/sumiro/', '');
    let size = r.headers()['content-length'] || '?';
    if (/\.(m?js|json|html)(\?|$)/.test(url) || r.request().resourceType() === 'script') {
      try { const body = await r.body(); size = body.length; writeFileSync(out + 'src/' + rel.replace(/[\\/:?*"<>|]/g, '_'), body); } catch {}
    }
    assets.push(`${r.status()} ${rel} ${size}`);
  });
  await p.goto('https://xikhar.github.io/sumiro/', {waitUntil: 'load', timeout: 60000});
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(5000);
    const t = await p.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '');
    console.log('t+' + (i + 1) * 5 + 's', JSON.stringify(t));
    if (!/grinding ink/.test(t)) break;
  }
  await p.screenshot({path: out + '1-loaded.png', timeout: 90000}).catch(e => console.log('shot failed', e.message));
  writeFileSync(out + 'assets.txt', assets.join('\n'));
  console.log('assets', assets.length);
} finally { await b.close(); }
