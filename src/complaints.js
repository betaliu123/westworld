import {persona} from './npc-persona.js';
export const officials=['guard','gate_guard','gate_relief','inspector'];
const firm=id=>officials.includes(id)||persona(id)[0]==='blade';
const flash=(sim,id,label)=>sim.emit('npcCheck',{id,label,observation:true,success:false,priority:true});
function calm(sim,id){const n=sim.s.people[id];if(n.awareness){n.awareness.caseOpen=false;n.awareness.state='return';}n.mood='calm';n.fear=0;}
function escalate(sim,c,force=false){const n=sim.s.people[c.id];if(force||firm(c.id)){delete sim.s.complaint;n.awareness={...n.awareness,state:'fight',suspect:'player',caseOpen:true,until:(sim.s.npcClock||0)+20};n.fear=0;flash(sim,c.id,'⚔ 动手');}else{c.phase='report';c.since=sim.s.npcClock||0;flash(sim,c.id,'💨 去报官');}}
export function startComplaint(sim,event){const s=sim.s,victim=event.owner&&s.people[event.owner]?event.owner:event.target,id=event.witnesses?.includes(victim)?victim:event.witnesses?.find(k=>officials.includes(k)),n=s.people[id];if(!['assault','theft','damage','tamper'].includes(event.type)||!n||!event.witnesses?.includes(id)||!n.awareness)return false;
 const active=s.complaint;if(active){if(active.id===id&&n.muteUntil>(s.npcClock||0)){active.phase='report';active.since=s.npcClock||0;flash(sim,id,'失声 · 求援');return false;}if(active.id===id&&event.type==='assault'&&active.phase!=='report')escalate(sim,active);return false;}
 if(n.complaintUntil>(s.npcClock||0))return false;n.complaintUntil=(s.npcClock||0)+18;
 const c={id,payee:s.people[victim]?victim:id,type:event.type,phase:'approach',since:s.npcClock||0,officers:event.witnesses.filter(x=>officials.includes(x)&&x!==id),price:event.type==='assault'?12:6};
 if(!firm(id)&&(n.hp<25||persona(id)[0]==='wary')&&sim.rng()<.65){calm(sim,id);n.fear=8;n.mood='afraid';flash(sim,id,'😨 不敢追究');return true;}
 if(n.muteUntil>(s.npcClock||0))c.phase='report';s.complaint=c;flash(sim,id,c.phase==='report'?'失声 · 求援':'❗ 上前问责');return true;}
export function complaintChoices(sim){const c=sim.s.complaint,n=sim.s.people[c.id],p=sim.s.player;
 return [['argue','试着辩解','charm'],['threat','逼他收声','might'],['pay','赔钱了事'],['fight','动手']].map(([id,label,stat])=>({action:{id,label,stat,cost:id==='pay'?c.price:0},preview:{certain:!stat,blocked:id==='pay'&&p.money<c.price,score:p.stats[stat],chance:Math.max(5,Math.min(95,(p.stats[stat]||0)+20+(stat==='might'?(firm(c.id)?-20:5):Math.round(n.relation/4))-(c.type==='assault'?16:0)))}}));}
function exchange(c,id,ok){
 const official=officials.includes(c.id),prince=c.id==='traveler';
 const plea={theft:'方才人挤，我扶了一下。你点点东西，可少了什么？',assault:'我以为你要拔刀，情急才出了手。',damage:'我以为那处早已松脱，没想到会弄坏。',tamper:'我只动了下碗沿。你若不信，我们当面看。'};
 const player=id==='argue'?plea[c.type]:id==='threat'?'再纠缠，下一回我可不收手了。':id==='pay'?'这些钱赔给你，这事能不能就此揭过？':'那就手底下见。';
 const reply=id==='fight'?'好，那便动手！':id==='pay'?'钱我收下。这笔账，咱们两清。':ok?(id==='threat'?'你……好。我不拦你，你走。':official?(c.type==='theft'?'你的说法我记下了。这回先放你走。':'既然收了手，这回就到这儿。') :prince?(c.type==='theft'?'好一个顺手相扶。这回我不追问，请把手收回去。':'我听清了。这回姑且作罢。'):'好，我暂且信你。往后别再这样。'):c.phase==='report'?'这话留着跟官差说。我这就去找人！':official?'人证就在眼前，还想抵赖？站住！':'说不通了，看招！';
 return [{id:'player',listener:c.id,text:player,shot:'close'},{id:c.id,listener:'player',text:reply,shot:'reaction'}];}
export function answerComplaint(sim,id){const c=sim.s.complaint;if(!c||c.phase!=='ask')return;const entry=complaintChoices(sim).find(x=>x.action.id===id);if(!entry||entry.preview.blocked)return;
 const n=sim.s.people[c.id],roll=entry.action.stat?1+Math.floor(sim.rng()*100):null,ok=roll===null||roll<=entry.preview.chance;
 if(id==='fight'||!ok)escalate(sim,c,id==='fight');else{if(id==='pay'){sim.s.player.money-=c.price;const recipient=sim.s.people[c.payee]||n;recipient.purse=(recipient.purse||0)+c.price;}if(id==='threat')sim.relation(c.id,-4);calm(sim,c.id);delete sim.s.complaint;flash(sim,c.id,id==='pay'?'收下赔偿':id==='threat'?'😨 退让':'暂且相信');}
 const text=id==='fight'?'双方动手。':id==='pay'?'收下 '+c.price+' 文赔偿，不再追究。':(roll+' / '+entry.preview.chance+' · '+(ok?'对方不再追究。':c.phase==='report'?'没有说服对方，对方跑去报官。':'谈崩了，对方动手。'));sim.emit('complaintResult',{id:c.id,text,dialogue:exchange(c,id,ok),roll,check:entry.preview,success:ok,label:entry.action.label});sim.save();}
export function receiveReport(sim,c,officer,home){if(sim.s.complaint!==c||c.phase!=='report')return;calm(sim,c.id);delete sim.s.complaint;if(sim.s.people[c.id].muteUntil>(sim.s.npcClock||0)){flash(sim,c.id,'失声 · 无法指认');sim.emit('complaintResult',{id:c.id,text:'拉住官差，却说不清发生了什么。'});sim.save();return;}const n=sim.s.people[officer];n.awareness={...n.awareness,home:{x:home.x,z:home.z},lastKnown:{x:c.place.x,z:c.place.z},suspect:'player',caseOpen:true,state:'investigate',until:(sim.s.npcClock||0)+10};if(!c.officers.length)sim.s.wanted=Math.min(9,sim.s.wanted+1);flash(sim,officer,'已接报');sim.emit('complaintResult',{id:c.id,text:'已当面报官，官差前去查看。'});sim.save();}
