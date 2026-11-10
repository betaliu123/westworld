// These are game dialogue, not a second transcript. Editing here changes the cache key.
export const VOICE_LINES = {
 princeGreeting:'方才有个挑柴的，被拦着翻了三遍担子；那顶轿子却径直进去了。你常走这道关口么？',
 princeEntered:'城门查得这样紧……你是怎么进来的？',
 teaGreeting:'茶刚沏好。客官要坐下歇歇，还是带几个热饼走？',
 teaCare:'多谢……这一回我记着。',
 guardTheft:'站住。把手里的东西放下。你当我没瞧见？',
 scribeGreeting:'刻字还是修印？东西拿来看看。',
 merchantGreeting:'货都在这儿，想买什么？',
 booksellerGreeting:'手若是干的，书就翻得。想看哪一种？',
 princeCare:'劳你照看，缓过些来了。这份情，我记下了。',
 princeTheft:'袖中之物，也要劳你代管么？'
};
export const VOICE_TRIAL = [
 ['traveler','princeGreeting'],['traveler','princeEntered'],
 ['tea_host','teaGreeting'],['tea_host','teaCare'],
 ['gate_guard','guardTheft'],['scribe','scribeGreeting'],
 ['gate_merchant','merchantGreeting'],['bookseller','booksellerGreeting'],
 ['traveler','princeCare'],['traveler','princeTheft']
].map(([actor,key])=>({actor,text:VOICE_LINES[key]}));
