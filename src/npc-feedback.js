// Presentation only: suppress crowds without delaying or changing NPC behaviour.
export const ALERT_EMOJI={notice:'🤔',investigate:'👀',warn:'⚠️',fight:'⚔️',flee:'😨',search:'🔎'};
export const LIFE_LINES={hungry:'肚子有些空了，找点吃的。',meal:'先吃两口，垫垫肚子。',rest:'腿都站酸了，歇一会儿。',sick:'胃里翻得厉害……',water:'救命！拉我一把！'};
export function lifeCue(n,time,hunger){return n.drowning?'water':n.sickUntil>time?'sick':n.eatingUntil>time?'meal':n.life?.activity==='rest'?'rest':hunger>=65?'hungry':null;}
export class FeedbackBudget{
 constructor(){this.states=new Map();this.last=new Map();this.owner=null;this.until=0;}
 change(id,state,now,eligible,duration,cooldown,initial=false){
  const known=this.states.has(id),old=this.states.get(id);this.states.set(id,state);
  if(old===state||!state||!eligible||(!known&&!initial)||now<(this.last.get(id)??-Infinity)+cooldown||now<this.until)return false;
  this.owner=id;this.until=now+duration;this.last.set(id,now);return true;
 }
 visible(id,now){return this.owner===id&&now<this.until;}
}
