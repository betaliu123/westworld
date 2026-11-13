import {currentFace,believedIdentity,identityName} from './appearance.js';

export const LAW_OFFICERS=['guard','gate_guard','gate_relief','inspector'];
export const CRIME_LABELS={theft:'盗窃嫌疑',assault:'伤人嫌疑',damage:'毁损财物嫌疑',tamper:'擅动饮食嫌疑',body:'命案待查',inquiry:'涉案待查'};
// Public notices belong to the world; reading the board only grants the player
// knowledge/authority. It does not create the officer's knowledge of the notice.
export const PUBLIC_WARRANTS=[{id:'linxi-yan-theft',subject:'thief',status:'active',jurisdiction:'linxi',knownBy:LAW_OFFICERS,source:'临溪拘传榜文',charges:[{code:'theft',label:CRIME_LABELS.theft,detail:'许行商报失钱袋，指认燕七曾近身'}]}];
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
 return records.filter(r=>r.charges?.length&&!s.law?.served?.includes(r.id));
}
export function wantedProfile(s,officer,{appearance=false}={}){
 const subject=appearance?currentFace(s):believedIdentity(s,officer),records=wantedRecords(s,officer).filter(r=>r.subject===subject);
 if(!records.length)return null;
 const charges=[...new Map(records.flatMap(r=>r.charges).map(c=>[c.code+':'+c.detail,c])).values()];
 return {subject,name:identityName(subject),records,charges,chargeText:[...new Set(charges.map(c=>c.label))].join('、'),detail:[...new Set(charges.map(c=>c.detail).filter(Boolean))].join('；'),direct:records.some(r=>r.direct),key:JSON.stringify([officer,subject,records.map(r=>[r.id,r.charges]).sort((a,b)=>a[0].localeCompare(b[0]))])};
}
