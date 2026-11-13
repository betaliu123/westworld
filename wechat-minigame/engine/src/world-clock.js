export function clockText(s){
 const minutes=(360+Math.floor((s.time||0)*6+1e-8))%1440,h=Math.floor(minutes/60);
 const phase=h<5?'深夜':h<8?'清晨':h<12?'上午':h<14?'正午':h<17?'午后':h<19?'黄昏':'夜间';
 return phase+' '+String(h).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}
const ZHI='子丑寅卯辰巳午未申酉戌亥',KE=['','一','二','三','四','五','六','七'];
// 子时始于亥末：二十三点起算，每个时辰八刻。
export function shichenText(s){
 const minutes=(360+Math.floor((s.time||0)*6+1e-8))%1440,into=(minutes+60)%1440,ke=Math.floor(into%120/15);
 return ZHI[Math.floor(into/120)]+'时'+(ke?KE[ke]+'刻':'');
}
export function untilTime(s,value){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return null;
 const [h,m]=value.split(':').map(Number),target=((h*60+m+1080)%1440)/6;
 return (target-s.time+240)%240||240;
}
