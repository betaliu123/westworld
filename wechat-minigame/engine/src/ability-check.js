import {skill,PRACTICE_CAP} from './skills.js';

export const ABILITY_BALANCE_VERSION=1;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
// Only the final threshold is rounded: preview and D100 resolution share it.
export function abilityCheck(player,{stat='agility',skillId='theft',difficulty=0,modifiers=[],reason='',certain=false}={}){
 const score=Number.isFinite(player.stats?.[stat])?player.stats[stat]:50;
 const trained=skill(player,skillId),tier=clamp(trained.tier||0,0,4),attributeBonus=(score-50)/2,skillBonus=(tier-1)*12;
 const practiceBonus=clamp(trained.xp||0,0,PRACTICE_CAP)/PRACTICE_CAP*4;
 const contextBonus=modifiers.reduce((sum,m)=>sum+m.value,0);
 const chance=reason?null:certain?100:clamp(Math.round(50+attributeBonus+skillBonus+practiceBonus-difficulty+contextBonus),5,95);
 return {score,stat,skillId,tier,attributeBonus,skillBonus,practiceBonus,difficulty,modifiers,contextBonus,chance,reason,blocked:!!reason,certain:!reason&&certain};
}
export function resolveAbilityCheck(check,rng){
 if(check.blocked)return {check,error:check.reason,roll:null,success:false};
 const roll=check.certain?null:1+Math.floor(rng()*100);
 return {check,roll,success:check.chance>0&&(roll===null||roll<=check.chance)};
}
// These are observed bodily states, independent of whether an act is witnessed.
export function attentionModifiers(n,{listening=false,now}={}){
 if(!n)return [];
 if(['warn','fight','investigate','search'].includes(n.awareness?.state))return [{label:'对方警觉',value:-20}];
 if(n.life?.activity==='sleep')return [{label:'对方熟睡',value:15}];
 if(n.life?.activity==='doze')return [{label:'对方打盹',value:10}];
 if(now!==undefined&&(n.eatingUntil>now||n.drinkingUntil>now))return [{label:'对方正吃喝',value:15}];
 return listening?[{label:'对方正听曲',value:15}]:[];
}
