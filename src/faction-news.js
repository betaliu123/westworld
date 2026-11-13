import {earnReputation,factionRep} from './reputation.js';
import {appearanceState,identityName,spreadIdentityRumor} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {addCausalDeed} from './item-meaning.js';
import {newsReady} from './world-news.js';

const factionOf=id=>['guard','inspector','old_constable'].includes(id)?'court':['gang_boss','chi','thief','mei'].includes(id)?'gang':null;
const official=id=>['guard','gate_guard','gate_relief','inspector','fu','gate-door','river-fence'].includes(id);
const now=s=>((s.day||1)-1)*240+(s.time||0);
const name=id=>id==='court'?'六扇门':'赤砂帮';
const reputationOf=(s,faction,subject)=>subject==='player'?factionRep(s,faction):appearanceState(s).reputations[subject]?.factions?.[faction]||0;
const near=(s,a,b,obstacles)=>a&&b&&Math.hypot(a.x-b.x,a.z-b.z)<=4&&visibleBetween(a,b,obstacles,s.ecosystem?.objects);
function value(c,faction){
 if(c.merit)return faction==='court'?20:25;
 if(faction==='court')return c.severe?-18:c.type==='assault'?-15:c.type==='theft'?-10:c.type==='tamper'?-12:-6;
 if(factionOf(c.victim)==='gang'||c.victim==='porter')return -12;
 // Skill and nerve earn standing; abusing bystanders does not.
 if(c.type==='theft'&&c.missingItems?.length)return official(c.victim)?12:4;
 if(official(c.victim)&&['assault','damage'].includes(c.type))return 8;
 return 0;
}
function settle(sim,c,id,k){
 const s=sim.s,faction=factionOf(id);if(!faction||!k.subject)return;
 const full=value(c,faction),amount=full<0&&!k.direct&&!k.testimony?Math.ceil(full/3):full;
 if(!amount)return;
 c.factionSettled??={};const key=faction+':'+k.subject,prev=c.factionSettled[key]||0;
 if(Math.abs(prev)>=Math.abs(amount))return;
 c.factionSettled[key]=amount;
 const before=reputationOf(s,faction,k.subject),reason=name(faction)+(c.merit?'听到了垫付脚夫工钱的事':amount>0?'认可传来的胆量与手段':k.direct?'记下亲眼所见的侵害':k.testimony?'收到目击者当面指认':'听到涉案传闻，心生戒备');
 earnReputation(sim,{city:null,faction,subject:k.subject,amount:amount-prev,key:'faction-news:'+c.id+':'+key+':'+amount,reason});
 const delta=reputationOf(s,faction,k.subject)-before;
 if(k.subject!=='player')spreadIdentityRumor(s,k.subject,8,reason,id);
 if(delta)addCausalDeed(s,{key:'faction-news:'+c.id+':'+key+':'+amount,title:name(faction)+'的态度',text:reason+'。',subject:k.subject,target:id,cause:c.cause||'case:'+c.id,witnesses:[id],effects:[{kind:'factionReputation',faction,subject:k.subject,delta}]});
}
// All knowledge carries its original attribution. A missing object never identifies a thief.
export function syncFactionNews(sim){
 const s=sim.s;if(s.chapterVersion!==2)return;
 s.factionNews??={nextSpread:0,merits:{}};
 const deed=s.chronicle?.deeds?.find(d=>d.key==='chapter:convoy_peace');
 if(deed&&!s.factionNews.merits.wages)s.factionNews.merits.wages={id:'wages',merit:true,cause:deed.id,at:now(s),known:{[deed.target]:{subject:deed.subject||'player',source:deed.target,direct:true,at:now(s)}}};
 for(const c of [...(s.investigations?.cases||[]),...Object.values(s.factionNews.merits)]){
  // The witnessed convoy heist already has its own physical propagation and rewards.
  if(c.convoy&&s.convoy?.aftermath)continue;
  c.factionKnown??={};c.factionNewsAt??=now(s);
  for(const w of c.witnesses||[])if(w.subject&&!c.factionKnown[w.id]?.direct)c.factionKnown[w.id]={subject:w.subject,source:w.id,direct:true,at:c.factionKnown[w.id]?.at??now(s)};
  for(const r of c.reports||[])if(r.subject&&r.kind==='testimony'){
   const old=c.factionKnown[r.officer];if(!old||old.subject===r.subject&&!old.direct)c.factionKnown[r.officer]={subject:r.subject,source:r.reporter,testimony:true,at:old?.at??now(s)};
  }
  if(c.merit)Object.assign(c.factionKnown,c.known);
  for(const [id,k]of Object.entries(c.factionKnown))settle(sim,c,id,k);
 }
}
export function shareFactionNews(sim,c,from,to,positions,obstacles=[]){
 const s=sim.s,k=c.factionKnown?.[from];
 if(!k||c.factionKnown[to]||now(s)-(c.factionNewsAt??now(s))>480||!newsReady(s,from)||!newsReady(s,to)||!near(s,positions[from],positions[to],obstacles))return false;
 const next=c.factionKnown[to]={subject:k.subject,source:from,direct:false,testimony:!!k.direct,at:now(s)};
 settle(sim,c,to,next);s.people[to].memories??=[];
 s.people[to].memories.push(identityName(from)+'说起'+identityName(k.subject)+(c.merit?'垫付脚夫工钱。':'的涉案传闻。'));s.people[to].memories=s.people[to].memories.slice(-12);
 sim.save();return true;
}
export function factionNewsStep(sim,positions,obstacles=[]){
 const s=sim.s;if(s.chapterVersion!==2)return;syncFactionNews(sim);const b=s.factionNews;
 if(now(s)<b.nextSpread)return;b.nextSpread=now(s)+6;
 for(const c of [...(s.investigations?.cases||[]),...Object.values(b.merits)]){
  if(c.convoy&&s.convoy?.aftermath)continue;
  for(const [from,k]of Object.entries(c.factionKnown||{})){
   if(now(s)-k.at<4)continue;
   for(const to of Object.keys(positions))if(shareFactionNews(sim,c,from,to,positions,obstacles))return;
  }
 }
}
