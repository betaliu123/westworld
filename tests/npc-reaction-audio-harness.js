import {mountCombatSurrenderHarness} from './combat-surrender-harness.js';
import {mountEscortHarness} from './escort-harness.js';
// Localhost-only, saveKey(playtest) isolated from the player's progress.
export function mountReactionAudioHarness(options){
 const {world,getSim,audio,reactions}=options;
 mountCombatSurrenderHarness(options);mountEscortHarness(options);
 // The combat fixture hides remote actors; the escort fixture places a different cast.
 document.getElementById('escort-qa').addEventListener('click',e=>{if(e.target.tagName==='BUTTON')for(const n of world.npcs.values())n.actor.visible=true;},true);
 const bar=document.getElementById('combat-qa'),out=document.createElement('output');out.id='reaction-audio-report';
 out.style.cssText='position:fixed;right:8px;top:68px;max-width:400px;z-index:12001;white-space:pre-wrap;background:var(--paper);color:var(--ink-1);font:14px var(--font-body);pointer-events:none';document.body.append(out);
 const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{fn();b.blur();};bar.append(b);};
 add('重伤现场',()=>{const s=getSim().s;world.clearReady();s.people.gao.hp=Math.floor((s.people.gao.maxHp||100)*.2);s.people.gao.awareness=null;s.people.tea_host.awareness=null;world.npcs.get('tea_host').actor.rotation.y=-.8;});
 add('清空试听记录',()=>{audio.stopReaction();reactions.queue=[];reactions.played=[];reactions.cooldowns.clear();performance.clearResourceTimings();});
 setInterval(()=>{const state=audio.status();out.textContent=JSON.stringify({loaded:state.loaded.filter(id=>id.startsWith('npc-')).length,context:state.context,enabled:audio.enabled,active:state.reaction,played:reactions.played,ttsRequests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/api/voice')).length},null,2);},100);
}
