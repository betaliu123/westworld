import {learnSkill,practice} from './skills.js';
import {placePayment} from './cash-transfers.js';
import {visibleBetween} from './npc-awareness.js';
export const desk={x:-11,z:7.5};
export const wares={boxing:{name:'短打图谱',price:9,tip:'沉肩贴肘，出手不过中线。读过后，在实战中试出这记短打。'},score:{name:'临溪小调',price:6,tip:'起句留一息，尾音莫催。记住曲调后，下次卖艺可以奏给人听。'},flute:{name:'紫竹笛',price:12,tip:'竹节细密，长音不易散。装备后能稳住卖艺的起调。'}};
export function stockBooks(eco){if(eco.s.bookstock)return;for(const [i,[sku,w]]of Object.entries(wares).entries())eco.create(w.name,sku==='flute'?'instrument':'book','ground',{sku,forSale:true,owner:'bookseller',material:sku==='flute'?'wood':'paper',x:desk.x+(i-1)*.9,z:desk.z,y:1.05});eco.s.bookstock=true;}
export function bookAction(eco,kind,item){
 const sim=eco.sim,p=sim.s.player,w=wares[item?.sku];if(!w||item.hp<=0)return '这件物品已不在。';
 const ground=item.location==='ground',reachable=ground&&eco.range(item.x,item.z,2.8)&&visibleBetween(p,item,(eco.obstacles||[]).filter(o=>o.id!=='book-desk'),eco.s.objects);
 if(!reachable&&item.location!=='player')return '靠近物品才能操作。';
 if(kind==='study'&&item.type==='book'){p.lessons??={};const first=!p.lessons[item.sku];p.lessons[item.sku]=true;if(p.skills&&first){const id=item.sku==='boxing'?'combat':'music';learnSkill(p,id,item.sku==='boxing'?2:1,item.name);practice(p,id,5,'book:'+item.sku);}eco.log(w.tip+(first?'（已记下）':'（重温）'));return;}
 if(kind==='equipFlute'&&item.type==='instrument'&&item.location==='player'){p.flute=p.flute===item.id?null:item.id;eco.log(p.flute?'你将紫竹笛系在腰间。':'你把紫竹笛收回行囊。');return;}
 if(!reachable||!item.forSale)return '这件商品已不在案上。';
 if(kind==='bookBuy'){const n=sim.s.people.bookseller,q=eco.positions.bookseller;if(!q||n.hp<=0||n.inCustody||n.stunnedUntil>(sim.s.npcClock||0)||Math.hypot(q.x-item.x,q.z-item.z)>5)return '温掌柜不在案边，等她回来再结账。';
 if(!placePayment(sim,eco,{payer:'player',payee:'bookseller',amount:w.price,x:desk.x+1.35,z:desk.z,y:1.05,stand:{x:desk.x+1.65,z:desk.z+.75},reason:item.name}))return '盘缠不够。';
 }else if(kind==='bookSteal'){if(!p.stealing||!p.crouched)return '得先伏低身子。';if(p.energy<3)return '体力不足。';p.energy-=3;const c=eco.check('偷取'+item.name);sim.emit('worldIncident',{type:'theft',owner:'bookseller',target:item.id,x:p.x,z:p.z,covert:c.success});if(!c.success){eco.log('手碰到了案角，没拿到'+item.name+'。');return;}}
 else return '不能这样操作。';
 eco.transfer(item,'player',kind==='bookBuy'?'bought':'stolen');item.forSale=false;delete item.y;eco.log((kind==='bookBuy'?'买下':'取走')+item.name+'。');
}
