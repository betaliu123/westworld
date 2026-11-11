const topic=(id,label,children)=>({id:'topic:'+id,mode:'topic',label,children});
const matter=new Set(['deal','story','prince_answer','prince_evidence','watch','escort','tax','apex','ledger','seal','vouch','identity_paper']);
const personal=new Set(['identity','prince_identity','prince_leave','tea_news','training','training_review']);
export function talkTree(id,actions){
 if(actions.length<=3)return actions;
 const prince=id==='traveler',groups=[[],[],[]];
 for(const a of actions)groups[a.id.startsWith('ap_')?1:matter.has(a.id)||a.id.startsWith('ch_')?0:personal.has(a.id)?1:2].push(a);
 const labels=prince?['说起临溪关的事','阁下在茶棚坐了许久。','我陪你坐一会儿。']:['打听正事',actions.some(a=>a.id.startsWith('ap_'))?'请教手艺':'想问问阁下的事。','咱们聊几句。'];
 function branch(items,key){return items.length<=3?items:[...items.slice(0,2),topic(key+':next','还有一事想请教。',branch(items.slice(2),key+':next'))];}
 return groups.flatMap((items,i)=>items.length<2?items:[topic(i,labels[i],branch(items,String(i)))]);
}
