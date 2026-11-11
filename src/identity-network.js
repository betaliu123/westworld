// Directed knowledge: recognition is an NPC fact, never player omniscience.
// DS candidates reviewed in docs/plans/2026-11-11-identity-ds-*.json. The local
// catalog corrects speaker reversals and removes claims about unverified stock.
export const IDENTITY_RELATIONS={
 'traveler:inspector':{
  question:'阁下的面貌顾某认得，只是今日的言行有些生疏。容我核问一句。',
  greeting:'原来是王爷，下官方才失礼。您奉皇兄手诏查临溪税案，想先听案情，还是先谈用度？',royal:true,
  offers:['advance','stores','ledger','manifest'],
 },
 'traveler:fu':{
  question:'这张面容……容小的问一句，您今日怎会亲自过问纲运？',
  greeting:'王爷恕罪！符祥在京中见过您。您是官家的亲弟弟，小的哪敢怠慢；这趟花石纲的事，请您吩咐。',royal:true,
  offers:['advance','manifest','destination'],
 },
 'inspector:fu':{
  question:'顾大人？平日核账的问法可不是这样，今日有什么公干？',
  greeting:'顾大人亲来查验，小的不敢推托。这趟花石纲，经手的名册和钱物，都可当面核问。',
  offers:['manifest','advance','ledger'],
 },
 'fu:inspector':{
  question:'符管事，你的面貌我熟，今日言谈却有些不同。先把来意说清。',
  greeting:'符管事。应奉局押纲，顾某查案，各有职责。你若来问账，便把话说在明处。',
  offers:['ledger','overreach','manifest'],
 },
 'inspector:traveler':{
  question:'顾大人，今日为何这副神色？临溪的案子可有变故？',
  greeting:'顾大人，称我闲舟便是。皇兄交下来的税案，你我分头查；若缺盘缠，我身上还有一些。',royal:true,
  offers:['advance','ledger','tax','manifest'],
 },
 'fu:traveler':{
  question:'符管事，今日不催纲了？你的举止与从前有些不同。',
  greeting:'符祥，你在京中见过我，不必装作不识。你押的花石纲，正是我奉皇兄手诏要查的事。',royal:true,
  offers:['handover','advance','tax','manifest'],
 },
 'inspector:guard':{
  question:'顾大人，今日的衣着举止与值房里不同，容属下确认。',
  greeting:'顾大人。值房的物资我不敢擅动，您要用时，请亲自去堂内箱中取。',offers:['stores','tax'],
 },
 'gate_guard:gate_relief':{
  question:'韩校尉，您今日的吩咐听着有些不同，末将再确认一句。',
  greeting:'韩校尉，末将在岗。有公事请直说，离岗须等人实际来接。',offers:['advance','tax'],
 },
 'gate_merchant:tea_host':{
  question:'赵掌柜？今日的言行和往常不太一样，先让我认清。',
  greeting:'赵掌柜，路上又耽搁了？有话直说，茶棚的本钱可得留够。',offers:['advance'],
 },
 'gate_merchant:merchant':{
  question:'赵兄？往日谈买卖不是这般口气，今日怎么了？',
  greeting:'赵掌柜，同行路远，总有周转不开的时候。你要借盘缠，咱们当面记清。',offers:['advance'],
 },
 'fu:tea_host':{
  question:'符管事？今日怎么这副神色，先把话说清。',
  greeting:'符管事，茶棚的钱还要买米买炭。别再拿应奉局的名头来挤我们。',offers:['overreach'],
 },
};
export const identityRelationship=(face,observer)=>IDENTITY_RELATIONS[face+':'+observer];
