// World relationships are independent of what the player has discovered about them.
export const CLOSE_BONDS=Object.freeze([['tea_host','qinghe'],['gang_boss','mei']]);
export function importantPeople(s,id){
 const links=[...CLOSE_BONDS,...(s.socialConnections||[]).filter(l=>l.source&&['family','friend','partner'].includes(l.kind)).map(l=>[l.a,l.b])];
 return [...new Set(links.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]))].filter(k=>k!==id&&s.people[k]);
}
export function harmKind(e){
 if(e.selfDefense||e.type==='warrant'||e.lawful)return null;
 const type=e.incidentType||e.type;
 if(type==='assault')return e.method==='lasso'?'restraint':'assault';
 if(type==='tamper')return 'tamper';
 if(e.valence!=='crime')return null;
 // Old saves have authored titles instead of typed incident metadata. Never infer from AI prose.
 if(['抛套索','近身捆绑'].includes(e.title))return 'restraint';
 if(e.title==='当街伤人'||e.title==='当面问责'&&e.text==='动手伤人')return 'assault';
 if(e.title==='动过吃喝'||e.title==='当面问责'&&e.text==='动过吃喝')return 'tamper';
 return null;
}
export function rememberHarm(s,id,{subject,target,kind,cause=null,source=id,evidence='seen',day=s.day}){
 if(s.chapterVersion!==2||!s.people[id]||!s.people[target]||!subject||!kind)return;
 const rows=s.people[id].harmKnowledge??=[],row=rows.find(r=>r.subject===subject&&r.target===target&&r.kind===kind);
 if(row){if(cause!=null)row.cause=cause;if(evidence==='seen'){row.evidence=evidence;row.source=id;}return row;}
 const added={subject,target,kind,cause,source,evidence,day};rows.push(added);return added;
}
export function rememberWitnessedHarm(s,id,event){const kind=harmKind(event);if(!kind)return;
 return rememberHarm(s,id,{subject:event.identities?.[id],target:[event.harmedTarget,event.target,event.owner].find(k=>s.people[k]),kind,cause:event.cause??event.id});
}
export function rememberDeedHarm(s,deed){if(deed?.valence!=='crime')return;for(const id of deed.witnesses||[])rememberWitnessedHarm(s,id,{...deed,identities:{...deed.identities,[id]:deed.identities?.[id]||deed.subject||'player'}});}
export function rememberToldHarm(s,id,deed,subject,source){const kind=deed&&harmKind(deed);if(!kind||!source)return;
 return rememberHarm(s,id,{subject,target:[deed.harmedTarget,deed.target,deed.owner].find(k=>s.people[k]),kind,cause:deed.id,source,evidence:'told',day:s.day});
}
// Add knowledge supported by old records only; never infer a witness from proximity or a current disguise.
export function restoreHarmKnowledge(s){if(s.chapterVersion!==2)return;const deeds=s.chronicle?.deeds||[];
 for(const d of deeds)rememberDeedHarm(s,d);
 for(const e of s.deck?.echoes||[])if(e.template==='rumor_spread')rememberToldHarm(s,e.who,deeds.find(d=>d.id===e.cause),e.subject||'player',e.teller);
}
export function knownPersonalHarm(s,id,subject){const close=new Set([id,...importantPeople(s,id)]);
 return (s.people[id]?.harmKnowledge||[]).findLast(r=>r.subject===subject&&close.has(r.target))||null;
}
