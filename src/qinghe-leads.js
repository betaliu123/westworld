import {QINGHE_RIVERSIDE} from './locations.js';
import {newsReady} from './world-news.js';
import {npcName} from './npc-names.js';

// A last-known place, not a live marker exposing the unseen person behind the rock.
export const QINGHE_SEARCH_PLACE={point:[QINGHE_RIVERSIDE.x,QINGHE_RIVERSIDE.z+1.5],radius:.8};
export function convoyWaitingForQinghe(s){
 const c=s.convoy;
 return s.chapterVersion===2&&c?.phase==='gate'&&!c.closed&&!c.command&&!c.passenger&&!c.qinghePassenger&&!s.facts.enteredCity&&newsReady(s,'fu')&&
  !!s.ecosystem?.items?.some(i=>i.storyId==='convoy-list'&&i.location==='npc:fu'&&i.hp>0);
}
export function qingheSearchAvailable(s){return convoyWaitingForQinghe(s)&&s.people.qinghe?.hp>0&&!s.facts.qingheUnwillingKnown;}
export function recordOpeningLead(s,event,source){
 if(s.chapterVersion!==2)return;
 s.quests??={};
 if(event==='convoy_waiting'){
  s.facts.convoyWaitingKnown=true;
  s.quests.convoy_waiting??={id:'convoy_waiting',title:'黄旗下候人',source,day:s.day,status:'active',objective:'到黄旗车旁问押运管事，为何迟迟未走',note:'听说这队花石纲等人等了许久。',place:{person:'fu'}};
 }
 if(event==='fu_waiting'||event==='riverside_cry'){
  const named=event==='fu_waiting';s.facts[named?'fuWaitingKnown':'riversideCryKnown']=true;
  s.quests.qinghe_search??={id:'qinghe_search',day:s.day,status:'active'};
  const q=s.quests.qinghe_search;
  if(named||!q.source)Object.assign(q,{title:named?'寻访宋青禾':'石后的哭声',source,objective:named?'去西边溪畔找宋青禾，听听她的打算':'去西边溪畔卧石后，看看是谁在哭',note:named?'符祥说宋青禾迟迟未到，提起她常去溪边。':'只听说石后有哭声，尚不知是谁，也不知缘由。',place:QINGHE_SEARCH_PLACE});
 }
}
export function syncOpeningLeads(s){
 if(s.chapterVersion!==2)return;
 for(const lead of s.deck?.leads||[])if(['convoy_waiting','riverside_cry'].includes(lead.event))recordOpeningLead(s,lead.event,lead.source?npcName(s,lead.source)+'口述':'街坊口述');
 if(s.chapter?.done?.fu_waiting)recordOpeningLead(s,'fu_waiting','符祥当面所言');
 const waiting=s.quests?.convoy_waiting,search=s.quests?.qinghe_search;
 if(waiting&&s.facts.fuWaitingKnown){waiting.status='complete';waiting.objective='已问明：纲队正在等宋青禾';}
 if(search&&s.facts.qingheUnwillingKnown){search.status='complete';search.objective='已找到青禾，听她说起随车远行的犹豫';}
 // A last-known location remains a clue even if its subject moves or cannot answer.
}
export function qingheSearchChoice(s){return s.facts.fuWaitingKnown&&qingheSearchAvailable(s)?{id:'qinghe_search',label:'我帮你去找找',mode:'qingheSearch',kind:'listen',place:QINGHE_SEARCH_PLACE}:null;}
