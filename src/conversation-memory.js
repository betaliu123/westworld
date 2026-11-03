const local={
 matchmaker:['这截红绸是拦人的，别往里挤。','接住绣球，就算定亲了？','我花婶只管清场，不替知意定亲。绛云楼下接住球，换的是跟她坐下说句话。'],
 porter:['劳驾，让我把扁担换个肩。','这条街哪段路最难走？','石板路好走，店门口难走。卸货差一刻，工钱就少八文。'],
 elder:['醒木先搁这儿。你想听哪一折？','你怎么知道听客爱听哪一折？','我叫陈先生。头排嗑瓜子的手停了，那句就说对了。'],
 thief:['借过。你挡着我看街口了。','你等的是谁？','燕七没等人。我看的是哪条巷子还走得通。'],
 merchant:['慢些，我这绳结刚系好。','钱袋怎么打了两个结？','我姓许。头一结防钱掉，第二结防那只不姓许的手。'],
 qing:['靠路边说，别堵着后头的车。','青竹会为什么守这条路？','我们护路收的是过路钱。谁把路堵死了，明日大家都没饭吃。'],
 chi:['有话快说，镖车不等我。','这趟镖为什么赶得这么急？','镖旗上绣着赤砂二字，晚到一刻，砸的是我段赤川的招牌。'],
 shen:['你来得巧，我正想找个人拿主意。','你手里攥的是什么？','一只戒盒。镖刀我拿得稳，这个拿得倒有点抖。'],
 su:['听，尾音还没散。','为何要等尾音散尽才开口？','我走街弹琴，靠这个听人。肯等一息的，多半是真来听的。'],
 gao:['这儿有个空位，坐。','高兄还认得我？','哪回不是我替你留座？眼下没酒，旧交情可还在。'],
 inn:['先避开门槛，伙计正端汤。','柳掌柜的南窗为何留着？','听雨楼的规矩，客人订了位，我便留到约定的时辰。再好的价也不卖第二回。'],
 tea:['茶刚出壶，烫。','你挑茶客也看衣裳么？','阿青卖茶只看碗。脚夫讨水，我也给他一只干净的。']
};
export const opening=id=>local[id]?.[0];
export const askIdentity=id=>local[id]?.[1];
export const answerIdentity=id=>local[id]?.[2];
const once=new Set('identity watch tax tea_news binding apex seal ledger gang_intro gang_rules court_rules training_review prince_evidence prince_answer'.split(' '));
export function topicKey(s,id,a){if(a.id==='prince_leave')return 'leave:'+(!s.facts.princeDeparture?'invite':s.facts.princeDeparture.arrived?'arrived':'walking');if(a.id==='befriend')return 'befriend:'+Number(!!s.people[id].receivedCare);if(a.id==='prince_answer')return a.id+':'+Number(!!s.facts.enteredCity);return once.has(a.id)?a.id:null;}
export function fresh(s,id,a){const k=topicKey(s,id,a);if(!k)return true;if(s.people[id].heardTopics?.[k])return false;return !(k===a.id&&s.history.some(r=>r.success&&r.actionId===a.id&&r.dialogue?.[0]?.id===id));}
export function heard(s,id,k){if(k){s.people[id].heardTopics??={};s.people[id].heardTopics[k]=true;}}
