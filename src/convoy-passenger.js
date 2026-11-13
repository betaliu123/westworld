import {currentFace,believedIdentity,disguisePreview,needsDisguiseCheck} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {newsReady} from './world-news.js';
import {admitRoute} from './gate-scene.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export function passengerGateCheck(s,eco){
 const guard=s.watch?.holder||'gate_guard',positions=eco?.positions||{},fu=positions.fu,q=positions[guard];
 const context={positions,obstacles:eco?.obstacles||[],player:s.player};
 let reason='';
 if(currentFace(s)!=='qinghe'||believedIdentity(s,'fu')!=='qinghe')reason='眼前已不是符祥核对的随行身份。';
 else if(s.event?.type!=='gate'||['prison','testimony','fight'].includes(s.event.gate?.phase))reason='先处理眼前的关口局面。';
 else if(!newsReady(s,'fu')||!newsReady(s,guard))reason='守关的人眼下无法接话，暂时不能放行。';
 else if(distance(fu,q)>14||!visibleBetween(fu,q,context.obstacles,s.ecosystem?.objects))reason='守卫听不见符管事招呼，先等他回到关口。';
 else {
  const check=disguisePreview(s,guard,{context});
  if(check?.certain&&check.chance===0||needsDisguiseCheck(s,guard,{context}))reason='守卫对这副面貌已有疑问，先应付盘问。';
 }
 return {guard,reason,blocked:!!reason};
}
export function passengerGuardLine(s,id){
 const receipt=s.facts.entryReceipt;
 if(receipt?.route==='qinghe-escort'&&['gate_guard','gate_relief'].includes(id))return receipt.witnesses?.includes(id)?'符管事接到人了，你也随纲队进去吧。车道留出来。':'纲队已经验放，别挡住车道。';
 if(receipt?.route!=='convoy-passenger'||!['gate_guard','gate_relief'].includes(id))return null;
 if(!receipt.witnesses?.includes(id))return '关门已经开了，留着车道，让纲车过。';
 return currentFace(s)==='qinghe'&&believedIdentity(s,id)==='qinghe'
  ?'符管事已核过名册。宋姑娘先进去，到公所等候；纲车随后过关。'
  :'符管事带的人已经验放，车道还得留着。';
}
// Admission is permission, not relocation. Fu can call to the nearby watch
// immediately; the passenger and supervisor then walk through the open gate.
export function releaseQinghePassage(sim,eco){
 const s=sim.s,c=s.convoy,p=c?.passenger;
 if(!p||p.subject!=='qinghe'||c.closed)return false;
 if(s.facts.enteredCity){
  if(s.facts.entryReceipt?.route==='convoy-passenger'&&!p.ahead){p.ahead=true;sim.save();}
  return false;
 }
 if(!['gate','travel'].includes(c.phase)||s.player.hp<=0||distance(s.player,eco.positions.fu)>4.8)return false;
 const check=passengerGateCheck(s,eco);if(check.blocked)return false;
 if(!admitRoute(sim,'convoy-passenger',{preservePosition:true}))return false;
 p.ahead=true;p.guard=check.guard;c.phase='travel';
 if(s.ecosystem?.objects['town-gate'])s.ecosystem.objects['town-gate'].open=true;
 s.facts.falseName='宋青禾';s.facts.entryReceipt={route:'convoy-passenger',day:s.day,subject:'qinghe',witnesses:['fu',check.guard],cost:'符祥核名传话，获准先行入关；周大石另行拉车过关',...(p.cause?{cause:p.cause}:{})};
 sim.save();return true;
}
