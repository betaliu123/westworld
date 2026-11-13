import {currentFace,believedIdentity,identityName,clothing,femalePeople} from './appearance.js';
import {npcName} from './npc-names.js';

export const LAW_OFFICERS=['guard','gate_guard','gate_relief','inspector'];
export const CRIME_LABELS={theft:'盗窃嫌疑',assault:'伤人嫌疑',homicide:'命案嫌疑',damage:'毁损财物嫌疑',tamper:'擅动饮食嫌疑',body:'命案待查',inquiry:'涉案待查'};
// Public notices belong to the world; reading the board only grants the player
// knowledge/authority. It does not create the officer's knowledge of the notice.
export const PUBLIC_WARRANTS=[{id:'linxi-yan-theft',subject:'thief',status:'active',public:true,reward:20,description:{name:'燕七',text:'榜上绘有燕七形貌，须活着带到案前核问。'},jurisdiction:'linxi',knownBy:LAW_OFFICERS,source:'临溪拘传榜文',charges:[{code:'theft',label:CRIME_LABELS.theft,detail:'许行商报失钱袋，指认燕七曾近身'}]}];
export function suspectDescription(s,subject){
 const face=currentFace(s),garment=clothing(s)?.name,hat=s.ecosystem?.items.find(i=>i.id===s.player.hat&&i.location==='player')?.name;
 const gender=face!=='player'?(femalePeople.has(face)?'女子':'男子'):s.player.gender==='female'?'女子':s.player.gender==='male'?'男子':'行客';
 return {name:subject==='player'?'无名行客':npcName(s,subject),text:[subject==='player'?gender+'，姓名未详':'形貌如'+npcName(s,subject),garment?'身穿'+garment:'未穿外袍',hat?'头戴'+hat:''].filter(Boolean).join('，')};
}
export function publicWantedNotices(s){
 return [...PUBLIC_WARRANTS,...(s.chapterVersion===2?s.law?.warrants||[]:[]).filter(w=>w.public)].filter(w=>!w.jurisdiction||w.jurisdiction===(s.currentCity||'linxi')).map(w=>({...w,status:s.law?.served?.includes(w.id)||s.people[w.subject]?.custodyDelivered?'served':w.status}));
}
export const activePublicWarrant=(s,id)=>s.chapterVersion===2&&publicWantedNotices(s).some(w=>w.subject===id&&w.status==='active');
// Posting requires an officer's own observation or a report actually delivered to one.
// The frozen description must never be recomputed from the player's current clothes/face.
export function publishWantedNotices(sim){
 const s=sim.s;if(s.chapterVersion!==2)return false;let changed=false;
 for(const c of s.investigations?.cases||[]){
  if((s.npcClock||0)-c.lastAt<20)continue;
  const evidence=[...(c.witnesses||[]).filter(w=>LAW_OFFICERS.includes(w.id)),...(c.reports||[]).filter(r=>r.kind==='testimony'&&LAW_OFFICERS.includes(r.officer))];
  for(const subject of new Set(evidence.map(w=>w.subject).filter(Boolean))){
   const id='notice:'+c.id+':'+subject,sceneId='scene:'+c.id+':'+subject;
   if(c.custody?.subject===subject||s.law?.served?.some(k=>k===id||k===sceneId)||s.people[subject]?.custodyDelivered)continue;
   const record=evidence.find(w=>w.subject===subject),charges=crimeCharges(c);
   s.law??={};s.law.warrants??=[];const old=s.law.warrants.find(w=>w.id===id);
   if(old){if(JSON.stringify(old.charges)!==JSON.stringify(charges)){old.charges=structuredClone(charges);changed=true;}continue;}
   const description=record.description||{name:subject==='player'?'无名行客':npcName(s,subject),text:record.garment?'事发时身穿'+record.garment:'衣着未详，依原证言核问'};
   s.law.warrants.push({id,subject,caseId:c.id,status:'active',public:true,postedAt:s.npcClock||0,jurisdiction:s.currentCity||'linxi',knownBy:[...LAW_OFFICERS],source:'临溪官府通缉榜',description:structuredClone(description),charges:structuredClone(charges),reward:charges.some(c=>c.code==='homicide')?50:charges.some(c=>c.code==='assault')?30:20});changed=true;
  }
 }
 if(changed)sim.save();return changed;
}
export function crimeCharges(c){return c.charges?.length?c.charges:[{code:c.type||'inquiry',label:CRIME_LABELS[c.type]||CRIME_LABELS.inquiry,detail:c.convoy?'花石纲现场的'+(CRIME_LABELS[c.type]||'涉案行为'):'事发现场的'+(CRIME_LABELS[c.type]||'涉案行为')}];}
export function wantedRecords(s,officer){
 if(s.chapterVersion!==2||!LAW_OFFICERS.includes(officer))return [];
 const records=[...PUBLIC_WARRANTS,...(s.law?.warrants||[])].filter(r=>r.status==='active'&&(r.knownBy||[]).includes(officer)&&(!r.jurisdiction||r.jurisdiction===(s.currentCity||'linxi')));
 for(const [subject,w] of Object.entries(s.facts.warrants||{}))if(w.issuer===officer&&!records.some(r=>r.subject===subject))records.push({id:'order:'+subject,subject,status:'active',source:'拘传文书',knownBy:[officer],charges:w.charges||[{code:'inquiry',label:CRIME_LABELS.inquiry,detail:w.reason}]});
 for(const c of s.investigations?.cases||[]){
  const evidence=[...(c.witnesses||[]).filter(w=>w.id===officer),...(c.reports||[]).filter(r=>r.officer===officer&&r.kind==='testimony')];
  for(const subject of new Set(evidence.map(r=>r.subject).filter(Boolean))){
   if(c.custody?.subject===subject&&subject==='player')continue;
   records.push({id:'scene:'+c.id+':'+subject,subject,status:'active',caseId:c.id,source:evidence.some(r=>r.id===officer)?'亲眼目击':'当面报案',direct:evidence.some(r=>r.id===officer&&r.subject===subject),charges:crimeCharges(c)});
  }
 }
 return records.filter(r=>r.charges?.length&&!s.law?.served?.includes(r.id)&&!s.people[r.subject]?.custodyDelivered);
}
export function wantedProfile(s,officer,{appearance=false}={}){
 const subject=appearance?currentFace(s):believedIdentity(s,officer),records=wantedRecords(s,officer).filter(r=>r.subject===subject);
 if(!records.length)return null;
 const charges=[...new Map(records.flatMap(r=>r.charges).map(c=>[c.code+':'+c.detail,c])).values()];
 return {subject,name:identityName(subject),records,charges,chargeText:[...new Set(charges.map(c=>c.label))].join('、'),detail:[...new Set(charges.map(c=>c.detail).filter(Boolean))].join('；'),direct:records.some(r=>r.direct),key:JSON.stringify([officer,subject,records.map(r=>[r.id,r.charges]).sort((a,b)=>a[0].localeCompare(b[0]))])};
}
