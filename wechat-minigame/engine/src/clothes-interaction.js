import {acquireRunnerClothes,runnerClothesTaken} from './runner-clothes.js';
import {earnGrowth} from './growth.js';
import {physicalReady} from './object-contracts.js';
export function clothesActions(sim){const p=sim.s.player;if(runnerClothesTaken(sim.s)||['fight','prison','testimony','exposed'].includes(sim.event?.gate?.phase))return [];return [{id:'g_buy',label:'付六文买旧差役服',cost:6,stat:null,difficulty:0},...(!sim.s.facts.runnerClothesCaught&&!sim.event?.gate?.attempts.includes('g_lift')?[{id:'g_lift',label:'偷走差役服',cost:0,stat:'agility',difficulty:45}]:[])];}
export function takeClothes(sim,id){
 const a=clothesActions(sim).find(a=>a.id===id),p=sim.s.player;
 if(!a||!physicalReady(p,id))return {error:'先靠近衣架，衣服也许已经被取走。'};
 const check=sim.preview(a);if(check.blocked)return {error:check.reason||'盘缠不足。'};
 const roll=a.stat&&!check.certain?1+Math.floor(sim.rng()*100):null,success=check.chance!==0&&(roll===null||roll<=check.chance);
 p.money-=a.cost;const changes=a.stat?earnGrowth(p,'agility',success?12:6,'world:runner-clothes'):[];
 if(success){acquireRunnerClothes(sim.s,id==='g_buy'?'purchased':'stolen');changes.push('收进包裹：旧差役服');}
 let seen=false;
 if(a.stat){const incident={type:'theft',owner:'relay',target:'runner-clothes',transferred:success,covert:success,x:p.x,z:p.z,...(check.sight?{sightWitnesses:check.sight.witnesses}:{})};sim.emit('worldIncident',incident);seen=!!incident.witnesses?.length;
  if(sim.s.chapterVersion===2){if(incident.witnesses?.includes('relay'))sim.s.facts.runnerClothesCaught=true;}
  else if(!success){sim.s.facts.runnerClothesCaught=true;sim.s.wanted++;sim.relation('relay',-4);changes.push('嫌疑 +1');}
 }
 const text=success?'你取下差役服，叠好收进包裹。'+(seen?'伸手被人看见了。':''):sim.s.chapterVersion!==2?'补衣人喝止了你，把衣架挪到眼皮底下。':seen?'伸手被看见，衣服仍在架上。':'衣襟钩住了架子，没能取下。';
 const result={actionId:id,kind:'steal',worldAction:true,label:a.label,text,roll,check,success,changes};sim.emit('result',result);sim.save();return result;
}
