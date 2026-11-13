import {identityGreeting} from './identity-opportunities.js';
import {identityName} from './appearance.js';
import {identityRelationship} from './identity-network.js';
let library={};
if(typeof document!=='undefined')fetch('./assets/disguise-reactions.json').then(r=>r.ok?r.json():{}).then(d=>library=d.lines||{}).catch(()=>{});
export function disguiseLine(id,phase,check,s){
 if(check?.duplicate)return '那边站着的才是'+identityName(check.face)+'。你这张脸是怎么回事？';
 if(phase==='failure'&&check?.evidence==='faceChange')return '我亲眼看见你换了面貌。把易容卸了，用本来面目说话。';
 if(phase==='failure'&&check?.evidence==='exposed')return '这副易容我已经识破，不必再遮掩。把易容卸了，再把来意说清。';
 if(id==='fu'&&check?.face==='qinghe'&&!check.known&&phase==='question')return '宋青禾？名册上虽有这个名字，可近来的传言得先说清。';
 const edge=identityRelationship(check?.face,id);if(edge&&phase==='question')return edge.question;if(edge&&phase==='success')return s?identityGreeting(s,id,check.face):edge.greeting;if(edge?.failure&&phase==='failure')return edge.failure;if(id==='porter'&&check?.face==='fu'){const line={question:check.mismatch?'符管事？您怎么换了这身衣裳，言行也与平日不同？':'符管事，这件事我得问清楚，免得回头账对不上。',success:'好，符管事。这笔事我记下了。',failure:'不对，您这言行不像符管事。先把这张假面卸了！'}[phase];if(line)return line;}const key=(['gate_guard','gate_relief','guard','inspector'].includes(id)?'official':id==='traveler'?'noble':id==='tea_host'?'host':'trader')+'.'+phase;const variants=library[key];if((phase==='failure'||check?.mismatch)&&Array.isArray(variants)&&variants.length)return variants[Math.floor(Math.random()*variants.length)].replaceAll('{name}',identityName(check?.face));return ({question:check?.mismatch?'这身打扮倒新鲜，与你往日大不相同。今日怎么换了这一身？':'且慢。看着眼熟，来历再说清楚。',success:'原来如此，倒是我多心了。',failure:'面貌像，举止却不对。你到底是谁？',original:'这张脸……你竟扮作我？当面弄鬼，把伪装卸了！'})[phase];
}
export function disguiseAnswers(check){return [{id:'explain',label:'只是换身衣裳，今日有些私事。',stat:'charm',reason:check.reason},{id:'admit',label:'不再掩饰，卸去易容。'},{id:'leave',label:'先告辞。'}];}
