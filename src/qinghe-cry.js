import {QINGHE_RIVERSIDE,QINGHE_ROCK} from './locations.js';
import {newsReady} from './world-news.js';
import {visibleBetween} from './npc-awareness.js';

export const QINGHE_CRY='npc-qinghe-cry';
export function qingheCrying(s,q){
 const n=s.people.qinghe;
 return s.chapterVersion===2&&!s.facts.qingheConsent&&!s.qingheJourney&&
  n?.life?.activity==='riverside'&&!!q&&Math.hypot(q.x-QINGHE_RIVERSIDE.x,q.z-QINGHE_RIVERSIDE.z)<.6&&newsReady(s,'qinghe')&&
  !(n.eatingUntil>(s.ecosystem?.time||0))&&!(n.drinkingUntil>(s.ecosystem?.time||0));
}
export function hearsQingheCry(s,q,obstacles=[]){
 // Sound can travel around this small outcrop, but never through buildings or walls.
 return qingheCrying(s,q)&&Math.hypot(q.x-s.player.x,q.z-s.player.z)<11&&visibleBetween(s.player,q,obstacles.filter(o=>o.id!==QINGHE_ROCK.id),s.ecosystem?.objects);
}
export class QingheCryAudio{
 constructor(audio){this.audio=audio;this.state=null;this.next=0;}
 update(world,{blocked=false}={}){
  const s=world.sim.s,position=()=>world.npcs.get('qinghe')?.actor.position;
  if(this.state!==s){if(this.audio.reaction?.id===QINGHE_CRY)this.audio.stopReaction();this.state=s;this.next=world.t+1;world.qingheCryHeard=false;}
  const valid=()=>world.sim.s===s&&world.playing&&!world.locked&&!world.cinematic&&!world.performance&&!world.combatReady&&!world.speaking&&!blocked&&s.player.hp>0&&hearsQingheCry(s,position(),world.obstacles||[]);
  if(!valid()||this.audio.hidden){world.qingheCryHeard=false;if(this.audio.reaction?.id===QINGHE_CRY)this.audio.stopReaction();return;}
  // Muting preserves the textual sound cue; it does not remove the world's clue.
  if(!this.audio.enabled){if(world.t>=this.next)world.qingheCryHeard=true;if(this.audio.reaction?.id===QINGHE_CRY)this.audio.stopReaction();return;}
  if(this.audio.reaction||world.t<this.next)return;
  const clear=visibleBetween(s.player,position(),world.obstacles||[],s.ecosystem?.objects);
  if(this.audio.playReaction(QINGHE_CRY,{position,valid,priority:0,gain:clear?.72:.56})){this.next=world.t+26;world.qingheCryHeard=true;}
 }
}
