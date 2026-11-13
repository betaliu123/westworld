import {believedIdentity,appearanceState,identityName} from './appearance.js';
// A place and an affiliation are independent ledgers. Gate and town share Linxi.
export const CITIES={linxi:'临溪镇',bianjing:'汴京'};
export const HEADQUARTERS=[
 {id:'court',name:'六扇门',place:'官府大堂',glyph:'官',x:10,z:-23,color:'#8ca8bc'},
 {id:'gang',name:'赤砂帮',place:'赤砂堂',glyph:'砂',x:23,z:-5,color:'#be6a52'},
 {id:'qingzhu',name:'青竹会',place:'青竹会驻地',glyph:'竹',x:11,z:21,color:'#9caa7b'},
 {id:'wuxiang',name:'无相门',place:'刻字摊联络处',glyph:'印',x:11,z:24,mapOffset:[19,6],color:'#b3a4c0',secret:true}
];
export function cityOf(s){return CITIES[s.currentCity]?s.currentCity:'linxi';}
export function reputation(s){
 if(!s.repute){s.repute={cities:{linxi:Math.max(-100,Math.min(100,s.reputation||0))},factions:{},seenGlobal:s.reputation||0};}
 s.repute.cities??={};s.repute.factions??={};
 for(const h of HEADQUARTERS)if(s.repute.factions[h.id]==null)s.repute.factions[h.id]=s.factions?.[h.name]||0;
 const delta=(s.reputation||0)-(s.repute.seenGlobal||0);
 if(delta){const city=cityOf(s);s.repute.cities[city]=Math.max(-100,Math.min(100,(s.repute.cities[city]||0)+delta));s.repute.seenGlobal=s.reputation||0;}
 return s.repute;
}
export function cityRep(s,id=cityOf(s)){return reputation(s).cities[id]||0;}
export function factionRep(s,id){const r=reputation(s),h=HEADQUARTERS.find(h=>h.id===id);if(h&&s.factions?.[h.name]!=null)r.factions[id]=s.factions[h.name];return r.factions[id]||0;}
export function earnReputation(sim,{city=cityOf(sim.s),faction,amount=0,reason,key,observer,subject}){
 const s=sim.s,r=reputation(s);r.claims??={};if(key&&r.claims[key])return false;if(key)r.claims[key]=true;
 const actor=subject|| (observer?believedIdentity(s,observer):'player');if(actor!=='player'){const other=appearanceState(s).reputations[actor]??={cities:{},factions:{}};if(city)other.cities[city]=(other.cities[city]||0)+amount;if(faction)other.factions[faction]=(other.factions[faction]||0)+amount;sim.emit('sandbox',{text:identityName(actor)+'的名声 '+(amount>0?'+':'')+amount+'：'+reason});return true;}
 if(city){r.cities[city]=Math.max(-100,Math.min(100,(r.cities[city]||0)+amount));s.reputation=Math.max(-100,Math.min(100,(s.reputation||0)+amount));r.seenGlobal=s.reputation;}
 if(faction){const h=HEADQUARTERS.find(h=>h.id===faction);r.factions[faction]=Math.max(-100,Math.min(100,factionRep(s,faction)+amount));if(h){s.factions??={};s.factions[h.name]=r.factions[faction];}}
 if(amount)sim.emit('reputationChanged',{city,faction,amount,reason});return true;
}
export const reputationName=n=>n>=50?'敬重':n>=20?'友好':n<=-40?'敌对':n<0?'戒备':'素昧平生';
export function knownHQ(s){return HEADQUARTERS.filter(h=>!h.secret||s.facts.scribeIdentity);}
export function reputationHTML(s,esc){return `<section class="repute-ledgers"><div><h3>各地名声</h3>${Object.entries(CITIES).map(([id,n])=>`<p><b>${n}</b><span>${id in reputation(s).cities?cityRep(s,id):'未至'}${id===cityOf(s)?' · 此地':''}</span></p>`).join('')}</div><div><h3>各方态度</h3>${knownHQ(s).map(h=>`<p><b>${h.name}</b><span>${factionRep(s,h.id)} · ${reputationName(factionRep(s,h.id))}</span></p>`).join('')}</div></section>`;}
