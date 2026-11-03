const cast={
 bookseller:['artist',14,'旧纸配新线，这本书大概拆过。'],traveler:['courtly',12,'等了这么久，那人怎么还不见影子。'],inspector:['law',-16,'口供与副账，得分开核对。'],gate_guard:['law',-22,'接班的人不到，这关口就离不得。'],gate_relief:['law',-15,'轮到我休息前，还要查几张路引。'],guard:['law',-12,'街上人多，别让嫌犯混过去。'],old_constable:['law',8,'这人的脚步倒有几分底子。'],
 gang_boss:['blade',-6,'堂前的动静，还是亲眼看着才放心。'],chi:['blade',-10,'下一趟镖不能再耽搁。'],qing:['blade',5,'桥头这条路，得留给过路人。'],shen:['blade',4,'那件事还得当面说清。'],mei:['courtly',12,'台下这么些人，谁肯听我把话说完。'],
 tea_host:['trade',4,'下一桌该添茶了。'],gate_merchant:['trade',-7,'路引得收在贴身的地方。'],merchant:['trade',-3,'今天收的钱还没点清。'],scribe:['trade',2,'这道印边该换把细刀。'],inn:['trade',5,'晚些还得和脚夫核账。'],tea:['trade',15,'壶底剩的茶怕是不够了。'],relay:['trade',1,'那件差衣的袖口还没缝牢。'],
 thief:['wary',-12,'旁人看的是热闹，我得看退路。'],prisoner:['wary',-20,'那本账的去处，能同谁说？'],su:['artist',30,'刚才那一拍，若慢半息就好了。'],elder:['artist',22,'这一段拿去醒木底下讲，正合适。'],gao:['artist',18,'听上一曲，才不负这半壶酒。'],matchmaker:['trade',12,'姑娘的意思，我得先听准了。'],porter:['wary',6,'卸完这肩货，就找地方歇脚。']};
const voices={
 courtly:['刀出鞘容易，收场可难。','这便是阁下的待客之道？','袖中之物，也要劳你代管么？','看够了么？要不要我转一圈？','地上的风景，比茶桌上的好？'],
 law:['收刀。手放在我看得见的地方。','当街行凶！站住！','把手摊开，东西放回去。','盯我作甚？有话当面问。','走路便走路，蹲在这里等谁？'],
 blade:['来试刀的？先报个名。','好，就接你这一招！','敢动这东西？手留下再说。','想量我的底细，上前来。','绕到背后做什么？'],
 trade:['慢着，刀尖离摊子远些。','别砍了！我往后退，你把刀收了！','我看得清楚，那不是你的。','盯着我瞧，倒不像来做买卖的。','落了什么？可别摸错了东西。'],
 wary:['别往我这边来。','让开，让我过去！','手真快，可惜我看见了。','眼神收一收，你也有人盯着。','你找东西，还是找人？'],
 artist:['好好的调子，叫刀声截断了。','这一刀，可不是唱戏！','曲还没散，东西怎么先走了？','看人可比听曲难吧？','这是什么步法，悄没声的。']};
export const persona=id=>cast[id]||['wary',0,'眼前的事，先看清再说。'];
const suspicion={bookseller:'你若看的是簪子，它不卖。若是指尖这点红，那是朱砂。',traveler:'这双眼睛的工夫，倒比阁下寒暄的工夫好。',tea_host:'盯着我半天，是茶里浮了根梗，还是你有话问？',gate_merchant:'看我袖口做什么？路引可不卖。',gate_guard:'眼睛倒利。关口查的是你的凭据。',gate_relief:'我脸上写了换班时辰不成？',guard:'衙门辨人先看鞋底。你倒先看起我来了。',inspector:'要查我？先说你奉谁的差。',old_constable:'眼先动，肩也跟着动。下回留心。',gang_boss:'看明白了？堂上这把椅子可没人借你坐。',chi:'瞧我手上的茧？走两趟镖你也有。',su:'你看我的手，是想学指法？',elder:'这么打量人，倒是个听悬案的好听众。',scribe:'学认印，先看印面，别看我的脸。',prisoner:'你也是来套我话的？',thief:'咱俩谁盯谁，可还说不准。'};
const actions=['draw','assault','theft','probe','skulk'];
export function response(s,id,kind){const n=s.people[id],warm=(n.relation>=8||n.trust>=8)&&!n.impressions?.assault,cold=n.relation<=-8,line=(kind==='probe'&&suspicion[id])||voices[persona(id)[0]][actions.indexOf(kind)];
 if(kind==='assault'&&id==='gate_merchant')return warm?'慢着！咱们一路过来的，你怎么朝我下刀？':cold?'又冲我来！这回休想碰我的货！':'住手！你要钱就说，别动刀！';
 if(id==='bookseller')return (warm?{draw:'先收刀，替我压住这卷书。',skulk:'找针么？小心扎手。'}:{draw:'刀尖往外，纸比刀口难补。',skulk:'书在案上，蹲着可看不到。'})[kind]||({assault:'冲我来的，就离书架远些。',theft:'袖口露出来的线，是我打的结。',probe:line}[kind]);
 if(id==='traveler'&&warm)return {draw:'你曾肯停步照看我。今日这把刀，又是为谁拔的？',assault:'那日递水的是你，今日递刀的也是你。是我看错了。',theft:'你若开口，我未必不借。何苦伸这只手？',probe:'想知道什么？看在旧交上，不妨直问。',skulk:'若是不方便见人，我给你留个背风的座。'}[kind];
 return warm?({draw:'先收一收，我知道你不是冲我来的。',probe:'你我相识，有话何必猜。',skulk:'找什么呢？要我搭把手么？'}[kind]||'原来是你……'+line):cold?'又是你。'+line:line;}
export function markEncounter(s,id,kind){const n=s.people[id],key=kind+':'+s.day;n.impressions??={};if(n.impressions[kind]===key)return;n.impressions[kind]=key;
 const loss={draw:1,skulk:n.relation>=8?0:1,probe:2,theft:5,assault:10}[kind]||0;n.trust=Math.max(-100,(n.trust||0)-loss);}
export function thought(s,id){const n=s.people[id];if(n.awareness?.caseOpen)return '先看住他的手，别再出事。';if(n.sickUntil>s.ecosystem?.time)return '胃里一阵紧过一阵，先找个地方坐下。';if(n.impressions?.assault)return '那回他出手的样子，我还记得。';if(n.receivedCare)return '上回病中那碗水，是他递来的。';return persona(id)[2];}
