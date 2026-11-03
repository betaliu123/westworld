import {courtRank} from './court-street.js';
import {PEOPLE} from './data.js';
// World hierarchy is private data. UI receives only the player's discovered projection.
const NODES=[
 {id:'bookseller',name:'温素笺',role:'墨香斋主人',faction:'临溪街坊',tier:4},
 {id:'inspector',name:'顾钦差',role:'六扇门钦差',faction:'六扇门',tier:2},
 {id:'gang_boss',name:'梅掌舵',role:'赤砂帮主',faction:'赤砂帮',tier:2},
 {id:'mei',name:'梅知意',role:'帮主之女',faction:'赤砂帮',tier:3},
 {id:'caijing',name:'蔡京',role:'太师',faction:'蔡京党羽',tier:0},
 {id:'patron',name:'梁中丞',role:'京中接引',faction:'蔡京党羽',tier:1},
 {id:'taxchief',name:'郑税使',role:'东街税课主事',faction:'税课司',tier:2},
 {id:'gate_guard',name:'韩校尉',role:'临溪关校尉',faction:'临溪守军',tier:3},
 {id:'gate_relief',name:'周伍长',role:'关口轮值',faction:'临溪守军',tier:4},
 {id:'prisoner',name:'旧账房',role:'税课抄账人',faction:'税课司',tier:3},
 {id:'gate_merchant',name:'赵行商',role:'往来货商',faction:'东溪商帮',tier:4},
 {id:'relay',name:'驿舍补衣人',role:'驿舍杂役',faction:'临溪驿舍',tier:4},
 {id:'scribe',name:'刻字人',role:'印铺匠人',faction:'临溪街坊',tier:4},
 {id:'old_constable',name:'杜老捕',role:'退役捕快',faction:'临溪县衙',tier:4},
 {id:'tea_host',name:'宋茶娘',role:'茶棚掌柜',faction:'临溪街坊',tier:4},
 {id:'traveler',name:'锦衣客',role:'候人的旅客',faction:'？？？',tier:4}
];
export const CLUES={
 watch:{nodes:['gate_guard','gate_relief'],edges:[['gate_guard','gate_relief','统属']],text:'周伍长受韩校尉节制，轮替看守关口。',confidence:'已知'},
 tax:{nodes:['taxchief'],edges:[['taxchief','gate_guard','催办税课公文']],text:'关口催办的公文出自东街税课司。公务往来尚不能证明同谋。',confidence:'传闻'},
 ledger:{nodes:['taxchief','prisoner'],edges:[['taxchief','prisoner','掌管副账']],text:'旧账房指认东街有一份未上报的副账。',confidence:'证言'},
 patron:{nodes:['patron'],edges:[['patron','taxchief','疑似收受输送']],text:'杜老捕提到税银另有“京中接引”，姓梁；尚缺账目印证。',confidence:'传闻'},
 apex:{nodes:['caijing'],edges:[['caijing','patron','疑似庇护']],text:'杜老捕听闻梁中丞出入蔡府。这是调查方向，尚非定罪证据。',confidence:'传闻'}
};
export function knowledge(sim){return sim.s.intelligence??={people:{},clues:{}};}
export function meet(sim,id){const k=knowledge(sim);if(sim.s.people[id]){sim.s.people[id].metPlayer=true;k.people[id]=true;}}
export function learn(sim,id,source){const c=CLUES[id],k=knowledge(sim);if(!c||k.clues[id])return false;k.clues[id]={source,day:sim.s.day};for(const person of c.nodes)k.people[person]=true;sim.save();return true;}
export function knownOrganization(sim){const k=knowledge(sim);const career=sim.s.facts.career;if(career)k.people[career==='court'?'inspector':'gang_boss']=true;const court=career==='court',head=sim.s.facts.courtHead;if(court)k.people.gate_guard=true;if(sim.s.people.scribe?.probed)k.people.scribe=true;const royal=sim.s.facts.princeRoyal;if(royal)k.people.traveler=true;return {nodes:[...(royal?[{id:'emperor',name:'天子',role:'皇帝',faction:'宗室王府',tier:0}]:[]),...(court&&!head?[{id:'vacancy',name:'巡街捕头 · 空缺',role:'待顾钦差选任',faction:'六扇门',tier:3}]:[]),...(career?[{id:'player',name:'少侠 · 你',role:career==='court'?courtRank(sim.s):'外堂弟子',faction:career==='court'?'六扇门':'赤砂帮',tier:court&&head!=='player'?4:3}]:[]),...[...NODES,...PEOPLE.filter(p=>(sim.s.people[p.id]?.probed||k.people[p.id])&&!NODES.some(n=>n.id===p.id)).map(p=>({id:p.id,name:p.name,role:p.title,faction:p.faction||'？？？',tier:4}))].filter(n=>k.people[n.id]||sim.s.people[n.id]?.probed).map(n=>({...n,...(court&&n.id==='gate_guard'?{tier:head==='gate_guard'?3:4,...(head==='gate_guard'?{role:'巡街捕头',faction:'六扇门'}:{})}:{}),...(n.id==='traveler'?{name:royal?'赵闲舟 · 王爷':sim.s.facts.princeAlias?'赵闲舟':'锦衣客',...(royal?{role:'王爷',tier:1}:{})}:{}),faction:n.id==='scribe'&&sim.s.people.scribe?.probed?'赤砂帮':n.id==='traveler'?(sim.s.facts.princeRoyal?'宗室王府':'？？？'):n.faction==='蔡京党羽'&&!k.clues.apex?'归属未明':n.faction,down:sim.s.people[n.id]?.hp<=0}))],clues:[...(royal?[{id:'royal-rank',text:'赵闲舟是王爷，临溪税案直接向天子回奏。',source:sim.s.facts.royalLetterEvidence?.source||'听雨楼会面',day:sim.s.facts.royalLetterEvidence?.day||sim.s.day,confidence:'已知',edges:[['emperor','traveler','直接领旨']]}]:[]),...(sim.s.people.scribe?.probed?[{id:'ink-sign',text:'刻字人袖中系着赤砂堂印房腰签。',source:'亲眼辨认',confidence:'已知',day:sim.s.people.scribe.probeDay||sim.s.day,edges:[['gang_boss','scribe','印房']]}]:[]),...(career?[{id:'career',text:'你已正式加入'+(career==='court'?'六扇门':'赤砂帮'),source:'入职登记',day:sim.s.day,confidence:'已知',edges:court?[['inspector',head||'vacancy',head?'任命':'待选'],...(!head?[['vacancy','gate_guard','候选'],['vacancy','player',sim.s.facts.courtCandidate?'已列名':'可报名']]:head==='gate_guard'?[['gate_guard','player','领班']]:[])]:[['gang_boss','player','统属']]}]:[]),...(sim.s.facts.gangKnown&&k.people.mei&&k.people.gang_boss?[{id:'gang-family',text:'梅知意是梅掌舵的女儿，亲事由她自己决定。',source:'当面交谈',day:sim.s.day,confidence:'已知',edges:[['gang_boss','mei','父女']]}]:[]),...Object.entries(k.clues).map(([id,v])=>({id,...CLUES[id],...v}))],unknown:!k.clues.apex};}
// Unknown seats are anonymous investigation space, never a projection of hidden identities/edges.
export function organizationSeats(sim){const v=knownOrganization(sim);return [1,2,3,4,6].map((capacity,tier)=>{const known=v.nodes.filter(n=>n.tier===tier);return [...known,...Array.from({length:Math.max(0,capacity-known.length)},(_,i)=>({id:`unknown-${tier}-${i}`,unknown:true,tier}))];});}
function portrait(n){if(n.id==='vacancy')return '<text text-anchor="middle" y="8" font-size="32">缺</text>';if(n.unknown)return '<circle cx="0" cy="-12" r="16" fill="#52605b"/><path d="M -30 34 Q -28 4 0 6 Q 28 4 30 34 Z" fill="#52605b"/><text text-anchor="middle" y="22" class="unknown-mark">？？</text>';
 const person=PEOPLE.find(p=>p.id===n.id),color=person?.color||0x68736d,cloth=typeof color==='number'?'#'+color.toString(16).padStart(6,'0'):color;
 return `<path d="M -32 34 L -26 8 L 0 1 L 26 8 L 32 34 Z" fill="${cloth}"/><path d="M -12 5 L 10 34 L 19 34 L -4 3 Z" fill="#d8cc9c"/><ellipse cx="0" cy="-12" rx="20" ry="23" fill="#d8bd86"/><path d="M -20 -17 Q -24 -39 0 -38 Q 24 -38 20 -17 L 10 -25 L -8 -20 Z" fill="#20291f"/><rect x="-7" y="-47" width="14" height="14" rx="3" fill="#20291f"/><circle cx="-7" cy="-12" r="2" fill="#20291f"/><circle cx="7" cy="-12" r="2" fill="#20291f"/>${['prisoner','old_constable','patron'].includes(n.id)?'<path d="M -8 2 L 0 16 L 8 2" fill="#8c8b79"/>':''}`;
}
function group(f){return ['六扇门','临溪守军','临溪县衙','税课司','临溪驿舍'].includes(f)?'官府':f;}
export function personTab(sim,id){const f=group(knownOrganization(sim).nodes.find(n=>n.id===id)?.faction);return !f||['？？？','归属未明'].includes(f)?'我的结交':f;}
export function organizationHTML(sim,esc,selected){
 const all=knownOrganization(sim),groups=[...new Set(['官府','赤砂帮','青竹会',...all.nodes.map(n=>group(n.faction)).filter(f=>f&&!['？？？','归属未明'].includes(f))])],tabs=[...groups,'我的结交','调查线索'];
 const tab=tabs.includes(selected)?selected:sim.s.facts.career==='gang'?'赤砂帮':'官府';
 const nav='<nav class="org-tabs" aria-label="势力分类">'+tabs.map(t=>`<button data-org-tab="${esc(t)}" aria-pressed="${t===tab}">${esc(t)}</button>`).join('')+'</nav>';
 if(tab==='我的结交'){const met=PEOPLE.filter(p=>{const n=sim.s.people[p.id];return n&&(n.metPlayer||n.greeted||n.probed||Object.keys(n.contactAttempts||{}).length||Object.keys(n.socialAttempts||{}).length);}).sort((a,b)=>sim.s.people[b.id].relation-sim.s.people[a.id].relation);
 return nav+'<h3>我的结交 · '+met.length+' 人</h3><div class="org-friends">'+met.map(p=>{const n=all.nodes.find(x=>x.id===p.id)||p,r=sim.s.people[p.id].relation;return `<article data-org-person="${esc(p.id)}"><svg viewBox="-42 -50 84 92" aria-hidden="true">${portrait(n)}</svg><div><b>${esc(n.name)}</b><small>${esc(n.faction||'归属未明')}</small></div><strong>好感 ${r>0?'+':''}${r}</strong></article>`;}).join('')+'</div>'+(!met.length?'<p>还没有结识的人。</p>':'');}
 if(tab==='调查线索')return nav+'<h3>已掌握的联系</h3>'+all.clues.map(c=>`<article class="org-evidence"><b>${esc(c.confidence)}</b><p>${esc(c.text)}</p><small>${esc(c.source)}</small></article>`).join('')+(all.clues.length?'':'<p>暂无线索。</p>');
 const members=all.nodes.filter(n=>group(n.faction)===tab),ids=new Set(members.map(n=>n.id)),v={clues:all.clues.filter(c=>c.edges.some(([a,b])=>ids.has(a)&&ids.has(b)))};
 const tiers=[...new Set([...(tab==='宗室王府'?[0,1]:[2,3,4]),...members.map(n=>n.tier)])].sort((a,b)=>a-b),rows=tiers.map(tier=>{const row=members.filter(n=>n.tier===tier);const seats=tier===4?4:tier===3?2:1;return [...row,...Array.from({length:Math.max(0,seats-row.length)},(_,i)=>({id:'unknown-'+tier+'-'+i,unknown:true,tier}))];});
 const width=Math.max(480,...rows.map(r=>r.length*160)),height=rows.length*210+35,points={};
 rows.forEach((row,y)=>row.forEach((n,x)=>points[n.id]={x:width/2+(x-(row.length-1)/2)*160,y:92+y*210}));
 let scaffold='';for(let i=1;i<rows.length;i++)for(const n of rows[i]){const linked=v.clues.some(c=>c.edges.some(([a,b])=>b===n.id&&points[a]));if(linked)continue;const above=rows[i-1],x=points[n.id].x,y=points[n.id].y;const mid=(points[above[0].id].x+points[above.at(-1).id].x)/2;scaffold+=`<path class="org-tier-line" d="M ${mid} ${y-105} H ${x} V ${y-72}"/>`;for(const parent of above)scaffold+=`<path class="org-tier-line" d="M ${points[parent.id].x} ${y-138} V ${y-105} H ${mid}"/>`;}
 const edges=v.clues.flatMap(c=>c.edges.map(([a,b,label])=>{const p=points[a],q=points[b];return p&&q?`<g class="${c.confidence==='传闻'?'rumor':''}"><path d="M ${p.x} ${p.y+72} C ${p.x} ${p.y+110}, ${q.x} ${q.y-110}, ${q.x} ${q.y-72}"/><text x="${(p.x+q.x)/2}" y="${(p.y+q.y)/2}" text-anchor="middle">${esc(label)}</text></g>`:'';})).join('');
 const nodes=rows.flat().map(n=>{const p=points[n.id];return `<g data-org-person="${esc(n.id)}" class="org-node ${n.unknown?'unknown':''}" transform="translate(${p.x},${p.y})"><title>${n.unknown?'身份未明：通过交谈与证言调查':esc(n.name+' · '+n.role)}</title><rect x="-70" y="-72" width="140" height="144" rx="8"/><g class="portrait" transform="translate(0,-10)">${portrait(n)}</g><text text-anchor="middle" y="43" class="org-name">${n.unknown?'？？':esc(n.name)+(n.down?' ×':'')}</text><text text-anchor="middle" y="62">${n.unknown?'身份未明':esc(n.id==='player'?n.faction+' · '+n.role:n.faction)}</text></g>`;}).join('');
 return `${nav}<h3>${esc(tab)} · 组织结构</h3>${tab==='官府'&&sim.s.facts.career==='court'?'<p>六扇门声望：'+((sim.s.factions?.['六扇门']||0)>=20?'友好':'中立')+' · '+courtRank(sim.s)+'</p>':''}<p>淡线标示层级；有标注的连线表示已掌握的关系。</p><div class="org-scroll"><svg class="org-graph" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="势力人物与未知席位">${scaffold}${edges}${nodes}</svg></div><details class="org-notes"><summary>已掌握的联系（${v.clues.length}）</summary>${v.clues.map(c=>`<article class="org-evidence ${c.confidence==='传闻'?'rumor':''}"><b>${esc(c.confidence)}</b><p>${esc(c.text)}</p><small>来源：${esc(c.source)} · 第 ${c.day} 日</small></article>`).join('')||'<p>与关口的人交谈，或在茶桌边听听往来消息。</p>'}</details>`;
}
