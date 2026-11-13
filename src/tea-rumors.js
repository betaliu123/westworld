import {newsReady,nearbyWorldNews} from './world-news.js';
import {visibleBetween} from './npc-awareness.js';

// Tea-table hearsay, not evidence or introductions. Each exchange has actual listeners.
export const TEA_RUMORS=[
 {id:'genyue_retreat',people:['tea_host','old_constable'],lines:[
  '听过路客说，官家如今常住汴京外的艮岳，一心修道。那地方，都叫仙山了。',
  '山上修道，山下运石。这一路的花石纲，送的就是那边。']},
 {id:'genyue_immortals',people:['old_constable','traveler'],lines:[
  '艮岳上住着真神仙——如今连这话都传出来了。客官可曾听说？',
  '街谈传得快，宫里的事却未必传得准。神仙如何，我不曾亲见，不敢妄言。']}
];
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
function available(s,eco,world,topic,index){
 if(s.chapterVersion!==2||s.facts.enteredCity||!world.playing||world.locked||world.cinematic||world.performance||world.combatReady||s.complaint||s.player.hp<=0)return false;
 const positions=eco.positions,obstacles=world.obstacles||[],people=topic.people;
 if(people.some(id=>!newsReady(s,id)||distance(positions[id],{x:-8,z:30})>10||distance(positions[id],s.player)>8||!visibleBetween(positions[id],s.player,obstacles,eco.s.objects)))return false;
 if(distance(positions[people[0]],positions[people[1]])>6||!visibleBetween(positions[people[0]],positions[people[1]],obstacles,eco.s.objects))return false;
 if(nearbyWorldNews(s,id=>positions[id],obstacles))return false;
 const actor=world.npcs?.get(people[index])?.actor,screen=actor&&world.screenPoint?.(actor.position);
 return !screen||screen.visible;
}
export function teaRumorsStep(sim,eco,world){
 const s=sim.s;if(s.chapterVersion!==2||s.facts.enteredCity)return false;
 const now=eco.s.time,book=s.teaRumors??={heard:{},nextAt:now+4};book.heard??={};
 if(book.reply&&now>book.reply.until){delete book.reply;sim.save();}
 if(world.teaRumorQueued?.state===s&&now<world.teaRumorQueued.until)return true;
 if(now<(book.activeUntil||0))return true;
 const topic=book.reply?TEA_RUMORS.find(t=>t.id===book.reply.id):TEA_RUMORS.find(t=>!book.heard[t.id]),index=book.reply?1:0;
 if(!topic||!available(s,eco,world,topic,index))return false;
 if(now<book.nextAt)return !!book.reply;
 let shown=false;const ticket={state:s,until:now+8};
 const line={id:topic.people[index],text:topic.lines[index],ambient:true,teaRumor:topic.id};
 line.valid=()=>sim.s===s&&available(s,eco,world,topic,index)&&(shown||eco.s.time<ticket.until&&(index===0?!book.heard[topic.id]:book.reply?.id===topic.id&&eco.s.time<=book.reply.until));
 line.onShown=()=>{
  if(!line.valid())return false;if(shown)return true;shown=true;
  if(world.teaRumorQueued===ticket)delete world.teaRumorQueued;
  const at=eco.s.time;book.heard[topic.id]=true;book.activeUntil=at+10;book.nextAt=at+(index?24:10);
  if(index)delete book.reply;else book.reply={id:topic.id,until:at+40};
  world.nextAmbient=Math.max(world.nextAmbient||0,(world.t||0)+12);sim.save();return true;
 };
 // Rejected or replaced bubbles never mark the line heard or reveal a person's name.
 world.teaRumorQueued=ticket;
 if(world.onWorldNewsSpeech?.(line))return true;
 if(world.teaRumorQueued===ticket)delete world.teaRumorQueued;
 return false;
}
