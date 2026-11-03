const topic=(id,label,reply,children)=>({id:'topic:'+id,mode:'topic',label,reply,children});
const matter=new Set(['story','prince_answer','prince_evidence','watch','escort','tax','apex','ledger','seal','vouch','identity_paper']);
const personal=new Set(['identity','prince_identity','prince_leave','tea_news','training','training_review']);
export function talkTree(id,actions){
 if(actions.length<=3)return actions;
 const prince=id==='traveler',groups=[[],[],[]];
 for(const a of actions)groups[matter.has(a.id)?0:personal.has(a.id)?1:2].push(a);
 const labels=prince?['说起临溪关的事','阁下在茶棚坐了许久。','我陪你坐一会儿。']:['打听正事','想问问阁下的事。','咱们聊几句。'];
 const replies=prince?['方才过关时，你遇见了什么？','这儿看得见城门。人来人往，比城里有意思。','请坐，茶还温着。']:['你想打听哪件事？','少侠想知道什么？','好，你说。'];
 function branch(items,key){return items.length<=3?items:[...items.slice(0,2),topic(key+':next','还有一事想请教。','你说。',branch(items.slice(2),key+':next'))];}
 return groups.flatMap((items,i)=>items.length<2?items:[topic(i,labels[i],replies[i],branch(items,String(i)))]);
}
