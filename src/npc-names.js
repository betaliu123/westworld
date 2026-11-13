import {PEOPLE} from './data.js';

// Descriptions are observable, and never disclose a private role or allegiance.
const descriptions={fu:'锦袍管事',qinghe:'抚琴女子',inspector:'官服客人',gang_boss:'堂中主事',gate_relief:'值守军士',tea_host:'茶棚掌柜',traveler:'锦衣客',old_constable:'布衣老者',gate_guard:'披甲守卫',relay:'补衣人',gate_merchant:'行商',scribe:'刻字人',prisoner:'囚衣人',mei:'红楼女子',matchmaker:'持绸妇人',merchant:'货郎',thief:'闲汉',qing:'青衣剑客',chi:'挎刀镖客',shen:'持剑青年',su:'行脚琴师',gao:'酒客',guard:'巡街捕快',bookseller:'书摊主人',inn:'客栈掌柜',tea:'药铺学徒',porter:'挑夫',elder:'说书人',beggar:'跛足乞丐'};
const reserved=new Set(['traveler','gate_merchant','thief']);
const person=id=>PEOPLE.find(p=>p.id===id);

export function knownNpcName(s,id){
 const p=person(id);if(!p)return null;
 if(id==='traveler')return s.facts?.princeAlias?'赵闲舟':null;
 const value=s.facts?.knownNames?.[id];
 if(value)return typeof value==='string'?value:id==='gate_merchant'?'赵成':p.name;
 if(s.chapterVersion!==2)return s.intelligence?.people?.[id]||s.people[id]?.probed?p.name:null;
 if(id==='thief'&&s.chapter?.done?.yan_secret)return p.name;
 return null;
}
export function npcNameView(s,id){
 if(['player','hero'].includes(id))return {name:'你',nameKnown:true};
 const name=knownNpcName(s,id);
 return {name:name||descriptions[id]||'路人',nameKnown:!!name};
}
export const npcName=(s,id)=>npcNameView(s,id).name;

// Only a displayed, spoken reply counts. Menus, thoughts, probes and ambient
// barks do not invoke this. Reserved identities keep their authored evidence.
export function rememberNpcConversation(sim,line){
 const s=sim.s,id=line?.id,n=s.people[id];if(!person(id))return false;
 if(s.chapterVersion!==2||!n||line.narration||line.thought||line.overheard||!line.text?.trim()||/^[（(]/.test(line.text))return false;
 let changed=!n.nameMet;n.nameMet=true;n.metPlayer=true;
 if(!reserved.has(id)&&!knownNpcName(s,id)){
  s.facts.knownNames??={};s.facts.knownNames[id]=person(id).name;
  s.facts.nameSources??={};s.facts.nameSources[id]={source:'当面交谈',day:s.day};changed=true;
 }
 if(changed)sim.save();return changed;
}

// Old encounter/probe flags alone are not proof of a conversation. Completed
// replies and heard topics are; importing these grants no rewards or secrets.
export function restoreNpcNames(s){
 if(s.chapterVersion!==2||s.npcNamesVersion===1)return;
 const replied=new Set((s.history||[]).filter(r=>!r.pendingSpeech&&r.motion==='talk'&&r.roll==null).flatMap(r=>(r.dialogue||[]).filter(l=>!l.thought&&!l.narration).map(l=>l.id)));
 for(const p of PEOPLE){const n=s.people[p.id];if(!n||reserved.has(p.id))continue;
  if(n.nameMet||Object.values(n.heardTopics||{}).some(Boolean)||replied.has(p.id)){
   s.facts.knownNames??={};s.facts.knownNames[p.id]??=p.name;n.nameMet=true;
   s.facts.nameSources??={};s.facts.nameSources[p.id]??={source:'既有交谈记录',day:s.day};
  }
 }
 s.npcNamesVersion=1;
}
