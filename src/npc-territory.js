import {PEOPLE} from './data.js';
import {visibleBetween} from './npc-awareness.js';
const sites=[{id:'den',x:23,z:-5,hosts:['gang_boss','chi']},{id:'court',x:10,z:-23,hosts:['inspector','guard']}];
const faction=Object.fromEntries(PEOPLE.map(p=>[p.id,p.faction]));
const side=id=>({'六扇门':'law','临溪县衙':'law','临溪守军':'law','赤砂帮':'gang'})[faction[id]];
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(site,q)=>q&&Math.abs(site.x-q.x)<3.6&&Math.abs(site.z-q.z)<3.2;
const fit=(s,id)=>{const n=s.people[id];return n?.hp>0&&!n.restraint&&!n.inCustody&&!n.drowning&&!(n.stunnedUntil>s.npcClock)&&!(n.sickUntil>s.ecosystem?.time);};
// Personal history is directional. The retired constable served with the court;
 // the gang's porter is a familiar face even without a faction badge.
 const prior={inspector:{old_constable:28},old_constable:{inspector:22},gang_boss:{porter:18},porter:{gang_boss:12}};
 const bond=(s,a,b)=>s.people[a].bonds?.[b]??prior[a]?.[b]??0;
function remember(s,a,b,v){const n=s.people[a];n.bonds??={};n.bonds[b]=Math.min(60,Math.max(-60,bond(s,a,b)+v));}
export function disposition(s,a,b){return (side(a)&&side(b)?side(a)===side(b)?30:-30:0)+bond(s,a,b);}
const power=(s,id)=>({gang_boss:72,chi:53,inspector:55,guard:63,gate_guard:66}[id]||48)-Math.round((100-s.people[id].hp)*.28);
const names=Object.fromEntries(PEOPLE.map(p=>[p.id,p.name]));
function report(sim,e,text){if(near(sim.s.player,e)<=12)sim.emit('territoryReport',{text});}
function interrupt(sim,t,e,reason){report(sim,e,names[e.host]+'与'+names[e.guest]+'未分胜负：'+reason+'。');delete t.active;sim.save();}
export function encounterStep(sim,positions,obstacles=[]){
 if(sim.s.deck?.actions?.active)return;
 const s=sim.s,now=s.npcClock||0,t=s.territory??={visits:{},next:0};let e=t.active;
 if(e){const {host:h,guest:g}=e,a=positions[h],b=positions[g],site=sites.find(k=>k.id===e.site);
 if(!a||!b||!fit(s,h)||!fit(s,g)){if(e.phase!=='withdraw')interrupt(sim,t,e,'一方已无法应战');else delete t.active;return;}
 if(e.phase==='withdraw'){if(now>=e.until){if(e.loser===g&&g==='guard'&&inside(site,s.player)&&s.wanted>0)t.barred={...e};delete t.active;}return;}
 if(!inside(site,b)||now-e.start>12||!visibleBetween(a,b,obstacles,s.ecosystem?.objects)){interrupt(sim,t,e,!inside(site,b)?'来人已离开堂口':now-e.start>12?'双方没能近身，未完成交手':'双方被障碍隔开');return;}
 if(e.phase==='challenge'&&near(a,b)<2&&now-e.start>=.8){e.phase='bout';e.at=now;}
 if(e.phase==='bout'&&now-e.at>=1.8&&near(a,b)<2.2){const scores=[h,g].map(id=>power(s,id)+1+Math.floor(sim.rng()*30));const holds=scores[0]>=scores[1];e.loser=holds?g:h;e.phase='withdraw';e.until=now+(holds?12:3);e.scores=scores;
 for(const [i,id] of [h,g].entries()){const n=s.people[id];n.hp=Math.max(1,n.hp-(id===e.loser?5:2));remember(s,id,id===h?g:h,-3);sim.emit('npcCheck',{id,label:'较力 '+scores[i],success:id!==e.loser,observation:true});}
 const winner=holds?h:g;report(sim,e,names[h]+' '+scores[0]+' 比 '+scores[1]+' '+names[g]+'。'+(scores[0]===scores[1]?'同点，守方占先。':'')+names[winner]+'胜，'+(holds?names[g]+'被逼退到门外。':names[h]+'退开，'+names[g]+(g==='guard'&&s.wanted>0?'可以继续追捕。':'可以通行。')));
 sim.emit('npcRoutine',{id:holds?h:g,text:holds?'止步。要拿人，去门外候着。':'我只拿案上之人。收手，别伤了旁人。'});sim.save();}return;}
 if(t.barred){const site=sites.find(k=>k.id===t.barred.site);if(!inside(site,s.player)||!s.wanted||!fit(s,t.barred.host)||!inside(site,positions[t.barred.host]))delete t.barred;}
 if(now<t.next)return;t.next=now+.2;
 for(const site of sites)for(const [guest,b] of Object.entries(positions)){const key=site.id+':'+guest;
 if(!inside(site,b)){delete t.visits[key];continue;}if(t.barred?.guest===guest||t.visits[key]||!fit(s,guest)||site.hosts[0]===guest)continue;
 const host=site.hosts.find(id=>id!==guest&&fit(s,id)&&inside(site,positions[id])&&visibleBetween(positions[id],b,obstacles,s.ecosystem?.objects));if(!host)continue;
 const d=disposition(s,host,guest);if(Math.abs(d)<12)continue;t.visits[key]=true;
 if(d>0){remember(s,host,guest,1);remember(s,guest,host,1);sim.emit('npcRoutine',{id:host,text:side(host)===side(guest)?'自己人，进来坐。门口我替你看着。':'你我有旧，进去吧。'});continue;}
 t.active={site:site.id,x:site.x,z:site.z,host,guest,start:now,phase:'challenge'};sim.emit('npcRoutine',{id:host,text:site.id==='den'?'居然敢在我的地盘撒野？要拿人，先过我这关。':'这是官署，兵刃留下。再往里闯，我可不客气。'});return;
 }}
export function encounterFor(s,id){const t=s.territory,e=t?.active;if(e&&(e.phase==='withdraw'?id===e.loser:id===e.guest||id===e.host))return e;return t?.barred?.guest===id?t.barred:null;}
export function occupied(s,id){return !!encounterFor(s,id);}
