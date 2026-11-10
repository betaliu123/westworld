import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11']});
try {
  const p = await (await b.newContext({viewport: {width: 1280, height: 850}})).newPage();
  const s = newArrival(); s.time = (10 * 60 - 360) / 6; s.player.x = 6; s.player.z = 36;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  await p.locator('#continue').click();
  await p.waitForTimeout(2500);
  await p.getByRole('button', {name: /竹编斗笠/}).click();
  const labels = await p.locator('button').allInnerTexts();
  console.log('hat buttons', labels.filter(t => t.includes('斗笠')));
  await p.getByRole('button', {name: '摘下斗笠'}).click();
  await p.waitForTimeout(500);
  console.log('after click', await p.locator('button').allInnerTexts().then(l => l.filter(t => t.includes('斗笠'))));
  console.log(await p.evaluate(() => {
    const d = globalThis.__heroDebug;
    if (!d) return 'no debug handle';
    const w = d.wrapper.getWorldPosition(new d.actor.position.constructor());
    const names = []; d.wrapper.traverse(o => { if (o.isMesh || o.name === 'Hat') names.push(o.type + ':' + o.name + ':' + o.visible); });
    const inModel = new Set(); d.wrapper.traverse(o => inModel.add(o));
    const others = [];
    d.actor.traverse(o => {
      if (!o.isMesh || inModel.has(o)) return;
      let vis = true; for (let n = o; n; n = n.parent) vis &&= n.visible;
      if (vis) others.push(o.name + '@' + o.parent?.name + ':' + o.geometry.type + ':' + (o.material.color?.getHexString?.()));
    });
    const geo = []; d.wrapper.traverse(o => { if (o.isMesh) geo.push(o.name + ':' + Object.keys(o.geometry.attributes).join(',') + ':vc=' + o.material.vertexColors); });
    return JSON.stringify({wrapperVisible: d.wrapper.visible, hatVisible: d.hat?.visible, visibleBody: d.body.filter(m => m.visible).length, names, others, geo});
  }));
} finally { await b.close(); }
