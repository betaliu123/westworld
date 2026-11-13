const topic=(id,label,children)=>({id:'topic:'+id,mode:'topic',label,children});
function subject(a){
 const id=a.id;
 for(const [pattern,label] of [[/genyue|gy_/,'赴艮岳'],[/ledger/,'副账'],[/qinghe|list_show/,'名册与去留'],[/royal|entry_|prince/,'关口与托付'],[/tea_worry|tea_fee|help_mother|tea_daughter/,'茶棚的难处'],[/clothes|runner|tea_coat/,'衣领旧字'],[/merchant|gate_|^g_|story/,'关口盘查'],[/convoy|tea_porter/,'纲队'],[/poison|herb|grind|appearance_paste/,'药材'],[/ap_news_/,'过关见闻'],[/^ap_|training/,'方才的手法'],[/shen|su_|ring/,'桥头的事'],[/deal/,'沿途见闻'],[/identity|if_/,'身份与钱物']])if(pattern.test(id))return label;
 return a.label.replace(/[。？?！!].*$/,'').slice(0,10)||'来意';
}
export function talkTree(id,actions){
 if(actions.length&&actions.every(a=>a.id.startsWith('if_identity_'))){const branch=list=>list.length<=3?list:[...list.slice(0,2),topic('identity-more','再谈钱物与案情',branch(list.slice(2)))];return branch([...actions,{id:'if_end',label:'这些事暂且不办',mode:'endTalk',kind:'listen'}]);}
 if(actions.length<=3)return actions;
 const groups=new Map();for(const a of actions){const key=subject(a);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 function branch(items,key){return items.length<=3?items:[...items.slice(0,2),topic(key+':next',subject(items[2]),branch(items.slice(2),key+':next'))];}
 let rows=[...groups].map(([label,items],i)=>items.length===1?items[0]:topic(id+':'+i,label,branch(items,id+':'+i)));
 if(rows[0]?.children){const first=rows[0].children[0];if(first.mode!=='topic')rows=[first,topic(id+':context',rows[0].label,rows[0].children.slice(1)),...rows.slice(1)];}
 return branch(rows,id+':topics');
}
