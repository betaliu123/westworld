import {applyFace,appearanceTime,rememberFace} from '../src/appearance.js';
// Local independent save only. Set initial facts, then use the production HUD.
export function mountDisguiseStatusHarness({getSim,world,environment,save}){
 const panel=document.createElement('details');panel.open=true;
 panel.style.cssText='position:fixed;right:8px;top:8px;z-index:1500;background:var(--paper);color:var(--ink-1);font:14px var(--font-body);padding:6px;max-width:220px';
 panel.innerHTML='<summary>易容状态验收</summary><nav></nav>';document.body.append(panel);
 function close(){world.dialogue.finish(true);environment.close();for(const id of ['panel','drawer'])document.getElementById(id).hidden=true;world.keys.clear();world.auto=null;world.clearReady();}
 function face(fraction=1){close();const sim=getSim(),s=sim.s;Object.assign(s.player,{hp:100,energy:100,x:-10,z:44,crouched:true,stealing:true,satiety:20,rested:20});world.hero.position.set(-10,0,44);world.yaw=0;world.pitch=.35;world.distance=7;s.time=35;s.wanted=0;s.complaint=null;s.people.fu.metPlayer=true;rememberFace(s,'fu');s.player.face=null;environment.eco.create('易容膏','cosmetic','player');applyFace(sim,'fu');s.player.face.until=appearanceTime(s)+s.player.face.duration*fraction;world.syncEvent();save();}
 const actions=[['易容满时',()=>face()],['剩余一半',()=>face(.5)],['即将褪去',()=>face(.002)],['卸去易容',()=>applyFace(getSim(),'player')],['饥困切换',()=>{const p=getSim().s.player;p.satiety=p.rested=p.satiety>25?20:100;}],['长对白',()=>{close();world.dialogue.play([{id:'player',text:'（药膏仍覆在脸上。认得这张面貌的人，自有各自的记忆与判断；等药力消退，便会恢复我本来的模样。眼下先看清周围，再决定如何行事。）'}],()=>{},'');}],['收起',()=>panel.open=false]];
 for(const [label,run]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=run;panel.querySelector('nav').append(b);}
}
