import {visibleBetween} from './npc-awareness.js';
import {heldLedger,ledgerCase} from './ledger-case.js';
import {runnerClothesTaken} from './runner-clothes.js';
import {hearsQingheCry} from './qinghe-cry.js';
import {needsContextGuide,queueContextGuide} from './context-guide.js';

export const THOUGHTS={
 qingheLasso:'（要强行带她走，得先用套索拴住她，再牵到黄旗车旁。）',
 workCoat:'（短褂收到了，先换上，再随车队走。）',
 qingheCry:'（石头后有哭声……奇怪，或许可靠近看看。）',qingheSeen:'（那位姑娘在低声抽泣……过去问问吧。）',qingheIdentity:'（她不愿随车走，名册却记着她……若能扮作她的模样，或许可以冒用她的身份，混入车队。）',
 responsibility:'（听他这意思，若放我进去出了事，责任就得落在他身上。）',coat:'（衣架上这身差服，和关口差役穿的很像。或许值得仔细看看。）',coatBag:'（差服已经拿到了，得换到身上，旁人才看得见这身打扮。）',collar:'（领口还留着原主的名字。有人若问起这身衣服，恐怕得说清来历。）',lapel:'（这位行商护着左胸前的衣襟，里面莫非揣着什么要紧东西？）',familiar:'（韩校尉认得他的模样。若有人冒用他的身份，到了关前恐怕就会露馅。）',debt:'（多亏他当面担保，才过了这一关。这份人情，我得记着。）',wood:'（这块闸板的木头已经朽了，和旁边的不大一样。也许能从这里想想办法。）',daughter:'（茶娘担心女儿，可青禾自己是怎么想的，还得当面问问她。）',ring:'（戒指是还回去了，可苏晚答不答应亲事，终究得听她自己的意思。）',ledger:'（账本已经拿到了，还不知道里面记了些什么。先翻一翻，再决定怎么用。）'
};
const near=(p,q,r=4)=>q&&Math.hypot(p.x-q.x,p.z-q.z)<r;
export function thoughtCandidates(s,{positions={},obstacles=[],details={},qingheCryHeard=false}={}){
 const p=s.player,f=s.facts,seen=s.chapter?.observed||{},out=[];
 const visible=(id,r=4)=>near(p,positions[id],r)&&s.people[id]?.hp>0&&visibleBetween(p,positions[id],obstacles,s.ecosystem?.objects);
 const add=(key,site,ok)=>{if(ok)out.push({key,site,text:THOUGHTS[key]});};
 if(hearsQingheCry(s,positions.qinghe,obstacles)){
  const seen=visibleBetween(p,positions.qinghe,obstacles,s.ecosystem?.objects);
  if(seen||qingheCryHeard)out.push({key:'qingheCry',site:'qingheCry',text:seen?THOUGHTS.qingheSeen:THOUGHTS.qingheCry});
 }
 add('qingheLasso','qingheLasso',s.qingheJourney?.mode==='force'&&!s.qingheJourney.delivered&&!s.people.qinghe.restraint&&visible('qinghe',8));
 add('qingheIdentity','qingheIdentity',(s.qingheJourney?.mode==='spare'||!s.qingheJourney&&!f.qingheHesitationKnown)&&f.qingheUnwillingKnown&&f.qingheRosterRouteKnown&&!f.enteredCity&&!f.qingheConsent&&!s.convoy?.closed&&!s.convoy?.passenger&&!s.convoy?.command&&(!s.convoy||s.convoy.phase==='gate')&&visible('qinghe',8));
 add('ledger','ledger',!!heldLedger(s)&&!ledgerCase(s).read);
 add('coatBag','coatBag',p.inventory.includes('旧差役服')&&p.disguise!=='runner'&&!f.enteredCity);
 add('workCoat','workCoat',!f.enteredCity&&s.ecosystem?.items.some(i=>i.location==='player'&&i.hp>0&&i.type==='clothing'&&i.id!==p.wornOutfit&&(/役夫|短褂/.test(i.name)||i.ownerId==='porter')));
 add('responsibility','gate',f.guardResponsibilityHeard&&!f.enteredCity&&(visible('gate_guard')||visible('gate_relief')));
 add('coat','rack',seen.guardCoat&&!runnerClothesTaken(s)&&near(p,{x:-11,z:24.5},3.5)&&visibleBetween(p,{x:-11,z:24.5},obstacles,s.ecosystem?.objects));
 add('collar','collar',f.runnerNameKnown&&(p.inventory.includes('旧差役服')||near(p,{x:-11,z:24.5},3)));
 add('lapel','merchant',details.gate_merchant==='guardLapel'&&visible('gate_merchant')&&s.ecosystem?.items.some(i=>i.documentId==='merchant-pass'&&i.location==='npc:gate_merchant'&&i.hp>0));
 add('familiar','merchantKnowledge',f.merchantGuardKnown&&visible('gate_merchant'));
 add('daughter','teaHost',f.motherConcernHeard&&!f.qingheWishKnown&&visible('tea_host'));
 add('debt','royalEntry',f.entryRoute==='royal'&&f.princeDebt&&p.z<21);
 add('wood','river',near(p,{x:-22,z:21},4)&&s.ecosystem?.objects['river-fence']?.hp>0&&visibleBetween(p,{x:-22,z:21},obstacles.filter(o=>o.id!=='river-fence'),s.ecosystem?.objects));
 add('ring','ring',f.suMarriageBoundary&&s.ecosystem?.items.some(i=>i.type==='ring'&&i.location==='npc:shen'&&i.provenance?.history?.some(h=>h.from==='player')));
 return out;
}
export function showSituationalThought(sim,context,now,say,busy=false){
 const s=sim.s;if(s.chapterVersion!==2||busy||s.player.hp<=0)return false;
 const c=s.chapter??={done:{},heard:{},titles:[]},memory=c.thoughts??={seen:{},sites:{},last:-100};
 const next=thoughtCandidates(s,context).find(t=>!memory.seen[t.key]&&!memory.sites[t.site]||needsContextGuide(s,t.key));
 if(now-memory.last<20&&next?.key!=='qingheIdentity'&&!needsContextGuide(s,next?.key))return false;
 if(!next||!memory.seen[next.key]&&!say(next.text))return false;
 queueContextGuide(s,next.key);
 memory.seen[next.key]=true;memory.sites[next.site]=true;memory.last=now;sim.save();return true;
}
