import {ACTION_BEATS} from './action-contracts.js';
export const GROUPS={talk:{label:'交谈',icon:'言'},food:{label:'吃喝',icon:'盏'},kind:{label:'示好',icon:'礼'},show:{label:'助兴',icon:'曲'},trouble:{label:'冒险行事',icon:'险'},leave:{label:'告辞',icon:'行'}};
export function actionGroup(a){
 if(a.kind==='leave')return 'leave';
 if(a.kind==='eat'||['wine','tea','toast','gift-tea'].includes(a.id))return 'food';
 if(['steal','disrupt','intimidate'].includes(a.kind))return 'trouble';
 if(['music','dance','flower','cheer','poem'].includes(a.id))return 'show';
 if(['return','favor'].includes(a.kind)||['gift','bless','ribbon','hand','stand','errand','greet','apology'].includes(a.id))return 'kind';
 return 'talk';
}
export function groupActions(actions){return Object.entries(GROUPS).map(([id,g])=>({id,...g,actions:actions.filter(a=>actionGroup(a)===id)})).filter(g=>g.actions.length);}
export function motionFor(a){
 if(a.motion)return a.motion;
 if(a.kind==='combat')return 'guard';
 if(ACTION_BEATS[a.id])return ACTION_BEATS[a.id][0];
 if(a.kind==='eat')return 'eat';
 if(['tea','wine','toast','gift-tea'].includes(a.id))return 'drink';
 if(a.kind==='leave'||['greet','apology','bless'].includes(a.id))return 'bow';
 if(a.kind==='steal'||a.kind==='return')return 'reach';
 if(['disrupt','intimidate'].includes(a.kind))return 'force';
 if(a.id==='cheer')return 'clap';
 if(a.id==='dance')return 'sword';
 if(a.id==='music')return 'flute';
 if(a.id==='flower')return 'flourish';
 if(actionGroup(a)==='kind')return 'offer';
 return 'talk';
}
export function turnToward(current,target,dt){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));if(Math.abs(delta)<.008)return current;const step=delta*(1-Math.exp(-6*dt)),limit=2.8*dt;return current+Math.max(-limit,Math.min(limit,step));}
export function arriveStep(distance,speed,dt,stop=.12){return Math.min(speed*dt,Math.max(0,distance-stop));}

export function bubbleLayout(width,height,point){
 const scale=Math.min(1,(width-24)/660,(height-110)/340);
 return {scale,x:Math.max(330*scale+12,Math.min(width-330*scale-12,point.x)),y:Math.max(170*scale+55,Math.min(height-170*scale-45,point.y+170*scale))};
}
