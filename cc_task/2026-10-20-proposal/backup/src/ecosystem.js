import {MATERIALS,objectDistance,damageAmount} from './materials.js';
import {PEOPLE} from './data.js';
export class Ecosystem{
 constructor(sim,assets=[]){this.sim=sim;const s=sim.s;s.ecosystem??={time:0,seq:0,items:[],objects:{},hunger:{},rewards:{}};this.s=s.ecosystem;this.positions={};this.s.followups??=[];this.s.stockDay??=sim.s.day;for(const n of Object.values(sim.s.people))n.purse??=20;
  this.registerAssets(assets);for(const i of this.s.items){i.material??=i.type==='ring'?'metal':i.type==='poison'?'stone':'food';i.hp??=30;i.max??=30;}
  if(!this.s.initialized){this.create('干粮','food','player');this.create('干粮','food','player');this.create('迷毒散','poison','player');this.create('迷毒散','poison','player');this.s.initialized=true;}
 }
 registerAssets(assets){this.activeObjects=new Set(assets.map(a=>a.id));for(const a of assets){const max=a.max??(a.kind==='tree'?100:80);let o=this.s.objects[a.id];if(!o){o=this.s.objects[a.id]={id:a.id,kind:a.kind,name:a.name,fruit:a.fruit,x:a.x,z:a.z,owner:a.owner,hp:max,max,drops:0};if(a.kind==='stall')for(let i=0;i<5;i++)this.create('包子','food','object:'+a.id);if(this.sim.s.broken.includes(a.id))o.hp=0;}Object.assign(o,{x:a.x,z:a.z,name:a.name,material:a.material||'wood',w:a.w||0,d:a.d||0,y:a.y??1});o.burning??=0;o.wetUntil??=0;}}
 objectRange(o,r=3.5){return this.sim.s.player.hp>0&&objectDistance(o,this.sim.s.player)<=r;}
 element(id,type){const o=this.s.objects[id],p=this.sim.s.player;if(!o||!this.objectRange(o))return '请先走近选中的物件。';if(o.hp<=0)return '物件已经损毁。';if(p.energy<6)return '至少需要六点体力。';
 if(type==='water'){p.energy-=6;o.burning=0;o.wetUntil=this.s.time+18;this.log(`你向${o.name}泼水，火势熄灭；物件暂时湿润。`);return;}
 if(type!=='fire')return '不支持的元素。';p.energy-=6;const damp=o.wetUntil>this.s.time;this.damage(id,'fire',18,false);if(o.hp>0&&MATERIALS[o.material].burns&&!damp)o.burning=1;
 this.log(damp?`${o.name}尚且湿润，火星很快熄灭。`:o.burning?`${o.name}被点燃，火焰持续侵蚀${MATERIALS[o.material].name}。`:`火焰掠过${o.name}，${MATERIALS[o.material].name}不易燃烧。`);}
 create(name,type,location,extra={}){const item={id:'item-'+(++this.s.seq),name,type,location,poisoned:false,material:type==='ring'?'metal':type==='poison'?'stone':'food',hp:30,max:30,...extra};this.s.items.push(item);return item;}
 items(location){return this.s.items.filter(i=>i.location===location);}
 syncRing(){const ring=this.s.items.find(i=>i.type==='ring');if(!ring&&this.sim.s.player.inventory.includes('ring'))this.create('银戒','ring','player');else if(ring?.location==='player'&&!this.sim.s.player.inventory.includes('ring')){ring.location='npc:shen';ring.discovered=true;}}
 transfer(item,location){item.location=location;if(item.type==='ring'){this.sim.s.player.inventory=this.sim.s.player.inventory.filter(i=>i!=='ring');if(location==='player')this.sim.s.player.inventory.push('ring');}}
 log(text,dialogue=[],ai=false){for(const d of dialogue){const n=this.sim.s.people[d.id];if(n){n.memories.push(text);n.memories=n.memories.slice(-12);}}this.sim.emit('sandbox',{text,dialogue,ai});this.sim.save();}
 chance(){return Math.max(5,Math.min(95,this.sim.s.player.stats.agility+10));}
 check(){const roll=1+Math.floor(this.sim.rng()*100),chance=this.chance();return {roll,chance,success:roll<=chance};}
 range(x,z,r=3.5){const p=this.sim.s.player;return Math.hypot(x-p.x,z-p.z)<=r&&p.hp>0;}
 act(kind,id,itemId,witnesses=[]){
 const p=this.sim.s.player,o=this.s.objects[id],item=this.s.items.find(i=>i.id===itemId);
 if(p.hp<=0)return '倒地时无法行动。';if(kind==='fire'||kind==='water'){if(itemId){if(!item||p.energy<6)return '体力不足或物品已不在。';const q=item.location==='ground'?item:item.location.startsWith('object:')?this.s.objects[item.location.slice(7)]:null;if(!q||!this.objectRange(q))return '物品已不在附近。';p.energy-=6;if(kind==='water'){item.wetUntil=this.s.time+18;this.log(item.name+'被水浸湿。');}else this.damageItem(itemId,'fire');return;}return this.element(id,kind);}
 if(kind==='eat'){if(!item||item.location!=='player'||item.type!=='food')return '没有这份食物。';item.location='consumed';p.energy=Math.min(100,p.energy+18);if(item.poisoned)p.hp=Math.max(0,p.hp-25);this.log(`你吃下${item.name}，体力恢复${item.poisoned?'，随后腹痛，气血 −25':'。'}`);return;}
 if(kind==='drop'){if(!item||item.location!=='player')return '物品不在行囊中。';this.transfer(item,'ground');item.x=p.x+.8;item.z=p.z;this.log(`你放下了${item.name}。`);return;}
 if(kind==='pickup'){if(!item||item.location!=='ground'||!this.range(item.x,item.z))return '物品已不在附近。';this.transfer(item,'player');this.log(`拾起：${item.name}${item.poisoned?'（有毒）':''}。`);return;}
 if(kind==='plant'){
  const n=this.sim.s.people[id];if(!n||n.hp<=0||!this.positions[id]||!this.range(this.positions[id].x,this.positions[id].z)||!item||item.location!=='player')return '无法放入。';
  const c=this.check();p.energy=Math.max(0,p.energy-3);
  if(c.success){this.transfer(item,'npc:'+id);item.discoverAt=this.s.time+12;item.discovered=false;this.log(`身法检定 ${c.roll} ≤ ${c.chance}：你将${item.name}悄悄放入${PEOPLE.find(n=>n.id===id).name}的行囊，对方尚未发现。`);}
  else{this.sim.relation(id,-5);this.log(`身法检定 ${c.roll} > ${c.chance}：放入物品时被察觉，物品仍在你手中。`,[{id,text:'你在动我的行囊？有事当面说！'}],true);}return;
 }
 if(kind==='help'){const n=this.sim.s.people[id],q=this.positions[id];if(!n||!q||!this.range(q.x,q.z)||!(n.sickUntil>this.s.time))return '对方现在不需要照看。';if(p.energy<6)return '需要六点体力。';p.energy-=6;n.sickUntil=0;n.hp=Math.min(100,n.hp+15);this.sim.relation(id,4);this.log(`你递水照看${PEOPLE.find(n=>n.id===id).name}：对方气血 +15，好感 +4。`,[{id,text:'多谢你照看，我缓过来了。'}],true);return;}
 if(kind==='coat'){const toxin=this.items('player').find(i=>i.type==='poison');if(!item||item.location!=='player'||item.type!=='food'||item.poisoned||!toxin)return '需要一份未下毒的食物和迷毒散。';toxin.location='consumed';item.poisoned=true;this.log(`你消耗一份迷毒散，${item.name}变为有毒食物。`);return;}
 if(!o||!this.objectRange(o))return '请先走近物品。';
 if(o.hp<=0)return '已经损毁，无法使用。';if(o.closedUntil>this.s.time&&kind==='buy')return '食摊正在检查吃食，暂停营业。';
 if(kind==='shake'){if(o.kind!=='tree')return '不是树木。';if(p.energy<4)return '体力不足。';p.energy-=4;if(o.fruit&&o.drops<3){this.dropFruit(o);this.log('你摇晃树干，一枚果子掉在脚边。');}else this.log('枝叶沙沙作响，没有更多成熟果实落下。');return;}
 if(kind==='buy'||kind==='steal'){
  if(!item||item.location!=='object:'+id||item.type!=='food')return '这份食物已经不在摊上。';if(kind==='buy'&&p.money<4)return '需要四文钱。';
  const c=kind==='steal'?this.check():null;if(c&&!c.success){this.sim.relation(o.owner,-4);this.log(`身法检定 ${c.roll} > ${c.chance}：手伸向食物时被察觉。`,[{id:o.owner,text:'买东西请付钱，别动歪心思。'}],true);return;}
  if(kind==='buy'){p.money-=4;this.sim.s.people[o.owner].purse+=4;}item.location='player';this.log(`${kind==='buy'?'花费 4 文买下':`身法检定 ${c.roll} ≤ ${c.chance}，悄悄拿走`}：${item.name}。`);return;
 }
 if(kind==='poison'){
  const toxin=this.items('player').find(i=>i.type==='poison');if(!toxin||!item||item.location!=='object:'+id||item.type!=='food'||item.poisoned)return '需要迷毒散及摊上一份未下毒的食物。';
  const c=this.check();p.energy=Math.max(0,p.energy-3);if(c.success){toxin.location='consumed';item.poisoned=true;this.log(`身法检定 ${c.roll} ≤ ${c.chance}：迷毒散混入${item.name}，食物仍在摊上。`);}else{this.sim.relation(o.owner,-8);this.sim.s.wanted=Math.min(9,this.sim.s.wanted+1);this.log(`身法检定 ${c.roll} > ${c.chance}：投毒被制止，药粉未消耗。`,[{id:o.owner,text:'你往吃食里放什么！我得请捕头来看看。'}],true);}return;
 }
 }
 dropFruit(o){o.drops++;this.create('野果','food','ground',{x:o.x+.9,z:o.z+.4*o.drops});}
 damageItem(id,type='physical'){const i=this.s.items.find(i=>i.id===id);if(!i||!['ground'].includes(i.location)&&!i.location.startsWith('object:'))return false;const o=i.location==='ground'?i:this.s.objects[i.location.slice(7)];if(!o||!this.objectRange(o))return false;i.hp=Math.max(0,i.hp-damageAmount(i.material,type,20)*(type==='fire'&&i.wetUntil>this.s.time?.15:1));if(i.hp===0){i.location='destroyed';this.log(`${i.name}被${type==='fire'?'烧毁':'打坏'}，已经不能拾取或食用。`);}else this.log(`${i.name}耐久 ${Math.ceil(i.hp)}/${i.max}。`);if(o.owner){this.sim.relation(o.owner,-2);this.sim.s.wanted=Math.min(9,this.sim.s.wanted+1);}return true;}
 damage(id,type='physical',power=20,ongoing=false){const o=this.s.objects[id];if(!o||o.hp<=0||(!ongoing&&!this.objectRange(o,3.5)))return false;const amount=damageAmount(o.material,type,power)*(type==='fire'&&o.wetUntil>this.s.time?.15:1);o.hp=Math.max(0,o.hp-amount);if(!ongoing)o.shakeAt=this.s.time;
 if(o.fruit&&o.drops<3&&!ongoing)this.dropFruit(o);
 if(o.hp===0){o.burning=0;for(const item of this.items('object:'+id)){item.location='ground';item.x=o.x+(this.sim.rng()-.5)*1.5;item.z=o.z+1;}if(o.kind==='table'&&!this.sim.s.broken.includes(id))this.sim.breakProp(id);this.log(`${o.name}完全损毁${o.kind==='stall'?'，吃食散落，停止营业':o.kind==='tree'?'，树干倒下':'，碎片散落，留下缺口'}。`,o.owner?[{id:o.owner,text:'这里被毁了！得找人修补！'}]:[],!!o.owner);}
 else if(!ongoing)this.log(`${o.name}受到${type==='fire'?'火焰':'劈砍'}伤害 −${Math.round(amount*10)/10}，耐久 ${Math.ceil(o.hp)}/${o.max}。`);
 if(o.owner&&!ongoing){this.sim.relation(o.owner,-3);this.sim.s.wanted=Math.min(9,this.sim.s.wanted+1);}return true;
 }
 startShow(x,z,owner=this.sim.s.party?.active){if(this.show)return '已有同伴在表演，先让他收笛。';const p=this.sim.s.party?.members[owner]||this.sim.s.player;if(p.hp<=0||p.energy<15)return '至少需要 15 点体力才能卖艺。';this.show={owner,x,z,elapsed:0,beat:0,audience:[],paid:new Set()};this.log((owner==='companion'?'阿笙':'少侠')+'取出竹笛，原地奏曲招徕听众。');}
 stopShow(){if(!this.show)return;const name=this.show.owner==='companion'?'阿笙':'少侠';this.show=null;this.log(name+'收起竹笛，围观的人渐渐散去。');}
 tick(dt,positions){for(const o of Object.values(this.s.objects)){if(o.burning&&o.hp>0&&this.activeObjects.has(o.id)){if(o.wetUntil>this.s.time)o.burning=0;else this.damage(o.id,'fire',4*dt,true);}}this.positions=positions;this.syncRing();this.s.time+=dt;if(this.s.stockDay<this.sim.s.day){this.s.stockDay=this.sim.s.day;for(const o of Object.values(this.s.objects)){if(o.kind==='stall'&&o.hp>0){const count=this.items('object:'+o.id).length;for(let i=count;i<5;i++)this.create('包子','food','object:'+o.id);}}for(const n of Object.values(this.sim.s.people))n.purse=Math.min(40,n.purse+8);this.log('新的一天，仍在营业的食摊补上了吃食。');}for(const f of this.s.followups.filter(f=>!f.done&&f.due<=this.s.time)){f.done=true;const o=this.s.objects[f.stall];if(o){o.closedUntil=this.s.time+30;this.log('食客的不适传到摊主耳中，食摊暂停售卖，开始检查同批吃食。',[{id:o.owner,text:'先别卖了！把这批吃食留下，我得查清楚。'}],true);}}const p=this.sim.s.player;
  if(this.show){const show=this.show,p=this.sim.s.party?.members[show.owner]||this.sim.s.player;show.elapsed+=dt;p.energy=Math.max(0,p.energy-dt*5);if(p.hp<=0||p.energy<1||Math.hypot(p.x-show.x,p.z-show.z)>1){this.stopShow();}else{
   show.audience=Object.entries(positions).filter(([id,q])=>!this.reserved?.has(id)&&this.sim.s.people[id].hp>0&&!['angry','afraid'].includes(this.sim.s.people[id].mood)&&!(['shen','su'].includes(id)&&this.sim.event)&&Math.hypot(q.x-show.x,q.z-show.z)<12).map(([id])=>id).slice(0,4);
   if(show.elapsed>=show.beat+8){show.beat+=8;const near=show.audience.filter(id=>Math.hypot(positions[id].x-show.x,positions[id].z-show.z)<4);
    for(const id of near){const key=this.sim.s.day+':'+id;if(!show.paid.has(id)&&!this.s.rewards[key]){show.paid.add(id);this.s.rewards[key]=true;const c=1+Math.floor(this.sim.rng()*100),success=c<=p.stats.charm+25;
     if(success){p.money+=4;p.stats.charm=Math.min(90,p.stats.charm+1);this.log(`${PEOPLE.find(n=>n.id===id).name}听完笛曲后打赏：盘缠 +4，风仪 +1。`,[{id,text:'这支曲子有些意思，赏你几文！'}],true);}else this.log(`${PEOPLE.find(n=>n.id===id).name}听完这一段笛曲，没有打赏。`,[{id,text:'气息还不稳，再练练吧。'}],true);}
    }
   }
  }}
  for(const [id,q]of Object.entries(positions)){
   const n=this.sim.s.people[id];if(n.hp<=0||this.reserved?.has(id))continue;this.s.hunger[id]=Math.min(100,(this.s.hunger[id]??(id==='elder'?78:50))+dt*.35);
   for(const item of this.items('npc:'+id)){if(!item.discovered&&this.s.time>=item.discoverAt){item.discovered=true;if(item.type==='ring'&&id==='shen'){this.sim.s.facts.missing=false;this.sim.s.searchClosed=false;if(['inquiry','ring_quarrel'].includes(this.sim.event?.type)){this.sim.s.event.status='resolved';this.sim.emit('scene',null);}this.sim.s.pending={id:++this.sim.s.sequence,type:'truce',depth:(this.sim.s.event?.depth||0)+1,due:this.sim.s.day+1,allowed:['truce']};}this.log(`${PEOPLE.find(n=>n.id===id).name}整理行囊，发现了${item.name}。`,[{id,text:'咦，行囊里怎么多了这件东西？'}],true);}}
   const food=this.items('npc:'+id).find(i=>i.type==='food'&&i.discovered);
   if(food&&this.s.hunger[id]>=65){food.location='consumed';this.s.hunger[id]=5;n.eatingUntil=this.s.time+3;if(food.poisoned){if(food.vendor)this.s.followups.push({stall:food.vendor,due:this.s.time+10});n.hp=Math.max(1,n.hp-25);n.sickUntil=this.s.time+25;n.memories.push('吃过食物后腹痛，不知道是谁做了手脚。');this.log(`${PEOPLE.find(n=>n.id===id).name}吃下${food.name}后不适，气血 −25，停下来求助。`,[{id,text:'这吃食……我的肚子好疼，谁能帮我找郎中？'}],true);}else this.log(`${PEOPLE.find(n=>n.id===id).name}吃下${food.name}，饥饿消退。`,[{id,text:'肚子正饿，先吃点东西。'}]);}
   const target=this.foodTarget(id);if(target&&Math.hypot(q.x-target.x,q.z-target.z)<2.7){const f=this.items('object:'+target.id).find(i=>i.type==='food');if(f){if(n.purse<4)continue;n.purse-=4;this.sim.s.people[target.owner].purse+=4;f.location='npc:'+id;f.vendor=target.id;f.discovered=true;this.log(`${PEOPLE.find(n=>n.id===id).name}从食摊买了一份${f.name}。`);}}
  }
 }
 foodTarget(id){if(this.reserved?.has(id))return null;if((this.s.hunger[id]||0)<65||this.items('npc:'+id).some(i=>i.type==='food')||this.show?.audience.includes(id)||(['shen','su','gao'].includes(id)&&this.sim.event))return null;return Object.values(this.s.objects).find(o=>o.kind==='stall'&&o.hp>0&&!(o.closedUntil>this.s.time)&&this.items('object:'+o.id).some(i=>i.type==='food'))||null;}
}
