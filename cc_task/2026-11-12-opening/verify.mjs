import {chromium} from '../2026-10-20-proposal/browser/node_modules/playwright/index.mjs';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const workspace=process.cwd(),root=resolve(workspace,process.env.OPENING_ROOT||'.'),out=resolve(workspace,'cc_task/2026-11-12-opening',process.env.OPENING_VARIANT||'.');
await mkdir(out,{recursive:true});
const [{newArrival},{saveKey},{OPENING_SHOTS}]=await Promise.all(['simulation.js','save-state.js','opening-sequence.js'].map(file=>import(pathToFileURL(resolve(root,'src',file)).href)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
 try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(data);}
 catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.OPENING_BASE||`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const reports=[];
const savedProjection=s=>({role:s.role,stats:s.player.stats,money:s.player.money,hp:s.player.hp,inventory:s.player.inventory,opening:s.opening,gu:s.facts.guPoisonKnown,cure:s.facts.genyueCureRumor,chapterVersion:s.chapterVersion});
let fullProjection;
async function setup(name,width=1280,height=850,{state,reduced=false}={}){
 const scope='opening-'+name,key=saveKey({playtest:scope});
 const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
 const page=await context.newPage(),errors=[];
 page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,state,normalKey})=>{
  localStorage.setItem('jianghu-sound','off');
  if(!localStorage.getItem(normalKey))localStorage.setItem(normalKey,'DO-NOT-TOUCH-PLAYER-SAVE');
  if(state&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
 },{key,state,normalKey:saveKey()});
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.goto(base+'?playtest='+scope);
 await page.locator('#opening-sequence').waitFor({state:'attached'});
 const data={context,page,errors,key,scope};
 data.state=async()=>JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key));
 data.check=async()=>{
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey()),'DO-NOT-TOUCH-PLAYER-SAVE');
 };
 return data;
}
async function begin(t){await t.page.locator('#start').click();await t.page.locator('#opening-sequence').waitFor({state:'visible'});}
async function readyShot(page,id){await page.waitForFunction(id=>{
 const e=document.querySelector('#opening-sequence'),img=e.querySelector('img.current');
 return e.dataset.shot===id&&e.dataset.revealed==='true'&&img.complete&&img.naturalWidth>0;
},id);await page.evaluate(()=>document.fonts.ready);}
async function shotLayout(page){return page.locator('#opening-sequence').evaluate(root=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=e=>{const c=getComputedStyle(e);return !e.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&e.getBoundingClientRect().height>0;};
 const copy=root.querySelector('.opening-copy'),skip=root.querySelector('.opening-skip'),next=root.querySelector('.opening-next');
 return {shot:root.dataset.shot,copy:rect(copy),skip:rect(skip),next:rect(next),art:rect(root.querySelector('img.current')),fonts:[...root.querySelectorAll('p,button,span')].filter(visible).map(e=>({text:e.textContent,font:getComputedStyle(e).fontFamily,size:parseFloat(getComputedStyle(e).fontSize)})),text:[...copy.children].map(p=>p.textContent),image:root.querySelector('img.current').getAttribute('src'),animation:getComputedStyle(root.querySelector('img.current')).animationName};
});}
try{
 for(const [width,height]of [[1280,850],[1024,768],[800,600]]){
  const t=await setup('full-'+width,width,height),{page}=t;
  assert.equal(await page.locator('#roles,[data-role]').count(),0);
  await begin(t);await readyShot(page,'genyue');
  assert.equal(await t.state(),null,'opening must not create or overwrite a save');
  await page.keyboard.press('w');await page.keyboard.press('z');
  const first=await shotLayout(page);assert.deepEqual(first.text,OPENING_SHOTS[0].lines);assert.equal(first.image,OPENING_SHOTS[0].image);
  await page.screenshot({path:resolve(out,`genyue-${width}.png`)});
  await page.locator('.opening-next').click();await readyShot(page,'linxi');
  const second=await shotLayout(page);assert.deepEqual(second.text,OPENING_SHOTS[1].lines);assert.equal(second.image,OPENING_SHOTS[1].image);
  for(const l of [first,second]){
   for(const r of [l.copy,l.skip,l.next])assert.ok(r.x>=0&&r.y>=0&&r.right<=width&&r.bottom<=height,JSON.stringify(l));
   assert.ok(l.copy.bottom<=l.next.y,'captions and navigation must not overlap');
   for(const f of l.fonts){assert.ok(f.size>=14);assert.doesNotMatch(f.font,/Microsoft YaHei|Segoe|Georgia|sans-serif/);}
  }
  await page.screenshot({path:resolve(out,`linxi-${width}.png`)});
  await page.getByRole('button',{name:'入临溪',exact:true}).click();
  await page.locator('#welcome').waitFor({state:'hidden'});
  await page.locator('#aim-skills').waitFor({state:'visible'});
  const saved=await t.state();assert.equal(saved.player.money,12);assert.equal(saved.event.type,'gate');assert.equal(saved.opening.completed,true);
  assert.deepEqual(saved.player.stats,newArrival().player.stats);
  fullProjection=savedProjection(saved);
  await page.keyboard.press('z');await page.locator('#stealth-mode').waitFor({state:'visible'});
  await page.keyboard.press('z');await page.keyboard.press('c');await page.locator('#drawer').waitFor({state:'visible'});
  await page.keyboard.press('Escape');await page.locator('#drawer').waitFor({state:'hidden'});
  await page.screenshot({path:resolve(out,`exploration-${width}.png`)});
  await page.reload();await page.locator('#opening-sequence').waitFor({state:'attached'});
  await page.locator('#continue').click();await page.locator('#welcome').waitFor({state:'hidden'});
  assert.equal(await page.locator('#opening-sequence').isVisible(),false,'resume must not replay');
  await t.check();reports.push({case:'full-'+width,first,second,projection:fullProjection,errors:t.errors});
  console.log(`PASS ${width}x${height}: images, exact subtitles, fonts/bounds, controls, save/resume`);
  await t.context.close();
 }
 for(const how of ['button','escape','second']){
  const t=await setup('skip-'+how),{page}=t;await begin(t);
  if(how==='second'){
   // One click reveals the rest, another advances the picture.
   await page.keyboard.press('Enter');
   if(await page.locator('#opening-sequence').getAttribute('data-shot')==='genyue')await page.keyboard.press('Enter');
   assert.equal(await page.locator('#opening-sequence').getAttribute('data-shot'),'linxi');
  }
  if(how==='escape')await page.keyboard.press('Escape');else await page.getByRole('button',{name:'跳过开场'}).click();
  await page.locator('#welcome').waitFor({state:'hidden'});
  assert.deepEqual(savedProjection(await t.state()),fullProjection,'skip must have the same initial facts, money and inventory');
  await t.check();reports.push({case:'skip-'+how,errors:t.errors});await t.context.close();
 }
 console.log('PASS: skip at either image and Escape share full-view initial state');
 {
  const old=newArrival('scholar');old.player.money=177;old.people.tea.relation=17;old.facts.keptOpeningTest=true;
  const t=await setup('existing',1280,850,{state:old}),{page}=t;
  await page.locator('#start').click();assert.equal(await page.locator('#opening-sequence').isVisible(),false);
  assert.equal((await t.state()).player.money,177);
  await page.locator('#start').click();await page.locator('#opening-sequence').waitFor({state:'visible'});
  assert.equal((await t.state()).player.money,177,'old save must survive unfinished opening');
  await page.reload();await page.locator('#opening-sequence').waitFor({state:'attached'});
  await page.locator('#continue').click();await page.locator('#welcome').waitFor({state:'hidden'});
  const resumed=await t.state();assert.equal(resumed.role,'scholar');assert.equal(resumed.player.money,177);assert.equal(resumed.people.tea.relation,17);assert.equal(resumed.facts.keptOpeningTest,true);assert.equal(resumed.opening,undefined);assert.deepEqual(resumed.player.stats,old.player.stats);
  assert.equal(await page.locator('#opening-sequence').isVisible(),false);
  await t.check();reports.push({case:'existing-and-cancel-restart',errors:t.errors});await t.context.close();
 }
 console.log('PASS: existing origin/stats/relationships kept; aborted new opening does not overwrite');
 {
  const t=await setup('ingame-restart'),{page}=t;
  await begin(t);await page.keyboard.press('Escape');await page.locator('#welcome').waitFor({state:'hidden'});
  await page.locator('#rest').click();await page.locator('[data-restart]').click();
  await page.locator('[data-cancel-restart]').click();assert.equal(await page.locator('#opening-sequence').isVisible(),false);
  await page.locator('[data-restart]').click();await page.locator('[data-confirm-restart]').click();
  await page.locator('#opening-sequence').waitFor({state:'visible'});await readyShot(page,'genyue');
  await page.keyboard.press('Escape');await page.locator('#welcome').waitFor({state:'hidden'});
  assert.deepEqual(savedProjection(await t.state()),fullProjection);
  await t.check();reports.push({case:'ingame-restart',errors:t.errors});await t.context.close();
 }
 console.log('PASS: confirmed in-game restart replays opening and restores default starting state');
 {
  const t=await setup('reduced',800,600,{reduced:true});await begin(t);await readyShot(t.page,'genyue');
  const l=await shotLayout(t.page);assert.equal(l.animation,'none');
  await t.page.keyboard.press('Escape');await t.check();reports.push({case:'reduced-motion',layout:l});await t.context.close();
 }
 {
  const t=await setup('missing-image');
  await t.page.route('**/assets/opening/genyue-ink-v4.png',r=>r.abort());
  await t.page.reload();await t.page.locator('#opening-sequence').waitFor({state:'attached'});await begin(t);
  await t.page.locator('.opening-image-error').waitFor({state:'visible'});
  await t.page.unroute('**/assets/opening/genyue-ink-v4.png');await t.page.locator('.opening-retry').click();await readyShot(t.page,'genyue');
  assert.equal(await t.page.locator('.opening-image-error').isVisible(),false);
  await t.page.keyboard.press('Escape');await t.page.locator('#welcome').waitFor({state:'hidden'});await t.check();reports.push({case:'image-retry',errors:t.errors});await t.context.close();
 }
 console.log('PASS: reduced motion and recoverable image loading');
 await writeFile(resolve(out,'audit.json'),JSON.stringify(reports,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
