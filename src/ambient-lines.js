const chatter={
 gate_guard:['河栅那头也得走一趟。','到林边再折回来，别踩松土。'],
 gate_relief:['这段河岸，比关门口滑多了。','再绕过这片树，就能望见关楼了。'],
 tea_host:['壶嘴又积了茶垢，打烊得烫一烫。','这几只碗得分开摞，碗沿薄。'],
 gate_merchant:['绳结还紧着。这趟货可经不起雨。','上回那张货单，我夹在哪一层了？'],
 scribe:['这方石头有一道筋，得顺着下刀。','朱泥干了，添一滴油就成。'],
 bookseller:['这页虫眼倒巧，偏把个“不”字吃了。','天一潮，书口就不肯平。'],
 traveler:['茶烟往城里飘，风换向了。','坐在这里，倒比进城听得清楚。'],
 old_constable:['坐久了膝盖僵，待会得走两步。','这石阶，当年可没这么光。'],
 tea:['头一道水烫碗，别把茶香糟蹋了。','壶盖不严，拿块布垫垫。'],
 porter:['左肩歇够了，回头换它挑。','扁担吱呀响，该上油了。']
};
import {convoyWaitingForQinghe} from './qinghe-leads.js';
export function ambientLine(id,activity,index,s){
 if(id==='fu'&&s?.chapterVersion===2){
  const waiting=activity==='duty'&&convoyWaitingForQinghe(s)&&!s.facts.fuWaitingKnown&&!s.facts.qingheUnwillingKnown;
  if(!waiting)return null;
  const lines=['名册上这个宋青禾，约好的时候到了，怎么还没来？','叫她认着黄旗来会合，莫非寻错了地方？'];
  return lines[index%lines.length];
 }
 if(id==='qinghe'&&activity==='riverside'){
  const lines=s?.facts.qingheConsent?['等有了回信，我自己再拿主意。','娘有娘的怕，我也有我的打算。']:['认着黄旗，随车去汴京……他们只说得这样轻巧。','水绕过石头，就往前去了。','我想听听京里的曲子……可不是这样被催着走。','娘有娘的怕，我也有我的打算。'];
  return lines[index%lines.length];
 }
 if(['gate_guard','gate_relief'].includes(id)&&activity!=='patrol')return null;
 if(!['patrol','tea','idle','duty'].includes(activity))return null;const pool=chatter[id];return pool?.[index%pool.length];}
