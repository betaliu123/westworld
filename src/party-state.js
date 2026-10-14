// Party members keep physical state; money and items belong to the shared pack.
export function ensureParty(s){
 if(!s.party){const main=s.player;s.party={active:'main',wallet:main.money,inventory:main.inventory,members:{main,companion:{x:main.x+1.8,z:main.z+1,hp:100,energy:100,stats:{might:42,agility:62,charm:65,wit:55},xp:0,order:'follow'}}};}
 const party=s.party;party.active=party.members[party.active]?party.active:'main';
 for(const p of Object.values(party.members))for(const key of ['money','inventory'])Object.defineProperty(p,key,{enumerable:true,configurable:true,get:()=>party[key==='money'?'wallet':'inventory'],set:v=>party[key==='money'?'wallet':'inventory']=v});
 s.player=party.members[party.active];return party;
}
export function switchMember(s,id){const p=ensureParty(s);if(!p.members[id]||id===p.active)return false;p.active=id;s.player=p.members[id];return true;}
export const COMMANDS=['follow','wait','perform','stop','move','pickup','buy','shake'];
export function localCommand(text){
 if(/毒|偷|抢|杀|砍|攻击|然后|再去|接着/.test(text))return null;
 if(/别|不要|不许|不要再/.test(text))return 'wait';
 if(/停|收起|休息/.test(text))return 'stop';if(/吹|笛|卖艺|奏曲/.test(text))return 'perform';
 if(/跟|随我/.test(text))return 'follow';if(/等|留下|守在/.test(text))return 'wait';
 if(/买/.test(text))return 'buy';if(/捡|拾/.test(text))return 'pickup';if(/摇.*树|摘.*果/.test(text))return 'shake';
 if(/去|走到|过去/.test(text))return 'move';return null;
}
export function validCommand(action,target){return COMMANDS.includes(action)&&(!['move','pickup','buy','shake'].includes(action)||!!target&&Number.isFinite(target.x)&&Number.isFinite(target.z)&&({pickup:target.kind==='ground',buy:target.kind==='food',shake:target.kind==='tree',move:true}[action]));}
