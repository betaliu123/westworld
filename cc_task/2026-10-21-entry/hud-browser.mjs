import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newArrival} from '../../src/simulation.js';
import {choiceCheckText} from '../../src/dialogue.js';
import assert from 'node:assert/strict';
assert.match(choiceCheckText({stat:'charm',difficulty:78},{score:40,chance:5}),/成功率 5% · 极难/);
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{for(const [width,height] of [[1280,850],[1024,768],[800,600]]){
const c=await b.newContext({viewport:{width,height}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
const s=newArrival();await p.addInitScript(s=>localStorage.setItem('jianghu-echoes-v1',JSON.stringify(s)),s);await p.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));
await p.goto('http://127.0.0.1:8091/');await p.locator('#continue').click();await p.locator('#gate-objective svg').waitFor();await p.keyboard.press('z');await p.locator('#stealth-mode svg').waitFor();
const overlaps=await p.evaluate(()=>{document.getElementById('ambient').textContent='买两个饼。钱袋在这儿……路引可不能弄丢，明早还要出城。先等等，等他转过身，我再靠近些。';const ids=['vitals','gate-objective','party-ui','journal','ambient','stealth-mode','interact'];const rects=ids.map(id=>{const e=document.getElementById(id),s=getComputedStyle(e),r=e.getBoundingClientRect();return{id,r,visible:s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};}).filter(e=>e.visible);return rects.flatMap((a,i)=>rects.slice(i+1).filter(b=>a.r.left<b.r.right&&a.r.right>b.r.left&&a.r.top<b.r.bottom&&a.r.bottom>b.r.top).map(b=>a.id+' / '+b.id));});assert.deepEqual(overlaps,[]);
await p.screenshot({path:`cc_task/2026-10-21-entry/hud-${width}.png`});
// Exercise simultaneous details and verify the coordinator restores the underlying panel.
await p.evaluate(()=>{document.getElementById('result').hidden=false;document.getElementById('drawer').hidden=false;});await p.waitForFunction(()=>document.getElementById('result').classList.contains('hud-obscured'));assert.equal(await p.locator('#result').isVisible(),false);await p.evaluate(()=>document.getElementById('drawer').hidden=true);await p.waitForFunction(()=>!document.getElementById('result').classList.contains('hud-obscured'));assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: HUD bounds, icons, panel priority, no browser errors`);await c.close();
}}finally{await b.close();}
