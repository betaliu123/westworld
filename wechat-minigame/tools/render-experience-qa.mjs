import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import fs from 'node:fs';
import {harness} from '../tests/support/mobile-harness.mjs';
fs.mkdirSync('work/experience-qa',{recursive:true});
for(const [file,family]of [['wenkai-core','Mobile Body'],['wenkai-ext','Mobile Extra'],['notoserifsc-600','Mobile Numbers']])GlobalFonts.registerFromPath('resources/fonts/'+file+'.woff2',family);
const bg=await loadImage('resources/opening/linxi-gate-ink-v2.jpg');
for(const [w,h]of [[1280,850],[1024,768],[800,600],[844,390],[667,375]]){
 const canvas=createCanvas(w,h),ctx=canvas.getContext('2d'),t=harness(w,h,ctx);t.ui.fonts={body:'"Mobile Body", "Mobile Extra"',numbers:'"Mobile Numbers"'};
 const save=name=>{const frame=createCanvas(w,h),c=frame.getContext('2d');c.drawImage(bg,0,0,w,h);c.drawImage(canvas,0,0);fs.writeFileSync(`work/experience-qa/${name}-${w}x${h}.png`,frame.toBuffer('image/png'));};
 const skills=t.document.getElementById('aim-skills');skills.hidden=false;skills.innerHTML='<button data-icon="Hand">点穴</button><button data-icon="Eye">探查</button><button data-icon="Rope">套索</button>';
 const q=t.document.createElement('button');q.id='tracked-quest';q.innerHTML='<small>入城</small><span>黄旗封关，先问问当值守卫。</span>';t.document.body.append(q);
 t.document.getElementById('journal-lines').innerHTML='<p>正午 12:27 韩校尉：我去事发处看看。</p>';
 t.render();t.tick(7000);save('exploration');t.world.sim.s.player.hp=88;t.world.sim.s.player.energy=97;t.render();save('vitals');
 t.dialogue.play([{id:'player',text:'六文茶钱，劳你给我留个位置。'}],()=>{});t.render();save('dialogue');t.dialogue.finish(true);t.ui.openJournal();t.render();save('records');
}
console.log('Rendered five viewport sizes.');
