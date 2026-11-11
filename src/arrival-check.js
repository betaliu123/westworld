import {skill} from './skills.js';
// Re-evaluated at confirmation: the preview never owns a stale success chance.
export function identityCheck(s,{uniform=false,owner='gate_merchant'}={}){
 const p=s.player,n=s.people[owner],holder=s.watch?.holder||'gate_guard',guard=s.people[holder];
 const pass=s.ecosystem?.items.find(i=>i.location==='player'&&i.documentId==='merchant-pass'&&i.hp>0);
 const has=uniform?p.disguise==='runner':!!pass||p.inventory.some(x=>['他人的路引','改名路引'].includes(x));
 const reasons=[];let chance=100;
 const known=uniform?!!s.facts.runnerNameKnown:!!s.facts.knownNames?.[owner];
 if(!has)return {blocked:true,chance:0,certain:false,score:p.stats.charm,reason:uniform?'未穿差役服':'身上没有路引'};
 if(!known){chance=45;reasons.push('答不上原主姓名');}else reasons.push('姓名与凭据相合');
 const originalNearby=n?.hp>0&&Math.hypot((n.x??6)-p.x,(n.z??24)-p.z)<5;
 const recognized=!uniform&&(holder==='gate_guard'||guard?.knownPeople?.includes(owner));
 if(recognized){chance=0;reasons.push('当值守卫认得赵成');}
 if(!uniform&&(n?.passReported||s.facts.passReported||pass?.reported)){chance=0;reasons.push('路引已经报失');}
 if(!uniform&&originalNearby){chance=0;reasons.push('原主就在眼前');}
 if(!uniform&&(n?.passMissingNoticed||s.facts.passMissingNoticed)&&chance>0){chance-=25;reasons.push('失主正在寻找路引');}
 if((p.gender==='female')&&skill(p,'disguise').tier<3){chance=Math.min(chance,35);reasons.push('年貌与凭据不合，尚未学会修饰');}
 if(p.age&&Math.abs(p.age-36)>15&&skill(p,'disguise').tier<3){chance=Math.min(chance,35);reasons.push('年岁明显不合');}
 if(!known&&chance>0)chance+=Math.round((p.stats.charm-40)/2);
 chance=Math.max(0,Math.min(100,chance));
 return {blocked:false,chance,certain:chance===100||chance===0,score:p.stats.charm,reason:reasons.join('；'),reasons};
}
