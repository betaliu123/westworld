import {PEOPLE} from './data.js';
// World hierarchy is private data. UI receives only the player's discovered projection.
const NODES=[
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
export function meet(sim,id){const k=knowledge(sim);if(NODES.some(n=>n.id===id))k.people[id]=true;}
export function learn(sim,id,source){const c=CLUES[id],k=knowledge(sim);if(!c||k.clues[id])return false;k.clues[id]={source,day:sim.s.day};for(const person of c.nodes)k.people[person]=true;sim.save();return true;}
export function knownOrganization(sim){const k=knowledge(sim);const career=sim.s.facts.career;if(career)k.people[career==='court'?'inspector':'gang_boss']=true;return {nodes:[...(career?[{id:'player',name:'少侠 · 你',role:career==='court'?'捕快':'外堂弟子',faction:career==='court'?'六扇门':'赤砂帮',tier:3}]:[]),...NODES.filter(n=>k.people[n.id]).map(n=>({...n,...(n.id==='traveler'?{name:sim.s.facts.princeAlias?'赵闲舟':'锦衣客'}:{}),faction:n.id==='traveler'?(sim.s.facts.princeRoyal?'宗室王府':'？？？'):n.faction==='蔡京党羽'&&!k.clues.apex?'归属未明':n.faction,down:sim.s.people[n.id]?.hp<=0}))],clues:[...(career?[{id:'career',text:'你已正式加入'+(career==='court'?'六扇门':'赤砂帮'),source:'入职登记',day:sim.s.day,confidence:'已知',edges:[[career==='court'?'inspector':'gang_boss','player','统属']]}]:[]),...(sim.s.facts.gangKnown&&k.people.mei&&k.people.gang_boss?[{id:'gang-family',text:'梅知意是梅掌舵的女儿，亲事由她自己决定。',source:'当面交谈',day:sim.s.day,confidence:'已知',edges:[['gang_boss','mei','父女']]}]:[]),...Object.entries(k.clues).map(([id,v])=>({id,...CLUES[id],...v}))],unknown:!k.clues.apex};}
// Unknown seats are anonymous investigation space, never a projection of hidden identities/edges.
export function organizationSeats(sim){const v=knownOrganization(sim);return [1,2,3,4,6].map((capacity,tier)=>{const known=v.nodes.filter(n=>n.tier===tier);return [...known,...Array.from({length:Math.max(0,capacity-known.length)},(_,i)=>({id:`unknown-${tier}-${i}`,unknown:true,tier}))];});}
function portrait(n){if(n.unknown)return '<circle cx="0" cy="-12" r="16" fill="#52605b"/><path d="M -30 34 Q -28 4 0 6 Q 28 4 30 34 Z" fill="#52605b"/><text text-anchor="middle" y="22" class="unknown-mark">？？</text>';
 const person=PEOPLE.find(p=>p.id===n.id),color=person?.color||0x68736d,cloth=typeof color==='number'?'#'+color.toString(16).padStart(6,'0'):color;
 return `<path d="M -32 34 L -26 8 L 0 1 L 26 8 L 32 34 Z" fill="${cloth}"/><path d="M -12 5 L 10 34 L 19 34 L -4 3 Z" fill="#d8cc9c"/><ellipse cx="0" cy="-12" rx="20" ry="23" fill="#d8bd86"/><path d="M -20 -17 Q -24 -39 0 -38 Q 24 -38 20 -17 L 10 -25 L -8 -20 Z" fill="#20291f"/><rect x="-7" y="-47" width="14" height="14" rx="3" fill="#20291f"/><circle cx="-7" cy="-12" r="2" fill="#20291f"/><circle cx="7" cy="-12" r="2" fill="#20291f"/>${['prisoner','old_constable','patron'].includes(n.id)?'<path d="M -8 2 L 0 16 L 8 2" fill="#8c8b79"/>':''}`;
}
export function organizationHTML(sim,esc){
 const v=knownOrganization(sim),rows=organizationSeats(sim),width=Math.max(680,...rows.map(r=>r.length*160)),height=rows.length*210+35,points={};
 rows.forEach((row,y)=>row.forEach((n,x)=>points[n.id]={x:width/2+(x-(row.length-1)/2)*160,y:92+y*210}));
 const edges=v.clues.flatMap(c=>c.edges.map(([a,b,label])=>{const p=points[a],q=points[b];return p&&q?`<g class="${c.confidence==='传闻'?'rumor':''}"><path d="M ${p.x} ${p.y+72} C ${p.x} ${p.y+110}, ${q.x} ${q.y-110}, ${q.x} ${q.y-72}"/><text x="${(p.x+q.x)/2}" y="${(p.y+q.y)/2}" text-anchor="middle">${esc(label)}</text></g>`:'';})).join('');
 const nodes=rows.flat().map(n=>{const p=points[n.id];return `<g class="org-node ${n.unknown?'unknown':''}" transform="translate(${p.x},${p.y})"><title>${n.unknown?'身份未明：通过交谈与证言调查':esc(n.name+' · '+n.role)}</title><rect x="-70" y="-72" width="140" height="144" rx="8"/><g class="portrait" transform="translate(0,-10)">${portrait(n)}</g><text text-anchor="middle" y="43" class="org-name">${n.unknown?'？？':esc(n.name)+(n.down?' ×':'')}</text><text text-anchor="middle" y="62">${n.unknown?'身份未明':esc(n.faction)}</text></g>`;}).join('');
 return `<p>未知席位等待调查；头像随人物身份揭晓。只连接已掌握的关系，虚线为传闻。</p><div class="org-scroll"><svg class="org-graph" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="势力人物与未知席位">${edges}${nodes}</svg></div><h3>已掌握的联系</h3>${v.clues.map(c=>`<article class="org-evidence ${c.confidence==='传闻'?'rumor':''}"><b>${esc(c.confidence)}</b><p>${esc(c.text)}</p><small>来源：${esc(c.source)} · 第 ${c.day} 日</small></article>`).join('')||'<p>与关口的人交谈，或在茶桌边听听往来消息。</p>'}`;
}
