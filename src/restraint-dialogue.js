import {persona} from './npc-persona.js';

const objections={
 law:'有事按规矩说。把绳子解开，别拿捆人当道理。',
 courtly:'阁下若有话说，先解绳结。如此相待，叫我如何信你？',
 blade:'有话就堂堂正正地说，先把绳子解开。',
 trade:'眼下还谈什么生意？先松绑，别的事再说。',
 wary:'你究竟想做什么？先松绑，我才肯与你谈别的。',
 artist:'你把我的手绑住了，再好听的话，我也没心思听。先解开。'
};
export function canTalkRestrained(s,id){
 const n=s.people[id],now=s.npcClock||0;
 return !!n?.restraint&&n.hp>0&&s.player.hp>0&&!(n.stunnedUntil>now)&&!(n.muteUntil>now)&&!['sleep','doze'].includes(n.life?.activity);
}
// A reply belongs to this particular restraint, not to ordinary conversation memory.
// Browsing and cancellation never consume it; changing the knot can reopen it.
export function restraintConversation(s,id){
 if(!canTalkRestrained(s,id))return null;
 const n=s.people[id],restraint=n.restraint,fixed=restraint.mode==='fixed',lawful=!!restraint.lawful&&!!n.inCustody;
 const key=(fixed?'fixed':'lead')+':'+(lawful?'custody':'unlawful');
 if(restraint.heardTalk?.includes(key))return null;
 const body=fixed?'手脚都捆着，我动不了。':'绳头还攥在你手里。';
 const reply=lawful?'既是押我到案，话就留到官府说。绑着我，也不能替我认罪。':
  id==='porter'?'你这样拴着我，我没法干活。先松绑，再谈别的。':objections[persona(id)[0]]||objections.wary;
 return {restraint,key,dialogue:[{id,text:body+reply,shot:'close'}]};
}
export function finishRestraintConversation(s,id,exchange){
 const current=restraintConversation(s,id);
 if(!current||current.restraint!==exchange?.restraint||current.key!==exchange.key)return false;
 (current.restraint.heardTalk??=[]).push(current.key);return true;
}
export function restraintReplies(s,id){
 if(!canTalkRestrained(s,id))return [];
 return [{id:'restraint_release',label:'松绑',mode:'lasso',point:'release',kind:'steal'},
  {id:'restraint_later',label:'暂不松绑',mode:'endTalk',kind:'listen'}];
}
