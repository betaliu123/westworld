// These are game dialogue, not a second transcript. Editing here changes the cache key.
export const VOICE_LINES = {
 princeGreeting:'你也在等着进城？不急的话，坐下歇一会儿。关前人来人往，倒也看得出些门道。',
 princeEntered:'城门查得这样紧……你是怎么进来的？',
 teaGreeting:'茶刚沏好。客官要坐下歇歇，还是带几个热饼走？',
 teaCare:'多谢你肯搭把手，帮了我这一回。这份情，我记在心里了。',
 guardTheft:'站住。把手里的东西放下。你当我没瞧见？',
 scribeGreeting:'是要刻字，还是修印？先把东西拿来我看看，再说能不能做。',
 merchantGreeting:'货都在这儿，想买什么？',
 booksellerGreeting:'手上若没沾水，就翻翻看吧。想找哪一种书，你也可以先说说。',
 princeCare:'劳你照看，缓过些来了。这份情，我记下了。',
 princeTheft:'我袖里的东西，你倒伸手来拿。怎么，还要劳烦你替我保管么？',
 convoyStrength:'先看我搬这块石头，再说缺不缺人。',
 convoyStrengthReply:'搬的时候慢些，先站稳了，别光顾着逞力气。抬起来还得放得稳，别闪了腰。',
 convoyCharm:'周大哥，替我留个位置可好？我会记着你这份情。',
 convoyPayment:'六文茶钱，劳你给我留个位置。'
};
export const VOICE_TRIAL = [
 ['traveler','princeGreeting'],['traveler','princeEntered'],
 ['tea_host','teaGreeting'],['tea_host','teaCare'],
 ['gate_guard','guardTheft'],['scribe','scribeGreeting'],
 ['gate_merchant','merchantGreeting'],['bookseller','booksellerGreeting'],
 ['traveler','princeCare'],['traveler','princeTheft']
].map(([actor,key])=>({actor,text:VOICE_LINES[key]}));
