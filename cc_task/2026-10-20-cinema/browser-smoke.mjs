import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {newGame} from '../../src/simulation.js';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const errors=[],checks=[];let page;
async function start(type){const context=await browser.newContext({viewport:{width:1280,height:850}});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));const s=newGame();
 if(type==='gang'){s.event.status='resolved';s.player.x=0;s.player.z=9;s.street={time:0,nextAt:100,cursor:0,sequence:1,pending:[],factions:{青竹会:0,赤砂帮:0},layoutVersion:2,active:{id:1,type:'gang',cast:['qing','chi','guard'],elapsed:0,lastHit:0,line:0,arrived:true,attempts:[],positions:{qing:{x:-.65,z:7},chi:{x:.65,z:7},guard:{x:0,z:9.5}}}};}
 else if(type==='confidence'){s.event={id:1,type,depth:1,status:'active'};s.player.x=9;s.player.z=11;}
 else{s.player.x=-2.6;s.player.z=3.7;}
 await page.addInitScript(s=>{Math.random=()=>.999;if(!sessionStorage.getItem('seed')){localStorage.setItem('jianghu-echoes-v1',JSON.stringify(s));sessionStorage.setItem('seed','1');}},s);
 await page.goto('http://127.0.0.1:8091/');await page.locator('#continue').click();await page.locator('#interact').click();await page.locator('#dialogue-stage').waitFor();return context;
}
async function finish(){for(let i=0;i<30&&await page.locator('#dialogue-stage').isVisible();i++)await page.locator('[data-next]').click();}
try{
 let context=await start('gang');await page.screenshot({path:'cc_task/2026-10-20-cinema/gang-opening.png'});const time=await page.evaluate(()=>JSON.parse(localStorage.getItem('jianghu-echoes-v1')).street.time);await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jianghu-echoes-v1')).street.time),time);checks.push('Reading dialogue freezes story clock');
 await finish();assert.equal(await page.locator('#street-panel [data-choice]').count(),3);await page.locator('[data-choice="mediate"]').click();await page.locator('#dialogue-stage').waitFor();await page.screenshot({path:'cc_task/2026-10-20-cinema/gang-failed-close.png'});await page.keyboard.press('Space');await page.waitForTimeout(400);await page.screenshot({path:'cc_task/2026-10-20-cinema/gang-failed-reverse.png'});await finish();await page.locator('[data-choice="resolve_aid"]').waitFor();checks.push('Failed mediation returns three meaningful follow-up choices');await page.screenshot({path:'cc_task/2026-10-20-cinema/gang-followup.png'});
 await page.reload();await page.locator('#continue').click();await page.locator('#interact').click();await finish();await page.locator('[data-choice="resolve_aid"]').click();await page.locator('#dialogue-stage').waitFor();await finish();const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('jianghu-echoes-v1')));assert.equal(state.street.active,null);assert.ok(state.player.inventory.includes('两帮通行凭据'));checks.push('Follow-up persists through reload and settles once');await context.close();
 context=await start('proposal');await page.screenshot({path:'cc_task/2026-10-20-cinema/proposal-two-shot.png'});await page.keyboard.press('Escape');await page.locator('[data-action="p_listen"]').click();await page.locator('#dialogue-stage').waitFor();await finish();await page.locator('[data-action="p_persuade"]').waitFor();checks.push('Proposal opening and result use cinema, Esc skips text without choosing');await context.close();
 context=await start('confidence');await finish();await page.locator('[data-action="c_ask"]').click();await page.locator('#dialogue-stage').waitFor();await finish();await page.locator('[data-action="c_agree"]').waitFor();checks.push('Confidence keeps second decision after failed first check');await context.close();
 assert.deepEqual(errors,[]);
}catch(e){errors.push(e.stack);if(page&&!page.isClosed())await page.screenshot({path:'cc_task/2026-10-20-cinema/browser-error.png'});process.exitCode=1;}finally{await writeFile('cc_task/2026-10-20-cinema/browser-results.json',JSON.stringify({checks,errors},null,2));await browser.close();console.log(JSON.stringify({checks,errors},null,2));}
