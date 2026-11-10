import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';

// Game screenshot for the ink UI pass. Args: label width height hour [steps...]
// Steps: title (stay on title screen), e (press E), c (profile), f (bag), tab (letters), talk (E then first bubble), alt, z, slash, wait
const [label = 'game', w = '1280', h = '850', hour = '10', ...steps] = process.argv.slice(2);
const b = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const p = await (await b.newContext({viewport: {width: +w, height: +h}})).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('503') && !m.text().includes('404')) errors.push(m.text()); });
  const s = newArrival(); s.time = (+hour * 60 - 360) / 6; s.player.x = 0.6; s.player.z = 31.5;
  await p.addInitScript(s => localStorage.setItem('jianghu-echoes-v1', JSON.stringify(s)), s);
  await p.route('**/api/**', r => r.fulfill({status: 503, body: '{}'}));
  await p.goto('http://127.0.0.1:8091/');
  if (!steps.includes('title')) { await p.locator('#continue').click(); await p.waitForTimeout(3500); }
  else await p.waitForTimeout(1500);
  const keys = {space: 'Space', e: 'KeyE', c: 'KeyC', f: 'KeyF', tab: 'Tab', z: 'KeyZ', slash: 'Slash', j: 'KeyJ', esc: 'Escape'};
  for (const step of steps) {
    if (keys[step]) await p.keyboard.press(keys[step]);
    else if (step === 'alt') await p.keyboard.down('Alt');
    else if (step === 'talk') { await p.keyboard.press('KeyE'); await p.waitForTimeout(500); await p.locator('#panel button, .npc-actions button').first().click().catch(() => {}); }
    else if (step === 'wait') await p.waitForTimeout(1500);
    else if (step.startsWith('click=')) await p.locator(step.slice(6)).first().click({timeout: 3000}).catch(e => console.log('  click failed', step, e.message.split('\n')[0]));
    else if (/^[wasd]=\d+$/.test(step)) { const k = 'Key' + step[0].toUpperCase(); await p.keyboard.down(k); await p.waitForTimeout(+step.slice(2)); await p.keyboard.up(k); }
    else if (step === 'near') console.log('  interact:', await p.evaluate(() => [document.getElementById('interact')?.textContent, document.getElementById('interact')?.hidden]));
    else if (step === 'mockresult' || step === 'mockfail') await p.evaluate(ok => {
      // Same markup as renderResult in src/main.js, with sample data; visual check only.
      const r = document.getElementById('result'); r.hidden = false; r.className = 'ink-in ' + (ok ? 'passed' : 'failed');
      r.innerHTML = `<header class="result-head"><span class="ink-seal result-seal${ok ? '' : ' hollow'}" title="成功率 58%">${ok ? '成功' : '失败'}</span><h3>偷取差役服</h3>${ok ? '' : '<span class="ink-tag" title="事情还没结束">未了</span>'}</header><p>${ok ? '衣架后无人回头，你把差役服卷进包袱。' : '手刚碰到衣角，晾衣的老差役咳了一声。'}</p><div class="result-chips">${ok ? '<span class="ink-chip up">差役服 +1</span><span class="ink-chip">机敏历练 +2</span>' : '<span class="ink-chip down">风仪 -2</span><span class="ink-chip down">嫌疑 +1</span>'}</div><p class="hint">${ok ? '穿上它，守卫未必认得出你。' : '老差役记住了你的脸。'}</p>`;
    }, step === 'mockresult');
    else if (step.startsWith('ms=')) await p.waitForTimeout(+step.slice(3));
    else if (step === 'buttons') console.log('  buttons:', await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.textContent.trim()).map(b => (b.closest('[id]')?.id || '') + ':' + b.textContent.trim().slice(0, 14)).join(' | ')));
    await p.waitForTimeout(600);
  }
  await p.screenshot({path: `cc_task/2026-11-10-ui/${label}.png`});
  const bad = await p.evaluate(() => {
    const out = new Map();
    for (const el of document.querySelectorAll('body *')) {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden]')) continue;
      const size = parseFloat(cs.fontSize), fam = cs.fontFamily;
      const key = (size < 14 ? `small ${size}px` : '') + (/YaHei|Segoe|Georgia|sans-serif/.test(fam.split(',')[0]) ? ' font ' + fam.split(',')[0] : '');
      if (key) out.set(key + ' ← ' + (el.id ? '#' + el.id : el.className || el.tagName) + ' in ' + (el.parentElement?.closest('[class],[id]')?.className || el.parentElement?.closest('[id]')?.id || ''), el.textContent.trim().slice(0, 16));
    }
    return [...out].slice(0, 30);
  });
  console.log(label, errors.length ? 'ERRORS ' + errors.slice(0, 5).join(' | ') : 'no browser errors');
  for (const [k, v] of bad) console.log('  ', k, '|', v);
} finally { await b.close(); }
