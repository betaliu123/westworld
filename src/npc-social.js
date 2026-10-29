import {princeSocial} from './prince-voice.js';
import {growthBonus,earnGrowth} from './growth.js';
import {admitFriend} from './gate-scene.js';
export function socialOptions(sim,id){const n=sim.s.people[id],alert=n?.awareness;return [
 {id:'befriend',label:'聊聊他的近况，试着结交',stat:'charm',difficulty:45,mode:'social',kind:'listen'},
 {id:'gift',label:'请喝茶，送一份心意',stat:'charm',difficulty:30,cost:4,mode:'social',kind:'support'},
 ...(alert?.caseOpen?[{id:'apology',label:alert.severe?'收刀道歉，缓和敌意（仍须担责）':'收刀赔礼，赔付修缮钱',stat:'charm',difficulty:40,cost:alert.severe?0:8,mode:'social',kind:'listen'}]:id==='gate_guard'&&sim.event?.type==='gate'?[{id:'vouch',label:(n.relation<8||(n.trust||0)<5)?'请他担保（还需增进信任）':'请他担保，让自己先进城',stat:'charm',difficulty:65,mode:'social',kind:'listen'}]:[])];}
export function socialPreview(sim,id,a){const n=sim.s.people[id],p=sim.s.player,tries=n.socialAttempts?.[sim.s.day+':'+a.id]||0;const chance=Math.max(5,Math.min(95,p.stats.charm+40-a.difficulty+Math.round(n.relation/3)+growthBonus(p,'charm')-tries*18));return {score:p.stats.charm,chance,certain:false,blocked:p.money<(a.cost||0)||(a.id==='vouch'&&((n.relation<8||(n.trust||0)<5)||!!n.awareness?.caseOpen))};}
export function socialResolve(sim,id,kind){const n=sim.s.people[id],a=socialOptions(sim,id).find(a=>a.id===kind);if(!a||!n||n.hp<=0)return {error:'对方无法应答。'};const p=sim.s.player,alert=n.awareness;if(alert?.state==='fight')return {error:'先收刀拉开距离，对方正在交战。'};
 if(kind==='vouch'&&((n.relation<8||(n.trust||0)<5)||alert?.caseOpen))return {error:alert?.caseOpen?'眼前的冲突还没解决，他不肯为你担保。':'他还不够信任你，不肯承担这个责任。'};
 const check=socialPreview(sim,id,a);if(check.blocked)return {error:'盘缠不够。'};n.socialAttempts??={};const key=sim.s.day+':'+kind,tries=n.socialAttempts[key]||0;n.socialAttempts[key]=tries+1;p.money-=a.cost||0;
 const roll=1+Math.floor(sim.rng()*100),success=roll<=check.chance;const delta=success?Math.max(0,(kind==='gift'?6:8)-tries*4):-2;sim.relation(id,delta);if(success&&kind==='befriend'&&tries===0)n.trust=Math.min(100,(n.trust||0)+2);
 let text=success?(kind==='gift'?'这碗茶正合口，多谢。':kind==='vouch'?'我替你作保，先去城里补凭据。出了事，可别让我难做。':({gate_guard:'说起来，值完这一班，我也想回家歇歇。',relay:'补了半日衣裳，难得有人肯坐下来聊几句。',gate_merchant:'这趟路走得不易，能碰上个聊得来的人也好。',scribe:'刻字最费眼力，歇一会儿也好。'}[id]||'这番话听着投缘。往后碰面，再聊聊。')):(tries?'心意我明白了。让我先忙完手上的事。':'今日忙得很，改日再谈吧。');
 if(kind==='apology'){text=success?'先把刀收好。毁坏的东西还得赔，别再动手。':'这事还没完，别想几句话就算了。';if(success&&alert&&!alert.severe){alert.state='return';alert.caseOpen=false;alert.strikes=0;text='修缮的钱我收下了。下次再犯，可没这么便宜。';}else if(alert?.severe){text='动手伤人的事，得去衙门说清楚。';}}
 if(id==='traveler')text=princeSocial(kind,success,tries,alert?.severe);
 if(kind==='vouch'&&success)admitFriend(sim);
 const r={type:'npc',eventId:'social:'+sim.s.day+':'+id+':'+kind+':'+tries,actionId:kind,label:a.label,kind:a.kind,motion:kind==='gift'?'drink':'talk',check,roll,success,text,changes:[`好感 ${delta>=0?'+':''}${delta}`,...earnGrowth(p,'charm',success?10:4,'social:'+key+':'+id)],dialogue:[{id,text}],authored:true};n.memories.push(text);n.memories=n.memories.slice(-12);sim.s.history.push(r);sim.emit('result',r);sim.save();return r;}
