import {PEOPLE} from './data.js';
const who=id=>PEOPLE.find(p=>p.id===id)?.name||'失主';
export function provenance(item,from,to,s,method='transfer',witnesses=[]){
 item.provenance??={originalOwner:item.ownerId||item.owner||(from?.startsWith('npc:')?from.slice(4):null),history:[]};
 if(from===to)return;
 item.provenance.history.push({from,to,method,day:s.day,at:s.npcClock||0,witnesses:[...new Set(witnesses)]});
 item.provenance.history=item.provenance.history.slice(-24);
}
export function itemMeaning(s,id,item){
 if(!item)return null;
 if((item.type==='ring'||item.storyId==='ring'||item.name==='银戒')&&id==='shen')return {kind:'return',owner:'shen',line:'这……是我的银戒。你从哪里找到的？'};
 if((item.type==='ledger'||/副账|税课|口供/.test(item.name))&&['traveler','inspector'].includes(id))return {kind:'evidence',line:'先放在这里。账目要对得上，不能只凭一句话。'};
 const owner=item.provenance?.originalOwner||item.ownerId||item.owner;
 if(owner===id&&['clothing','clothes','purse','money','gift'].includes(item.type))return {kind:'return',owner:id,line:`这是我的${item.name}。怎么会在你手里？`};
 return null;
}
export function meaningCheck(s,item,answer){const theft=item.provenance?.history.find(h=>h.to==='player'&&h.method==='stolen');return {certain:answer!=='found',chance:answer==='found'?Math.max(5,Math.min(95,Math.round(s.player.stats.charm+25-(theft?.witnesses.length?25:0)))):100,score:s.player.stats.charm,blocked:false,reason:answer==='found'?'谎称拾得；目击者仍可能揭穿':'如实交代，不需检定'};}
export function addCausalDeed(s,{key,title,text,target,valence='neutral',witnesses=[],cause=null}){s.chronicle??={deeds:[],diaries:[],seq:0};const c=s.chronicle;c.deeds??=[];c.diaries??=[];c.seq??=0;valence=({kind:'help',harm:'crime',neutral:'deed'}[valence]||valence);if(key&&c.deeds.some(d=>d.key===key))return c.deeds.find(d=>d.key===key);const d={id:++c.seq,key,day:s.day,at:s.day*1000+(s.time||0),clock:'此时',title,text,target,valence,witnesses,cause};c.deeds.push(d);return d;}
// Called by conversation, drag/drop and the item picker; never awards a second time.
export function settleMeaning(sim,eco,id,item,answer='truth'){
 const s=sim.s,n=s.people[id],meaning=itemMeaning(s,id,item);if(!meaning)return null;
 const stamp=item.id+':'+id;if(s.itemSettlements?.[stamp]){eco?.transfer(item,'npc:'+id);return {recognized:true,item:item.name,delta:0,text:'东西收回了。上回的话，不必再说。',changes:[]};}
 const actualLedger=item.type==='ledger'||/副账/.test(item.name);
 const check=meaningCheck(s,item,answer),roll=check.certain?null:1+Math.floor(sim.rng()*100),success=roll===null||roll<=check.chance;
 const theft=item.provenance?.history.find(h=>h.to==='player'&&h.method==='stolen');
 const admitted=!!theft&&answer==='truth',exposed=answer==='found'&&!success;
 eco?.transfer(item,'npc:'+id);if(!eco)item.location='npc:'+id;
 if(item.type==='purse'&&item.value){n.purse=(n.purse||0)+item.value;item.value=0;item.name='空钱袋';}
 let delta=meaning.kind==='evidence'?6:admitted||exposed?-6:answer==='silent'?1:6;
 s.itemSettlements??={};s.itemSettlements[stamp]=true;
 sim.relation(id,delta);n.trust=Math.max(-100,Math.min(100,(n.trust||0)+(admitted||exposed?-8:answer==='silent'?-2:4)));
 let text=meaning.kind==='evidence'?(actualLedger?'先别惊动他们。原账我留下，对出缺口再找你。':'这份口供先留下。我会核对来处，还得找到原账才能定论。'):admitted?'拿走的是你，还回来的也是你。东西我收回，这桩事我记着。':exposed?'这话对不上。东西留下，我会问清楚。':answer==='silent'?'东西我收回。来历，你不肯说，我也记下了。':'多谢你送回来。我得告诉苏晚，不必再为这枚戒指争执了。';
 if(meaning.kind==='return'&&id!=='shen'&&!admitted&&!exposed&&answer!=='silent')text='东西找回就好。这份人情我记下了。';
 if(meaning.kind==='return'&&id==='shen'){
  s.player.inventory=s.player.inventory.filter(x=>x!=='ring');s.facts.missing=false;s.facts.ringReturned=true;s.facts.searchClosed=true;s.searchClosed=true;
  n.searching=false;n.memories.push('银戒已归还。'+text);if(s.event?.type==='inquiry')s.event.status='resolved';
  s.storyFollowups??=[];if(!s.storyFollowups.some(f=>f.key==='ring-return'))s.storyFollowups.push({key:'ring-return',due:s.day+1,id:'su',line:admitted||exposed?'沈砚说起银戒的事了。肯还回来是好事，别再伸那只手。':'沈砚说银戒找回来了。多谢你，至于定亲，我会自己告诉他。',delta:admitted||exposed?0:3});
 }
 if(meaning.kind==='evidence'){s.facts.taxLedgerLead=true;s.facts.princeEvidence=id==='traveler'||s.facts.princeEvidence;if(item.type==='ledger'||/副账/.test(item.name)){s.facts.ledgerDelivered=true;if(s.quests?.ledger){s.quests.ledger.status='complete';s.quests.ledger.objective='副账已递交核验';}}}
 const deed=addCausalDeed(s,{key:stamp,title:meaning.kind==='evidence'?(actualLedger?'递交副账':'递交口供'):'物归原主',text:`${who(id)}认出了${item.name}。${text}`,target:id,valence:delta>0?'kind':'harm',witnesses:theft?.witnesses||[]});
 if(id==='shen'&&s.storyFollowups?.find(f=>f.key==='ring-return'))s.storyFollowups.find(f=>f.key==='ring-return').cause=deed.id;
 if(delta>0&&s.chapter){const region=s.facts.enteredCity?'town':'gate';s.chapter.fame[region]=Math.min(100,s.chapter.fame[region]+10);s.reputation=Math.min(100,s.reputation+10);if(s.chapter.fame[region]>=25&&!s.chapter.titles.includes('临溪义客'))s.chapter.titles.push('临溪义客');}
 if(theft&&answer==='found'&&success&&theft.witnesses.length){s.storyFollowups??=[];s.storyFollowups.push({key:'expose:'+stamp,due:s.day+1,id,line:'有人亲眼看见你拿走它。你却说是捡的。',delta:-12,cause:deed.id});}
 sim.emit('sandbox',{text,dialogue:[],ai:false});if(roll!==null)sim.emit('fieldCheck',{label:'解释物件来历',actionId:'origin',target:id,roll,check,success});sim.save();
 return {item:item.name,delta,text,recognized:true,roll,check,success,changes:[`${who(id)}好感 ${delta>0?'+':''}${delta}`]};
}
