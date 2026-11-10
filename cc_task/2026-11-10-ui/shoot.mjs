import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';

// Full-page and per-section shots of the UI specimen. Arg: page name (default specimen).
const page = process.argv[2] || 'specimen';
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true});
try {
  const p = await (await b.newContext({viewport: {width: 1600, height: 900}})).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('requestfailed', r => errors.push('failed ' + r.url()));
  await p.goto(`http://127.0.0.1:8091/cc_task/2026-11-10-ui/${page}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.unicodeRange.slice(0, 12)));
  const sections = await p.$$('section');
  for (let i = 0; i < sections.length; i++) await sections[i].screenshot({path: `cc_task/2026-11-10-ui/${page}-${i}.png`});
  const icons = await p.$('#icons');
  if (icons) {
    const zoom = await (await b.newContext({viewport: {width: 1600, height: 900}, deviceScaleFactor: 2.5})).newPage();
    await zoom.goto(p.url()); await zoom.evaluate(() => document.fonts.ready); await zoom.waitForTimeout(500);
    await zoom.waitForSelector('#icons figure');
    await zoom.$eval('#icons', el => { el.style.gridTemplateColumns = 'repeat(8,90px)'; });
    await (await zoom.$('#icons')).screenshot({path: `cc_task/2026-11-10-ui/${page}-icons.png`});
  }
  console.log('loaded fonts:', fonts.join(' | '));
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no browser errors');
} finally { await b.close(); }
