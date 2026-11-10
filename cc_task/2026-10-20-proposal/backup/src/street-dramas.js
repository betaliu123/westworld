import {PEOPLE} from './data.js';
const name=id=>id==='player'?'你':PEOPLE.find(n=>n.id===id)?.name||id;
const action=(id,label,stat,difficulty,motion,success,failure,stages)=>({id,label,stat,difficulty,motion,success,failure,stages,delta:0,cost:0,next:null});
export const DRAMAS={
 ribbon:{name:'南街 · 抛绣球',point:[0,8],cast:['mei','qing','chi','matchmaker'],duration:90,mode:'ribbon',intro:'花婶在南街系起红绸，梅知意捧着绣球。林青舟和段赤川都来候场，接球的人只获得相识的机会。',lines:[['matchmaker','先站稳，谁接住了，也得听姑娘自己的意思。'],['mei','我愿意认识谁，由我自己决定。']],options:[action('catch_ball','跃起接绣球','agility',52,'reach','你稳稳接住绣球，梅知意请你留下说几句话。','绣球擦过指尖，仍在人群上方。',['争球']),action('yield_ball','让球给林青舟',null,0,'offer','你让开一步，林青舟接住绣球。','绣球还没有落下。',['争球']),action('introduce','与梅知意聊聊','charm',48,'talk','梅知意愿意与你慢慢相识，约好改日再聊。','梅知意婉拒了邀约，请你尊重她的选择。',['相识']),action('decline_match','拱手谢绝招亲',null,0,'bow','你交还绣球，梅知意感谢你坦诚相告。','你还没有接到绣球。',['相识'])]},
 duel:{name:'北街 · 比武招亲',point:[0,-4],cast:['mei','qing','chi','matchmaker'],duration:100,mode:'duel',intro:'北街划出了擂台。林青舟与段赤川报名切磋，花婶声明点到为止，胜者仍须征得梅知意同意。',lines:[['matchmaker','报名还来得及，拳脚点到为止！'],['mei','武艺是一回事，待人如何是另一回事。']],options:[action('enroll','报名下一轮',null,0,'bow','你报上姓名，准备挑战首轮胜者。','报名已经结束。',['报名','首轮']),action('duel_attack','进身出招','might',50,'force','你压住对手的招式，赢下一分。','对手拆开你的攻势，反抢一分。',['决胜']),action('duel_dodge','闪身反击','agility',50,'sword','你避开来拳，趁势赢下一分。','对手封住退路，抢先得分。',['决胜']),action('duel_feint','虚招试探','wit',48,'observe','你看破对手的重心，巧取一分。','对手识破虚招，逼你退了一步。',['决胜']),action('stop_duel','劝双方停手','charm',50,'talk','双方收拳，花婶宣布今日到此为止。','双方仍想分出高下。',['首轮','决胜'])]},
 theft:{name:'集市 · 钱袋失窃',point:[0,12],cast:['thief','merchant','guard'],duration:110,mode:'chase',intro:'许行商在集市清点货物，燕七绕着他的行囊打转。陆捕头正在街口巡查。',lines:[['merchant','这一趟货款，可得仔细收好。'],['thief','借过，借过……']],options:[action('warn_merchant','提醒行商看住钱袋','wit',45,'listen','许行商收紧钱袋，燕七无从下手，悻悻离去。','你的提醒被喧闹声盖过。',['踩点']),action('intercept_thief','拦住燕七','agility',50,'guard','你截住燕七，陆捕头追回钱袋。','燕七闪过你的阻拦，继续逃跑。',['追逐']),action('tackle_thief','扑上去擒拿','might',52,'force','你按住燕七，许行商认回失物。','燕七挣脱，逃进另一条巷子。',['追逐']),action('cover_thief','替燕七挡住追兵','charm',54,'talk','你引开追兵，燕七携钱袋逃走；许行商记住了你的阻挠。','陆捕头识破你的说辞，继续追赶。',['追逐'])]}
};
export function dramaOptions(e,t){return t.options.filter(a=>a.stages.includes(e.stage)&&(!['introduce','decline_match'].includes(a.id)||e.winner==='player')&&(!a.id.startsWith('duel_')||e.enrolled));}
export function dramaPoint(e,t){return e.type==='theft'&&e.stage==='追逐'&&e.location?[e.location.x,e.location.z]:t.point;}
export function dramaReply(e,a,success){
 const replies={catch_ball:['mei','接得稳。先留下聊聊吧。','别急，绣球还没落定。'],yield_ball:['qing','承你的让步，我先接住了。','还没到我手里。'],introduce:['mei','改日有空，我们再聊。','多谢你坦诚，不过我想先告辞。'],decline_match:['mei','谢谢你直说，愿你一路顺风。','先把话说清吧。'],enroll:['matchmaker','记下了，下一轮叫你上场。','报名已经结束了。'],stop_duel:['matchmaker','双方收拳！今日到此为止。','双方还想继续，先别挤进来。'],warn_merchant:['merchant','多亏你提醒，这钱袋我收紧了。','你方才说什么？这里太吵了。'],intercept_thief:['guard','拦得好，钱袋先交回失主。','他往巷子里去了，跟上！'],tackle_thief:['guard','人和赃物都在，带回去问清楚。','别急，我从另一边堵他。'],cover_thief:['thief','这份掩护，我记住了。','捕头没信你的话，我得快走。']};
 if(a.id.startsWith('duel_'))return {id:e.champion||'qing',text:success?'这一招漂亮，我接着！':'这一分我拿下了，再来！'};
 const line=replies[a.id];return {id:line?.[0]||e.cast[0],text:line?.[success?1:2]||(success?a.success:a.failure)};
}
function phase(d,stage,lines){const e=d.active;e.stage=stage;e.stageAt=e.elapsed;d.emit(lines.map(([,s])=>s).join(' '),lines);}
function finish(d,outcome,completed=true){const e=d.active;e.outcome=outcome;if(completed)d.s.completed[e.type]=true;else d.s.retryAt[e.type]=d.s.time+120;d.s.outcomes.push({type:e.type,day:d.sim.s.day,winner:e.winner||null,outcome});d.s.outcomes=d.s.outcomes.slice(-30);d.emit(outcome);d.end(null);}
function recover(d){const e=d.active;if(!e.stolen||e.recovered)return;const thief=d.sim.s.people.thief,merchant=d.sim.s.people.merchant;const amount=Math.min(e.stolen,thief.purse||0);thief.purse=(thief.purse||0)-amount;merchant.purse=(merchant.purse||0)+amount;e.recovered=true;}
export function dramaAction(d,a,success){
 const e=d.active;if(!success){if(a.id==='introduce')finish(d,a.failure);return;}
 if(a.id==='catch_ball'||a.id==='yield_ball'){e.winner=a.id==='catch_ball'?'player':'qing';phase(d,'相识',[['mei',name(e.winner)+'接住了。先聊聊，再谈往后。']]);}
 if(a.id==='introduce'||a.id==='decline_match')finish(d,a.success);
 if(a.id==='enroll'){e.enrolled=true;e.playerScore=0;e.opponentScore=0;}
 if(a.id.startsWith('duel_'))e.playerScore=(e.playerScore||0)+1;
 if(a.id==='stop_duel')finish(d,'切磋提前停止，双方收拳，梅知意表示愿先与大家做朋友。');
 if(a.id==='warn_merchant')finish(d,'钱袋没有失窃。许行商记住了你的提醒，燕七离开集市。');
 if(['intercept_thief','tackle_thief'].includes(a.id)){recover(d);finish(d,'燕七被拦下，钱袋物归原主。陆捕头带他去问话。');}
 if(a.id==='cover_thief')finish(d,'燕七带着钱袋逃脱；行商与捕头记住了你替他掩护，嫌疑增加。');
}
export function tickDrama(d,dt,positions){
 const e=d.active,t=d.template;e.stage??=e.type==='ribbon'?'候场':e.type==='duel'?'报名':'踩点';e.stageAt??=0;
 if(e.type==='theft'&&positions.thief)e.location={...positions.thief};
 const elapsed=e.elapsed-e.stageAt;
 if(e.stageAt===0&&e.elapsed>40&&!e.arrived){finish(d,'演员未能聚齐，这场动静暂且取消。',false);return;}
 if(e.type==='ribbon'){
  if(e.stage==='候场'&&e.elapsed>=18&&e.arrived)phase(d,'争球',[['mei','绣球来了，看好！'],['chi','让我来接！']]);
  else if(e.stage==='争球'&&elapsed>=16){e.winner=d.sim.rng()<.55?'qing':'chi';phase(d,'相识',[[e.winner,'接住了！'],['mei','先坐下聊聊。接球可不是替我决定婚事。']]);}
  else if(e.stage==='相识'&&elapsed>=18)finish(d,e.winner==='player'?'你没有继续邀约，梅知意与你道别，今日招亲收场。':name(e.winner)+'接住绣球，梅知意愿意先与他相识。花婶收起红绸，没有当场定下婚事。');
 }else if(e.type==='duel'){
  if(e.stage==='报名'&&e.elapsed>=18&&e.arrived)phase(d,'首轮',[['matchmaker','林青舟、段赤川，上场！']]);
  else if(e.stage==='首轮'){
   if(e.elapsed-(e.lastHit||0)>=3){e.lastHit=e.elapsed;for(const id of ['qing','chi']){const npc=d.sim.s.people[id];if(npc.hp>40)npc.hp=Math.max(40,npc.hp-3);}}
   if(elapsed>=18){e.champion=d.sim.rng()<.55?'qing':'chi';e.winner=e.champion;phase(d,e.enrolled?'决胜':'评议',[['matchmaker',name(e.champion)+'胜出。'+(e.enrolled?'请下一位上场。':'请梅姑娘说说她的意思。')]]);}
  }else if(e.stage==='决胜'){
   if(e.elapsed-(e.lastHit||0)>=4){e.lastHit=e.elapsed;const p=d.sim.s.player,q=positions[e.champion],close=q&&Math.hypot(p.x-q.x,p.z-q.z)<2.3,absent=Math.hypot(p.x-t.point[0],p.z-t.point[1])>6;if(absent||(close&&e.elapsed-(e.lastPlayerMove??e.stageAt)>6))e.opponentScore=(e.opponentScore||0)+1;if(close)p.hp=Math.max(1,p.hp-2);}
   if(elapsed>=20||e.attempts.filter(id=>id.startsWith('duel_')).length>=3){e.winner=e.playerScore>e.opponentScore?'player':e.champion;phase(d,'评议',[['matchmaker',name(e.winner)+'赢得切磋，双方收拳！'],['mei','武艺我看到了，往后可以先做朋友。']]);}
  }else if(e.stage==='评议'&&elapsed>=12)finish(d,name(e.winner)+'胜出，梅知意答应与胜者先相识。今日切磋点到为止，婚事尚未定下。');
 }else if(e.type==='theft'){
  if(e.stage==='踩点'&&e.elapsed>=18&&e.arrived){const merchant=d.sim.s.people.merchant,thief=d.sim.s.people.thief;e.stolen=Math.min(12,merchant.purse??20);merchant.purse=(merchant.purse??20)-e.stolen;thief.purse=(thief.purse??20)+e.stolen;e.waypoint=0;phase(d,'追逐',[['merchant','我的钱袋！抓住那个灰衣人！'],['guard','站住！街坊别挡路！']]);}
  else if(e.stage==='追逐'){
   const a=positions.thief,b=positions.guard;
   if(elapsed>6&&a&&b&&Math.hypot(a.x-b.x,a.z-b.z)<1.3){recover(d);finish(d,'陆捕头追上燕七，追回钱袋。许行商清点失物，街坊终于散去。');}
   else if(elapsed>=35)finish(d,'燕七钻出街巷，带着钱袋逃脱。许行商损失了'+e.stolen+'文，陆捕头记下了他的样貌。');
  }
 }
 if(d.active&&e.elapsed>=t.duration)finish(d,'这场动静迟迟未能继续，演员各自离开。');
}
export const ESCAPE_ROUTE=[[3,12],[3,5],[-3,5],[-3,14],[0,18]];
export function dramaTarget(e,t,id,positions){
 const index=e.cast.indexOf(id);if(index<0)return null;const [x,z]=t.point;
 if(e.type==='theft'){
  if(e.stage==='追逐'){
   if(id==='thief'){const p=positions.thief;let i=e.waypoint||0;if(p&&Math.hypot(p.x-ESCAPE_ROUTE[i][0],p.z-ESCAPE_ROUTE[i][1])<.7&&i<ESCAPE_ROUTE.length-1)e.waypoint=++i;return {point:ESCAPE_ROUTE[i],speed:3.1};}
   if(id==='guard'&&e.elapsed-e.stageAt>3&&positions.thief)return {point:[positions.thief.x,positions.thief.z],speed:3.45};
   return {point:[x+2,z+2],speed:1.8};
  }
  return {point:id==='thief'?[x-.9,z]:id==='merchant'?[x+.9,z]:[x+3,z+2],speed:2};
 }
 if(e.type==='duel'&&['首轮','决胜'].includes(e.stage)&&['qing','chi'].includes(id))return {point:[x+(id==='qing'?-1:1),z+(e.stage==='决胜'&&id!==e.champion?4.5:0)],speed:2.4};
 if(e.type==='ribbon'&&e.stage==='争球'&&['qing','chi'].includes(id))return {point:[x+(id==='qing'?-1:1),z+1.7],speed:3};
 return {point:id==='mei'?[x,z-2.6]:id==='matchmaker'?[x+3,z-1.8]:[x+(index===1?-2:2),z+1.5],speed:2};
}
