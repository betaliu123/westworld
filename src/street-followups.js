import {earnGrowth} from './growth.js';
// Each dispute has its own second obstacle; the first roll only changes leverage.
const entry=(speaker,question,labels,stat,success,failure,reward)=>({speaker,question,labels,stat,success,failure,reward});
export const STREET_FOLLOWUPS={
 gang:entry('chi','车让开了，明天再堵呢？青竹会先走，我们这趟急货谁来担？',['指出急货应先行，请捕头作证','替双方担保一次，赔付 8 文误工钱'],'charm','陆捕头记下急货先行、其余轮流的规矩。两帮收起拳头，你取得了通行凭据。','段赤川拒绝签约，陆捕头只同意今日止斗。路权仍待下次议定。','两帮通行凭据'),
 performance:entry('tea','人是留下了，可后排听不见。你们争着奏，谁来领这一段？',['向陈先生提议轮流领奏','让出主奏，替他把听众引到近处'],'charm','两人轮流接奏，听众终于听清完整曲子。陈先生把换气谱赠给你。','合奏仍未合上，陈先生接过主奏。你留下伴奏，下次可以再来。','陈先生的换气谱'),
 cargo:entry('inn','箱子移开还不算完。里面有碎瓷，装车时就坏了，还是摔坏的？',['翻看内层垫草，找出旧裂痕','先垫 8 文损耗，保住脚夫今日工钱'],'wit','垫草上的旧瓷粉说明装车前已有裂损。掌柜付清运费，留下下次帮工的凭条。','裂口看不清，掌柜只付没有争议的工钱。周大石记住你愿意替他说话。','听雨楼帮工凭条'),
 bargain:entry('porter','重复的扣款可以划掉。可堵路耽误的时辰，你肯替我向掌柜说明吗？',['把堵路与迟到的时辰逐一对上','补 8 文差额，请双方当面销账'],'wit','陆捕头在重算的账页上作证。旧债销清，掌柜给你一张赊茶凭条。','时辰仍有出入，陆捕头封存争议账页。双方答应暂不追债。','听雨楼赊茶凭条'),
 care:entry('chi','伤口能包，脸面怎么算？你要我先低头，他肯认自己也动了手？',['分别指出两人的过失，不逼谁单独认错','拿 8 文买药，让两人各递一条干净布'],'charm','两人互递布条，各认了先前出手的不是。阿青教你包扎伤口。','双方仍不肯认错，阿青将伤者分开。伤势稳定下来，争执尚未解决。','阿青的包扎口诀'),
 parley:entry('chi','轮流我认。若下次有人仗着人多插队，谁来叫停？',['请柳掌柜记下违约者，暂停其一次通行','付 8 文押在茶棚，担保第一次通行'],'charm','双方在茶棚按下手印。违约停行一次，掌柜保管约定。你成了两帮认可的见证人。','无人肯接受违约条款，约定只试行一天。掌柜会记下明日发生的事。','茶棚见证人的手印'),
 encore:entry('tea','这调子让我想起家里。可最后一句不是这样唱的，你愿意听我唱完吗？',['听清她的尾音，再接一遍','将主奏让给阿青，自己打拍子'],'wit','阿青唱完家乡的尾句。陈先生记下新谱，邀你下回同台。','你没有接稳尾音。陈先生示意先听阿青唱完，众人仍为她鼓掌。','同台演出的邀帖'),
 account:entry('porter','账清了，可这份谢礼有限。是分给今日帮忙的人，还是留作下次断绳的急用？',['列明帮工姓名，让掌柜当面分清','自己不拿谢礼，留作脚夫修担的急用钱'],'wit','掌柜逐项记下支出，帮工没有被漏掉。周大石送你一副顺手的绑绳。','账页缺了一个名字，掌柜暂存争议的那份。你仍替周大石保住修担的钱。','脚夫的牢靠绑绳')
};
const aidOutcomes={
 gang:'你垫付误工钱，双方接受这次担保，让急货先走。陆捕头记下今日的通行凭据，长期规矩仍要在茶棚商量。',
 performance:'你将主奏让给陈先生，招呼听众靠近。曲子完整奏完，他把换气谱赠给你。',
 cargo:'你垫付碎瓷损耗，掌柜不再扣脚夫今日工钱。裂损原因尚未查清，周大石把下次帮工的凭条交给你。',
 bargain:'你补齐争议的差额，双方当面销账。没人被判定有错，掌柜用一张赊茶凭条记下你的帮忙。',
 care:'你买来伤药，两人各递一条干净布，暂且不再追问谁先低头。阿青教你包扎伤口。',
 parley:'你留下押钱担保第一次通行，掌柜记下这一日的安排。两帮认可你作见证，长期规矩仍待试行。',
 encore:'你放下主奏，替阿青打拍子。她唱完故乡的小调，陈先生留下下次同台的邀帖。',
 account:'你把自己的谢礼留作修担的急用钱。掌柜另记一笔，周大石送你一副牢靠的绑绳。'
};
export function streetFollowupOptions(e){const f=STREET_FOLLOWUPS[e.type];if(!f||!e.followup)return null;
 const make=(id,label,stat,difficulty,cost=0)=>({id,label,stat,difficulty,cost,motion:'talk',delta:0,next:null,final:true,success:f.success,failure:f.failure});
 return [make('resolve_terms',f.labels[0],f.stat,e.firstSuccess?40:55),{...make('resolve_aid',f.labels[1],null,0,['gang','cargo','bargain','care','parley'].includes(e.type)||(e.type==='account'&&e.firstSuccess&&e.firstAction==='settle')?8:0),success:aidOutcomes[e.type]},{...make('resolve_leave','请当事人暂且分开，留待以后再谈',null,0),withdraw:true,success:'你请众人暂且分开。这次介入没有解决余下的分歧，后续仍可能再起。'}];
}
export function finishStreet(d,a,r){const e=d.active,f=STREET_FOLLOWUPS[e.type];if(!f)return;
 if(!a.final){e.followup=true;e.lastQuestion=f.question;e.firstSuccess=r.success;e.firstAction=a.id;e.next=a.next;e.elapsed=0;e.lastHit=0;e.stage=r.success?'事情还没说完':'换个办法继续';r.ongoing=true;r.dialogue.push({id:f.speaker,text:r.success?f.question:'先别急着再试。'+f.question});r.hint='对方提出了新的条件。听完后继续选择。';return;}
 r.ongoing=false;e.outcome=r.text;
 if(r.success&&!a.withdraw){const p=d.sim.s.player;if(!p.inventory.includes(f.reward)){p.inventory.push(f.reward);r.changes.push('获得：'+f.reward);}d.sim.s.facts['street_'+e.type]=true;r.changes.push(...earnGrowth(p,f.stat,30,`street-mastery:${e.type}`));
  if(['gang','parley'].includes(e.type)){for(const name of ['青竹会','赤砂帮'])d.s.factions[name]+=3;r.changes.push('两帮关系各 +3');}
  if(['care','cargo','account'].includes(e.type)){p.energy=Math.min(100,p.energy+15);r.changes.push('体力恢复，最多 +15');}
  d.sim.relation(f.speaker,5);r.changes.push('当事人好感 +5');
 }
 d.s.outcomes.push({type:e.type,day:d.sim.s.day,outcome:r.text});
 d.end(r.success&&!a.withdraw?e.next:d.template.follow);
}
