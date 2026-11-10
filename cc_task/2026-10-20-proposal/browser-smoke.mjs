import {chromium} from './browser/node_modules/playwright/index.mjs';
import {newGame} from '../../src/simulation.js';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:[]});
const checks=[],errors=[];let currentPage=null;const realSetTimeout=setTimeout;
async function start(roll=0.01){
 const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage();
 currentPage=page;page.setDefaultTimeout(45000);console.log('new context',roll);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"configured":false}'}));
 const state=newGame();state.player.x=-2.6;state.player.z=3.7;
 await page.addInitScript(({state,roll})=>{Math.random=()=>roll;if(!sessionStorage.getItem('test-seeded')){localStorage.setItem('jianghu-echoes-v1',JSON.stringify(state));sessionStorage.setItem('test-seeded','1');}}, {state,roll});
 await page.goto('http://127.0.0.1:8091/');await page.locator('#continue').click();await page.locator('#interact').click();
 await page.locator('[data-action="p_listen"]').waitFor();console.log('opening ready',roll);assert.equal(await page.locator('.proposal-choices button').count(),3);
 return {page,context};
}
try{
 const {page,context}=await start();
 await page.screenshot({path:'cc_task/2026-10-20-proposal/proposal-opening.png'});
 await page.locator('[data-action="p_listen"]').click();await page.locator('[data-action="p_persuade"]').waitFor();
 console.log('speech next ready');checks.push('After animation next-stage choices open automatically');
 await page.reload();await page.locator('#continue').click();await page.locator('#interact').click();await page.locator('[data-action="p_persuade"]').waitFor();
 checks.push('Reload restores the middle of the conversation');
 await page.locator('[data-action="p_persuade"]').click();await page.locator('[data-action="p_private"]').waitFor();
 await page.screenshot({path:'cc_task/2026-10-20-proposal/proposal-decision.png'});
 await page.locator('[data-action="p_private"]').click();await page.locator('#profile').click();await page.getByText('三条成长途径',{exact:true}).waitFor();
 assert.equal(await page.locator('.growth-path').count(),3);assert.match(await page.locator('#growth-paths').innerText(),/察言观色/);
 await page.screenshot({path:'cc_task/2026-10-20-proposal/growth-profile.png'});checks.push('Completion grants a visible social skill and evidence item');console.log('first complete');await context.close();
 const failed=await start(.999);await failed.page.locator('[data-action="p_watch"]').click();console.log('watched paper');await failed.page.locator('[data-action="p_take"]').waitFor();await failed.page.locator('[data-action="p_take"]').click();console.log('attempted theft');await failed.page.locator('[data-action="p_yield"]').waitFor();
 assert.match(await failed.page.locator('#panel').innerText(),/大失败/);await failed.page.screenshot({path:'cc_task/2026-10-20-proposal/caught.png'});
 await failed.page.locator('[data-action="p_yield"]').click();await failed.page.locator('[data-action="p_support"]').waitFor();checks.push('Failed theft immediately offers a recovery, without advancing the day');await failed.context.close();
 const fight=await start();await fight.page.locator('[data-action="p_interpose"]').click();await fight.page.locator('[data-action="p_duel"]').waitFor();await fight.page.locator('[data-action="p_duel"]').click();
 await fight.page.waitForTimeout(3200);await fight.page.keyboard.down('w');await fight.page.waitForTimeout(100);await fight.page.keyboard.up('w');await fight.page.keyboard.press('/');
 for(let i=0;i<3;i++){await fight.page.mouse.click(1000,400);await fight.page.waitForTimeout(600);}
 await fight.page.keyboard.press('e');await fight.page.locator('[data-action="p_private"]').waitFor({timeout:45000});
 checks.push('Sparring advances after three real canvas attacks');await fight.page.screenshot({path:'cc_task/2026-10-20-proposal/duel-result.png'});await fight.context.close();
 assert.deepEqual(errors,[]);checks.push('No browser runtime errors');
}catch(e){console.error(e);errors.push(String(e));if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:'cc_task/2026-10-20-proposal/browser-failure.png',timeout:5000}).catch(()=>{});}finally{await writeFile('cc_task/2026-10-20-proposal/browser-results.json',JSON.stringify({checks,errors},null,2));await Promise.race([browser.close(),new Promise(r=>realSetTimeout(r,5000))]);}
console.log(JSON.stringify({checks,errors},null,2));

process.exit(errors.length?1:0);
