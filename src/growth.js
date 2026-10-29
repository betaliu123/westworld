export const PATHS={
 social:{name:'交涉',stats:['charm','wit'],steps:['开口试探','察言观色','以理破局'],effect:'风仪、机敏检定 +4 / +8；倾听、说服、识谎都能历练。'},
 theft:{name:'偷窃',stats:['agility'],steps:['冒险伸手','敛息取物','妙手藏锋'],effect:'身法检定 +4 / +8；第一阶学会伏低取物，求婚场景可降低取物难度。'},
 combat:{name:'战斗',stats:['might'],steps:['初试锋芒','稳住架势','临阵制敌'],effect:'膂力检定 +4 / +8；实际出招伤害 +3 / +6。'}
};
export const THRESHOLDS=[0,30,90];
export const pathFor=stat=>Object.keys(PATHS).find(id=>PATHS[id].stats.includes(stat));
export function growth(player,id){
 const xp=player.growth?.[id]?.xp||0,level=xp>=90?2:xp>=30?1:0;
 return {xp,level,name:PATHS[id].steps[level],next:THRESHOLDS[level+1]??null};
}
export function growthBonus(player,stat){const id=pathFor(stat);return id?growth(player,id).level*4:0;}
export function combatDamage(player){return 22+growth(player,'combat').level*3;}
// Rewards are keyed to a concrete attempt, so retries/reloads cannot farm growth.
export function earnGrowth(player,stat,amount,key){
 const id=pathFor(stat);if(!id)return [];
 player.growth??={};player.growthClaims??={};
 if(player.growthClaims[key])return [];
 player.growthClaims[key]=true;
 const before=growth(player,id).level;
 player.growth[id]??={xp:0};player.growth[id].xp+=amount;
 const after=growth(player,id);
 return [`${PATHS[id].name}历练 +${amount}`,...(after.level>before?[`掌握：${after.name}`]:[])];
}
export function checkGrade(roll,chance){
 if(roll==null)return '直接行动';
 return roll<=chance?(roll<=Math.max(1,Math.floor(chance*.2))?'大成功':'成功'):(roll>=96?'大失败':'失败');
}
