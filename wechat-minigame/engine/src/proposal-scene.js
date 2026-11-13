import {earnGrowth,growth,checkGrade} from './growth.js';

const a=(id,label,stat=null,difficulty=0,kind='listen',extra={})=>({id,label,stat,difficulty,kind,cost:0,tags:[],...extra});
export const isProposal=e=>e?.type==='proposal'&&e.flowVersion!==1;
export function proposalState(e){return e.proposal??={phase:'opening',facts:{},attempts:[]};}
export function proposalView(sim){
 const q=proposalState(sim.event),f=q.facts;
 const views={
 opening:['她说要走，他却拦住了路','苏晚收起琴囊，已明确拒绝今日定亲。沈砚横在桥口，手里的戒盒还开着。围观者只顾起哄，没人肯让路。'],
 talk:['求亲，还是拿婚事填债？','沈砚说戒指已经赊来，今日退亲会让他在外堂丢尽脸。苏晚反问：不是说早就攒好了钱？他的说法对不上。'],
 hands:['戒盒下面的纸','你靠近时看见一张盖着青竹会印记的纸，压在戒盒底下。沈砚每听见“今天”两个字，便攥紧袖口。'],
 ready:['目光暂时移开了',f.cover?'高小楼把围观的人引到桥栏边。你只有这一次机会，取纸还是把看到的事说出来？':'沈砚仍盯着戒盒；若先伏低身形，动作不容易被看见。'],
 resistance:['他没有被说服','沈砚合上戒盒：“这是我们的事，你凭什么管？”苏晚仍没答应。高小楼拦住了继续起哄的人。'],
 caught:['手被当场按住','沈砚按住你的手腕，纸条还在戒盒下面。苏晚问：“你到底看见了什么？”现在还来得及解释或退让。'],
 evidence:['求亲背后的催缴条','纸上要求沈砚今日交清一笔外堂催缴银，否则拿走他的差事。成亲后，他原打算借苏晚的演出所得填上缺口。苏晚尚不知道这回事。'],
 challenge:['先约好规矩','沈砚拦在苏晚面前。你提出点到为止：胜负只决定他是否退开听人说话，不决定苏晚嫁给谁。'],
 duel:['点到为止','沈砚已应下切磋。收起菜单，按 / 拔刀、左键出招，WASD 移动。把他压到半血便收手；你气血不足或离开桥头就认输。'],
 setback:['输了，也能继续说','沈砚收了手，高小楼扶你站稳。苏晚没有走：“我说不定亲，就是不定亲。高小楼，让他别再拦路。”'],
 decision:['决定怎样处理这张纸',f.route==='combat'?'沈砚退开，将催缴条放到桌面：“我是怕失去差事，才催得这么急。”苏晚要求自己决定去留。':'沈砚承认催缴银的压力，却请求别让全街都知道。苏晚已决定离开。沈砚问你是否愿意留下作证，查清这笔催缴。']
 };
 views.stolen=['袖中的银戒','戒指已经在你袖中。他们还在争辩，没有人看见是谁拿的。留下还是交回，是你自己的选择。'];views.caught_ring=['偷窃被当场抓住','沈砚扣住你的手腕。苏晚退到桥栏边：我不答应婚事，也不等于你能偷他的东西。'];
 const [title,text]=views[q.phase]||views.opening;
 const dialogue=q.phase==='opening'?[{id:'su',text:'我说了，今天不定亲。车还在等，把路让开。'},{id:'shen',text:'戒指都赊来了！这么多人看着，你让我怎么收场？'},{id:'gao',text:'嚷什么？桥又不是你家的。借过，让人走。'}]:[{id:'shen',narration:true,text}];
 return {title,text,line:q.lastText||text,dialogue};
}
export function proposalActions(sim){
 const q=proposalState(sim.event),f=q.facts;
 switch(q.phase){
 case 'stolen':return [a('p_keep_ring','藏好银戒，趁人群散开离去',null,0,'steal'),a('p_give_ring','当面放回戒指，承认自己动了手'),a('p_drop_ring','将银戒塞回盒边，装作什么也没发生','agility',42,'steal')];
 case 'caught_ring':return [a('p_ring_apology','承认偷窃，请沈砚收回手，愿付 6 文赔礼','charm',55,'listen',{cost:6}),a('p_ring_submit','不再抵赖，交给捕头处理'),a('p_ring_flee','挣脱手腕，逃离桥头','agility',60,'steal')].filter(a=>!q.attempts.includes(a.id));
 case 'opening':return [a('p_listen','“她已经说要走了。你为什么还拦着？”'),a('p_watch','趁他争辩，顺走敞开戒盒里的银戒','agility',62,'steal'),a('p_interpose','架开沈砚的胳膊，把桥上的路让出来','might',48,'combat')];
 case 'talk':return [a('p_persuade','“拦人只会更丢脸。退一步，还能自己收场。”','charm',48),a('p_probe','抓住赊账与攒钱的矛盾，逼他解释外堂催缴','wit',48),a('p_offer','花 8 文请看客喝茶，留出说话空间',null,0,'listen',{cost:8})];
 case 'hands':return [a('p_divert','请高小楼引开围观者的目光','charm',42),a('p_take','趁他举起戒盒，抽出纸条','agility',70,'steal'),a('p_ask','直接问沈砚纸上写着什么','wit',58)];
 case 'ready':return [a('p_take_ready',growth(sim.s.player,'theft').level?'伏低身形，取出催缴条':'借遮挡取出催缴条','agility',f.cover?38:58,'steal'),a('p_openly','不取纸，指出青竹会的印记','wit',42)];
 case 'resistance':return [a('p_insist','指出他的目光一直在躲闪','wit',62),a('p_challenge','提出点到为止的切磋',null,0,'combat'),a('p_stepback','先退开，让苏晚自己开口')];
 case 'caught':return [a('p_explain','承认越界，但请他解释催缴条','charm',58),a('p_yield','收回手，向苏晚坦白自己的疑问'),a('p_escape','挣开手腕，退到高小楼身边','agility',55,'steal')];
 case 'evidence':return [a('p_read','看清催缴条，再问沈砚'),a('p_return_note','把纸放回去，请他自己向苏晚解释','charm',45)];
 case 'challenge':return [a('p_duel','约定点到为止，开始切磋',null,0,'combat'),a('p_reason','不动刀，讲明婚事不该由输赢决定','charm',52),a('p_backdown','收势，让苏晚自己表态')];
 case 'duel':return [a('p_surrender','认输收手，继续把话说清')];
 case 'setback':return [a('p_support','请苏晚把真正的打算告诉他'),a('p_withdraw','退出争执，请高小楼留下照应',null,0,'leave')];
 case 'decision':return [a('p_private','私下留住催缴凭据，请沈砚陪她去查清'),a('p_expose','当众指出催缴的蹊跷，承担青竹会的记恨'),a('p_end','把纸还给沈砚，尊重她暂缓婚约的决定')];
 default:return [];
 }
}
function settle(sim,e,q,a,r,next='confidence',reward=false){
 const s=sim.s;
 if(reward){
  const stat=q.duelStarted?'might':q.facts.theftAttempt?'agility':'charm';
  r.changes.push(...earnGrowth(s.player,stat,30,`proposal:${e.id}:reward`));
  s.facts.proposalReward=true;
 }
 s.people.shen.mood='calm';s.people.shen.fear=0;
 e.status='resolved';q.phase='finished';
 s.pending={id:++s.sequence,type:next,depth:e.depth+1,due:s.day+1,cause:e.id,causeAction:a.id,allowed:[next]};
 r.nextId=s.pending.id;r.ongoing=false;r.hint='这次相助与催缴的疑问，都留在了人物记事里。';
}
export function resolveProposal(sim,id,actionId){
 const e=sim.event;if(!isProposal(e)||e.id!==id)return {error:'这一刻已经过去。'};
 const q=proposalState(e),a=proposalActions(sim).find(x=>x.id===actionId);
 if(!a||q.attempts.includes(actionId))return {error:'眼前的局面已经改变。'};
 if(sim.s.player.hp<=0||['shen','su'].some(id=>sim.s.people[id].hp<=0))return {error:'有人已经倒地，先处理眼前的伤势。'};
 const check=sim.preview(a);if(check.blocked)return {error:'盘缠不足。'};
 const before=Object.fromEntries(['shen','su','gao'].map(id=>[id,{relation:sim.s.people[id].relation,memories:sim.s.people[id].memories.slice(-4)}]));
 const roll=a.stat?1+Math.floor(sim.rng()*100):null,success=roll===null||roll<=check.chance,grade=checkGrade(roll,check.chance);
 const s=sim.s,p=s.player,f=q.facts,changes=[];
 q.attempts.push(a.id);q.idle=0;p.money-=a.cost;if(a.cost)changes.push(`盘缠 −${a.cost}`);
 if(a.stat){const xp=grade==='大成功'?18:grade==='大失败'?3:success?12:6;p.xp+=xp;changes.push(`阅历 +${xp}`,...earnGrowth(p,a.stat,xp,`proposal:${e.id}:${a.id}`));}
 let text='',speaker='su',phase=q.phase;
 const to=(next,line,id='su')=>{phase=next;text=line;speaker=id;};
 switch(a.id){
 case 'p_listen':f.route='social';f.wish=true;to('talk','戒指是赊来的，外堂今晚就要收钱。我是说过攒够了……可现在退了，谁替我补这个窟窿？','shen');break;
 case 'p_watch':f.route='theft';f.theftAttempt=true;if(success){if(!p.inventory.includes('ring'))p.inventory.push('ring');s.facts.missing=true;changes.push('获得：银戒');to('stolen','银戒滑进袖口。他们仍在争辩，没人注意到戒盒空了。','player');}else{sim.relation('shen',-10);s.wanted++;changes.push('沈砚 −10','嫌疑 +1');to('caught_ring','你把手拿出来！这位姑娘要走，与你偷我戒指是两回事。','shen');}break;
 case 'p_interpose':f.route='combat';to(success?'challenge':'setback',success?'有本事冲我来，别拿苏晚说事！你想动手，就按江湖规矩点到为止。':'你没架开他的胳膊。高小楼挤进来隔住两人，苏晚趁空隙背起琴囊。',success?'shen':'gao');break;
 case 'p_keep_ring':to('finished','你带着银戒离开。身后传来沈砚寻找戒指的声音，但没人看见你的手。','player');break;
 case 'p_give_ring':p.inventory=p.inventory.filter(i=>i!=='ring');s.facts.missing=false;sim.relation('shen',-6);changes.push('交回：银戒','沈砚 −6');to('finished','戒指我收回。偷了又还，不等于没偷过。你走，这事我记着。','shen');break;
 case 'p_drop_ring':if(success){p.inventory=p.inventory.filter(i=>i!=='ring');s.facts.missing=false;changes.push('放回：银戒');to('finished','银戒回到盒边。你抽身离开，没有人叫住你。','player');}else{p.inventory=p.inventory.filter(i=>i!=='ring');s.facts.missing=false;s.wanted++;changes.push('银戒被追回','嫌疑 +1');to('caught_ring','我看见了！你从袖子里拿出来的是什么？','shen');}break;
 case 'p_ring_apology':to(success?'finished':'caught_ring',success?'钱留下，当作耽误的工钱。别再让我看见你伸手。':'六文就想了结？陆捕头，把这人带去问话。','shen');break;
 case 'p_ring_submit':s.wanted++;sim.relation('guard',-5);changes.push('嫌疑 +1','陆捕头 −5');to('finished','你被记下姓名与偷窃经过，候捕头传唤。沈砚收起戒盒，苏晚已经离开。','gao');break;
 case 'p_ring_flee':if(!success){p.hp=Math.max(1,p.hp-10);s.wanted++;changes.push('气血 −10','嫌疑 +1');}to('finished',success?'你挣脱手腕逃出人群。沈砚记住了你的脸，事后还会追问。':'高小楼拦住继续动手的沈砚，捕头记下你的嫌疑。这场偷窃已经传开。','gao');break;
 case 'p_offer':f.wish=true;to('ready','看客我来招呼。沈砚，你也别总把那张纸藏着了。','gao');f.cover=true;break;
 case 'p_divert':f.cover=success;to(success?'ready':'caught',success?'诸位来桥边听段旧事，给他们腾些地方。':'沈砚盯得紧，别急着伸手。有什么话先说。','gao');break;
 case 'p_persuade':case 'p_probe':case 'p_ask':case 'p_openly':case 'p_insist':case 'p_reason':
  if(success){f.route='social';to('decision','外堂催我今天交银，否则差事就没了。我是想过成亲后……借她唱曲的钱周转。','shen');f.known=true;}
  else to(['p_insist','p_reason'].includes(a.id)?'setback':'resistance','我有我的难处，不是几句漂亮话就能解决的。','shen');break;
 case 'p_take':case 'p_take_ready':
  f.theftAttempt=true;
  if(success){f.note=true;f.route='theft';to('evidence','你取到了纸条。沈砚还在向人群解释，暂时没有发现。','gao');}
  else {sim.relation('shen',-3);changes.push('沈砚 −3');if(grade==='大失败'){s.wanted++;changes.push('嫌疑 +1');}to('caught','别动！你伸手取的是什么？','shen');}
  break;
 case 'p_explain':to(success?'decision':'setback',success?'既然你看见了……是外堂的催缴银，我不敢告诉她。':'先松手。你们谁都不该替我决定，我自己来说。',success?'shen':'su');f.known=success;break;
 case 'p_escape':to('setback',success?'我退开了。苏姑娘，请你自己问他那张纸吧。':'沈砚挡住你的退路。高小楼劝双方松手，苏晚终于站了出来。','gao');if(!success){p.hp=Math.max(1,p.hp-8);changes.push('气血 −8');}break;
 case 'p_yield':case 'p_stepback':case 'p_backdown':to('setback','你先退到一旁。这是我的去留，沈砚，我要自己和你说清楚。');break;
 case 'p_read':f.known=true;to('decision','催缴条上写着今日交银，还盖着外堂印记。你问起这笔银子，沈砚低下了头。','gao');break;
 case 'p_return_note':f.note=false;f.known=true;to(success?'decision':'setback',success?'纸还我吧。我会告诉她全部缘由。':'纸你看过了，却不知道我的难处。苏姑娘，你来说吧。','shen');break;
 case 'p_challenge':f.route='combat';to('challenge','点到为止，输了也不许拿苏姑娘当赌注。','gao');break;
 case 'p_duel':
  if(p.hp<=25||s.people.shen.hp<=50){to('setback','身上还有伤，就别逞强。这件事还是得让苏姑娘自己说。','gao');break;}
  f.route='combat';q.duelStarted=true;q.duelElapsed=0;s.people.shen.mood='angry';
  to('duel','点到为止。谁先撑不住，就收刀听人把话说完。','shen');break;
 case 'p_surrender':s.people.shen.mood='calm';to('setback','收手吧。你肯停下来，我也不再逼你。','shen');break;
 case 'p_support':f.known=true;to('decision','我不答应仓促成亲。沈砚，把催缴条拿出来，我们先说清这笔钱。');break;
 case 'p_withdraw':to('finished','高小楼留下陪两人谈，你退出了争执。');break;
 case 'p_private':case 'p_expose':case 'p_end':to('finished',a.id==='p_end'?'婚事先缓缓。我要走自己的路，等我们都想清楚再谈。':a.id==='p_expose'?'众人记住了外堂催缴的事。沈砚愿意带你去找行商核对凭据，青竹会也将留意你。':'沈砚请你收好催缴条，约好带你去见行商核账。苏晚终于能自己决定去留。');break;
 }
 q.phase=phase;q.lastText=text;q.lastCheck=roll==null?'':`${grade} · ${roll} / ${check.chance}`;
 const r={day:s.day,eventId:e.id,type:'proposal',actionId:a.id,label:a.label,kind:a.kind,motion:a.id==='p_take_ready'&&growth(p,'theft').level?'crouch':a.kind==='steal'?'reach':a.kind==='combat'?'guard':'talk',check,roll,success,grade,text,changes,dialogue:[{id:speaker,text,narration:speaker==='player'}],reactionSource:'local',authored:true,ongoing:phase!=='finished',hint:phase==='duel'?'收起菜单，按 / 拔刀、左键出招。也可以按 E 认输。':'现场还在继续 · 按 E 接着回应，也可走开。'};
 if(phase==='finished'){
  const reward=['p_private','p_expose','p_end'].includes(a.id);
  if(reward){sim.relation('su',6);changes.push('苏晚 +6');s.facts.proposalOutcome=a.id;s.facts.couple=false;}
  if(['p_private','p_expose'].includes(a.id)){
   s.facts.extortionLead=true;if(!p.inventory.includes('催缴条抄件'))p.inventory.push('催缴条抄件');
   changes.push('线索：青竹会催缴条 · 后续故人相托检定难度 −12');
  }
  if(a.id==='p_expose'){s.wanted++;s.reputation=Math.max(-100,s.reputation-3);changes.push('嫌疑 +1','青竹会声望 −3');}
  settle(sim,e,q,a,r,a.id==='p_keep_ring'?'inquiry':['p_ring_submit','p_ring_flee','p_give_ring','p_ring_apology'].includes(a.id)?'dispute':['p_private','p_expose'].includes(a.id)?'favor':'confidence',reward);
 }
 s.history.push(r);
 // A private look at the paper is player knowledge, not a public accusation.
 if(!['p_watch','p_take','p_take_ready','p_keep_ring','p_drop_ring'].includes(a.id)||!success)for(const id of ['shen','su','gao']){s.people[id].memories.push(text);s.people[id].memories=s.people[id].memories.slice(-12);}
 sim.prepareReaction(r,['shen','su','gao'],before);
 sim.emit('result',r);if(!r.ongoing)sim.emit('scene',null);sim.save();return r;
}
export function finishProposalDuel(sim,won){
 const e=sim.event;if(!isProposal(e)||proposalState(e).phase!=='duel')return;
 const q=proposalState(e);q.phase=won?'decision':'setback';q.facts.known=won;q.idle=0;
 sim.s.people.shen.mood='calm';sim.s.people.shen.fear=0;
 const changes=earnGrowth(sim.s.player,'might',won?18:8,`proposal:${e.id}:duel`);
 const text=won?'沈砚收刀退开，递出催缴条：“是外堂催银，我不该把她的去留当解法。”':'高小楼叫停切磋。苏晚走到两人之间：“该我自己说了。”';
 q.lastText=text;sim.emit('speech',[{id:won?'shen':'su',text}]);
 const r={day:sim.s.day,eventId:e.id,type:'proposal',actionId:'p_duel_result',label:won?'切磋胜出':'切磋收手',kind:'combat',motion:'bow',roll:null,check:{chance:100},success:won,grade:'实际战斗',text,changes,dialogue:[{id:won?'shen':'su',text:won?'是外堂催银，我不该把她的去留当解法。':'该我自己说了。你们先把刀收起来。'}],authored:true,ongoing:true,hint:'按 E 继续把话说清楚。'};
 sim.s.history.push(r);sim.emit('result',r);sim.save();
}
