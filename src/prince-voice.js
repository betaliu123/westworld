// Public voice never reveals the private faction before the authored reveal.
export const PRINCE_LIFE_LINES={hungry:'光顾着听人说话，倒忘了用饭。茶娘，还有热饼么？',meal:'趁热吃吧，凉了便少些滋味。',rest:'且借这片树荫，歇歇脚。',sick:'这茶……不对。劳烦替我换一碗清水。',water:'岸上的朋友，搭把手！'};
export function princeGreeting(s){const n=s.people.traveler;n.princeConversations=(n.princeConversations||0)+1;
 if(n.sickUntil>(s.ecosystem?.time||0))return '失礼了，身上有些不适。容我缓一缓。';
 if(s.facts.princeDeparture?.arrived)return n.princeConversations>1?'又见面了。坐，今日可有新消息？':'茶凉了，人总算来了。坐吧。';
 if(n.princeConversations>1)return s.facts.princeAlias?'是你。今日路上，又见了什么有趣的事？':'又碰面了。上回的话，我还记着。';
 return '方才有个挑柴的，被拦着翻了三遍担子；那顶轿子却径直进去了。你常走这道关口么？';
}
export function princeSocial(kind,success,tries=0,severe=false){
 if(kind==='apology')return severe?'伤了人，总得给人一个交代。先把兵刃收了，随他们去说明白。':success?'赔偿的事便照这个数办。下回有话，好好说。':'东西还毁着，光说几句好话，恐怕不够。';
 if(!success)return tries?'你的意思，我听明白了。今日便说到这里吧。':'有些事，初见便问到底，反倒没了趣味。';
 return kind==='gift'?'难得有人只请我一碗茶。多谢。':'平日听惯了报喜的话，你这几句倒新鲜。来，再坐一会儿。';
}
