export const ATTR={might:'膂力',agility:'身法',charm:'风仪',wit:'机敏'};
export const ROLES={wanderer:{name:'江湖游侠',desc:'身法见长，敢走险路',stats:{might:48,agility:68,charm:40,wit:48},style:'rogue'},scholar:{name:'风流书生',desc:'善察人心，以言解围',stats:{might:32,agility:42,charm:72,wit:64},style:'social'},guardian:{name:'仗义刀客',desc:'膂力过人，护弱扶危',stats:{might:74,agility:46,charm:46,wit:38},style:'kind'}};
export const PEOPLE=[
 {id:'inspector',name:'顾钦差',title:'六扇门 · 奉旨查案',faction:'六扇门',color:0x723e3d,x:10,z:-23,relation:0},
 {id:'gang_boss',name:'梅掌舵',title:'赤砂帮 · 帮主',faction:'赤砂帮',color:0x57352e,x:23,z:-5,relation:0},
 {id:'quiet_guest',name:'灰衣旅人',title:'沉默的旅人',color:0x626966,x:-3,z:29,relation:0},
 {id:'bridge_guest',name:'桥边客',title:'倚栏候人的旅客',color:0x514d65,x:3,z:26,relation:0},
 {id:'gate_relief',name:'周伍长',title:'临溪守军 · 轮值伍长',faction:'临溪守军',color:0x4b5965,x:2,z:25,relation:0},
 {id:'tea_host',name:'宋茶娘',title:'城外茶棚掌柜',faction:'临溪街坊',color:0x92734e,x:-11.9,z:27,relation:0},
 {id:'traveler',name:'锦衣客',title:'在茶棚候人的旅客',color:0x657f89,x:-5,z:30,relation:0},
 {id:'old_constable',name:'杜老捕',title:'退役捕快',faction:'临溪县衙',color:0x5c6972,x:-8,z:30,relation:0},
 {id:'gate_guard',faction:'临溪守军',name:'韩校尉',title:'临溪关 · 20级披甲校尉',color:0x34434a,x:0,z:23,relation:-10},
 {id:'relay',faction:'临溪驿舍',name:'驿舍补衣人',title:'城外驿舍',color:0x887052,x:-7,z:24,relation:0},
 {id:'gate_merchant',faction:'东溪商帮',name:'赵行商',title:'等饼的行商',color:0x456e77,x:6,z:24,relation:0},
 {id:'scribe',faction:'临溪街坊',name:'刻字人',title:'修印改字',color:0x65605c,x:11,z:24,relation:0},
 {id:'prisoner',faction:'税课司',name:'旧账房',title:'被关押的抄账人',color:0x666459,x:20.5,z:-23,relation:0},
 {id:'mei',name:'梅知意',title:'绛云楼的梅家姑娘 · 招亲由她自己决定',color:0xb44e7b,x:22,z:8.9,relation:0},
 {id:'matchmaker',name:'花婶',title:'招亲主持',color:0x6e5486,x:25,z:9,relation:0},
 {id:'merchant',name:'许行商',title:'走街行商',color:0x4b8490,x:2,z:12,relation:0},
 {id:'thief',name:'燕七',title:'游手闲汉',color:0x535260,x:-3,z:14,relation:0},
 {id:'qing',name:'林青舟',title:'青竹会 · 护路弟子',color:0x3e7566,x:-4,z:7,faction:'青竹会',relation:0},
 {id:'chi',name:'段赤川',title:'赤砂帮 · 镖手',color:0x994939,x:3,z:7,faction:'赤砂帮',relation:0},
 {id:'shen',name:'沈砚',title:'青竹会 · 外堂弟子',color:0x48736b,x:-2,z:2,faction:'青竹会',relation:0},
 {id:'su',name:'苏晚',title:'行脚琴师',color:0xb65d56,x:0,z:2,relation:0},
 {id:'gao',name:'高小楼',title:'酒客 · 你的旧识',color:0xba9959,x:3,z:3,relation:18},
 {id:'guard',faction:'临溪县衙',name:'陆捕头',title:'临溪镇捕头',color:0x334955,x:10,z:5,relation:0},
 {id:'inn',name:'柳掌柜',title:'听雨楼掌柜',color:0x74618b,x:-10,z:-7,relation:5},
 {id:'tea',name:'阿青',title:'卖茶姑娘',color:0x678154,x:10,z:-8,relation:0},
 {id:'porter',name:'周大石',title:'脚夫',color:0x9b7858,x:-8,z:10,relation:0},
 {id:'elder',name:'陈先生',title:'说书人',color:0x9e9b83,x:7,z:12,relation:0}
];
export const SCENES={
 gate:{name:'临溪关 · 入城',place:'城外关口',point:[0,24],intro:'十二文，三星嫌疑，一个假名字。校尉横枪拦住去路。',lines:['韩校尉：路引呢？']},
 proposal:{name:'桥头 · 一枚银戒',place:'听雨桥头',point:[-1,2],intro:'苏晚明确拒绝今日定亲，沈砚却堵住桥口。敞开的戒盒与一句赊账，让这场求亲变了味。',lines:['沈砚：戒指都赊来了，你让我怎么收场？','苏晚：今天不定亲，把路让开。','高小楼：别起哄，让她自己说。']},
 banquet:{name:'听雨楼 · 喜宴',place:'听雨楼前',point:[-7,-6],intro:'红绸系上长桌，沈砚请来街坊。苏晚坐在人群中，像是有话想说。',lines:['沈砚：今日这杯喜酒，大家都要喝！','苏晚：你也来了……那日多谢你。','高小楼：这桌菜，可等了你半天。']},
 ring_quarrel:{name:'桥头 · 遗失的心意',place:'听雨桥头',point:[-1,2],intro:'找遍桥头仍不见银戒。苏晚问起他为何连戒指都保管不好，沈砚又急又委屈。',lines:['苏晚：怎么连戒指都会弄丢？你答应的事也这样吗？','沈砚：我找遍了，这不是我不在意！','高小楼：先缓口气，别把没说清的话变成伤人的话。']},
 inquiry:{name:'桥头 · 失物风波',place:'听雨桥头',point:[-1,2],intro:'戒指不见了。沈砚找来街坊问话，苏晚坚持先听证据。',lines:['沈砚：那枚戒指，怎么就不见了？','苏晚：没有证据，就别冤枉人。','高小楼：你那日也在，可看见什么？']},
 dispute:{name:'桥头 · 余波',place:'听雨桥头',point:[-1,2],intro:'那天的争执传遍半条街。沈砚仍在气头上，苏晚想听你解释。',lines:['沈砚：阁下那日的举动，总得有个说法。','苏晚：先把刀收起来，好好说。']},
 confidence:{name:'河畔 · 未尽之言',place:'河畔柳树下',point:[9,9],intro:'苏晚离开喧闹的人群，独自在柳树下等着。她看见你，轻轻松了口气。',lines:['苏晚：我想走自己的路。你能明白吗？','高小楼：我去买壶茶，你们慢慢说。']},
 favor:{name:'听雨楼 · 故人相托',place:'听雨楼前',point:[-7,-6],intro:'沈砚带来青竹会的信物，桌边还坐着一位行商。他似乎想托付你一件事。',lines:['沈砚：你帮过我，这份人情我记得。','高小楼：这次可有桩正经生意。']},
 truce:{name:'听雨楼 · 一席和解',place:'听雨楼前',point:[-7,-6],intro:'高小楼摆了一桌薄酒，请几位旧识重新坐下。',lines:['高小楼：江湖不大，总要再见。喝了这杯吧。','沈砚：且听你怎么说。']},
 ending:{name:'河畔 · 江湖回声',place:'河畔柳树下',point:[9,9],intro:'风波暂歇。你留下的物件、人情与名声，还会被镇上的人记起。',lines:['苏晚：那一天，我会记得。','高小楼：江湖路远，后会有期。']}
};
const action=(id,label,stat,difficulty,kind,tags=[],cost=0)=>({id,label,stat,difficulty,kind,tags,cost});
export const PROPOSAL=[
 action('steal','隔空取物，顺走银戒','agility',68,'steal',['rogue']),
 action('rival','也向苏晚表明心意','charm',72,'rival',['social']),
 action('cheer','在人群里鼓掌喝彩',null,0,'support',['kind']),
 action('listen','请众人安静，听她自己说','wit',48,'listen',['kind']),
 action('wine','请街坊喝一轮酒',null,0,'support',['social'],12),
 action('poem','即兴作一首定情诗','charm',60,'support',['social']),
 action('flower','跃上屋檐取一枝花','agility',48,'support',['rogue']),
 action('block','挡住步步逼近的看客','might',45,'listen',['kind']),
 action('joke','拿沈砚的紧张开个玩笑','wit',54,'support',['social']),
 action('snatch','直接抢下戒盒','might',65,'disrupt',['rogue']),
 action('promise','追问他是否尊重她的志向','wit',58,'listen',['kind']),
 action('bet','开个赌局，赌她是否答应','charm',62,'disrupt',['rogue']),
 action('bless','拱手祝两人各得所愿',null,0,'support',['kind']),
 action('music','吹一曲竹笛助兴','charm',52,'support',['social']),
 action('divert','弹石引开目光，再取戒指','agility',60,'steal',['rogue']),
 action('palm','借整理衣袖摸走银戒','agility',74,'steal',['rogue']),
 action('stand','搬来长凳，请他们坐下谈','might',40,'listen',['kind']),
 action('gift','送上二十文添作贺礼',null,0,'support',['kind'],20),
 action('dance','舞一段剑，讨个好彩头','agility',58,'support',['rogue']),
 action('witness','自荐做今日的见证人','charm',48,'support',['social']),
 action('hand','稳住沈砚发抖的手','agility',35,'support',['kind']),
 action('future','问苏晚想去什么地方','wit',38,'listen',['kind']),
 action('private','邀苏晚到一旁说话','charm',58,'rival',['social']),
 action('taunt','当众说他配不上她','charm',70,'disrupt',['rogue']),
 action('silence','以气势压住起哄者','might',52,'listen',['kind']),
 action('ribbon','给戒盒系一条同心结','agility',38,'support',['kind']),
 action('tea','端两杯茶，让气氛缓下来',null,0,'listen',['kind'],4),
 action('boast','吹嘘自己才是良配','charm',78,'rival',['social']),
 action('errand','替他去客栈订一桌酒','wit',40,'support',['kind'],10),
 action('truth','观察她欲言又止的神情','wit',35,'listen',['kind']),
 action('fake','谎称她早与你有婚约','wit',80,'disrupt',['rogue']),
 action('leave','不打扰，继续赶路',null,0,'leave',[])
];
export function actionsFor(scene,ring=false){
 if(scene==='proposal')return PROPOSAL;
 if(scene==='ending')return [action('farewell','拱手告辞，江湖再见',null,0,'leave')];
 const base=[action('talk','诚心劝解，把话说开','charm',52,'support',['social']),action('listen','听听苏晚真正的想法','wit',48,'listen',['kind']),action('disrupt','掀翻桌子，搅乱场面','might',60,'disrupt',['rogue']),action('leave','点头告辞，继续赶路',null,0,'leave')];
 if(scene==='banquet'||scene==='truce')base.unshift(action('eat','坐下大吃，恢复体力',null,0,'eat',['kind']),action('toast','举杯说一段祝词','charm',48,'support',['social']));
 if(scene==='favor')base.unshift(action('pledge','答应护送行商，争取信任','might',55,'favor',['kind']));
 if(scene==='confidence')base.unshift(action('respect','支持她自己选择去留','wit',45,'listen',['kind']));
 if(scene==='inquiry')base.unshift(action('investigate','查看痕迹，排除无辜者','wit',56,'support',['kind']),action('bluff','把嫌疑推给陌生过客','charm',72,'disrupt',['rogue']));
 if(ring)base.unshift(action('return','取出银戒，归还失主','charm',45,'return',['kind']));
 return base;
}
export const LETTERS={ring_quarrel:'戒指还是没找到。沈砚和苏晚在桥头拌起嘴来，说起了丢戒指这件事。你若路过，帮着劝两句吧。',banquet:'听雨楼前摆起长桌了，沈砚与苏晚请街坊喝喜酒。你有空也来坐坐？',inquiry:'求婚那枚银戒不见了，沈砚正在桥头问人。你那天也在，可曾看见什么？',dispute:'沈砚还惦记着桥头那件事。他在老地方，想找你把话说开。',confidence:'苏晚托我问问你有没有空。她在河畔柳树下，有些话不想当着人群说。',favor:'沈砚在听雨楼前等你，还带了一位行商。他说，那天的人情该还了。',truce:'我在听雨楼前凑了一桌薄酒。江湖不大，大家坐下解个疙瘩，可好？',ending:'今日又有人说起那场风波，提到了你。临溪镇不大，有些事倒记得挺久。'};
