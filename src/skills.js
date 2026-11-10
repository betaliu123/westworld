// Experience is practice, not a substitute for instruction. One source for UI and rules.
export const TIERS=['不会','粗通','入门','熟练','精通'];
export const SKILLS={
 pressure:{name:'点穴',teacher:'杜老捕',abilities:['尚未学会','背后定身五息','正面点穴十息','定身三十息、封哑穴','隔空点穴']},
 theft:{name:'妙手',teacher:'燕七、梅掌舵',abilities:['尚未学会','蹲身取外露物','解开系紧的钱袋','袖中取物','暗送物件']},
 insight:{name:'眼力',teacher:'瘸张、杜老捕',abilities:['尚未学会','观察衣着伤痕','辨认行囊与腰牌','辨谎识人','看破乔装']},
 music:{name:'乐器',teacher:'苏晚',abilities:['尚未学会','持谱练习','街头卖艺','以曲留客','宴席献艺']},
 disguise:{name:'妆扮',teacher:'刻字人、宋青禾',abilities:['尚未学会','换衣遮面','修饰年貌','模仿举止','以假乱真']},
 medicine:{name:'医毒',teacher:'阿青',abilities:['尚未学会','辨常见草药','饮食前辨毒','配解药','辨延迟发作的毒']},
 combat:{name:'武艺',teacher:'周伍长、林青舟、段赤川',abilities:['无章法','持刀连击','出刀扎实','刀法伤害提升','制敌缴械']}
};
export function skill(p,id){return p.skills?.[id]||{tier:0,xp:0};}
export function initSkills(p){p.skills??=Object.fromEntries(Object.keys(SKILLS).map(id=>[id,{tier:['pressure','theft','insight','combat'].includes(id)?1:0,xp:0}]));return p.skills;}
export const PRACTICE_CAP=30;
export function practice(p,id,amount,key){if(!p.skills)return [];p.skillClaims??={};if(p.skillClaims[key])return [];p.skillClaims[key]=true;const s=initSkills(p)[id],earned=Math.max(0,Math.min(amount,PRACTICE_CAP-s.xp));s.xp+=earned;return earned?[`${SKILLS[id].name}心得 +${earned}`]:[];}
export function learnSkill(p,id,tier,source){const s=initSkills(p)[id];if(s.tier>=tier)return [];s.tier=tier;s.xp=0;s.teacher=source;return [`${SKILLS[id].name} · ${TIERS[tier]}`,SKILLS[id].abilities[tier]];}
export function skillBookHTML(p,esc){if(!p.skills)return '';return `<section class="skill-book"><h3>技艺谱</h3>${Object.entries(SKILLS).map(([id,d])=>{const s=skill(p,id);return `<article><h4>${esc(d.name)} · ${TIERS[s.tier]}</h4><p>${esc(d.abilities[s.tier])}</p><small>心得 ${s.xp}/${PRACTICE_CAP} · ${esc(s.teacher||d.teacher)}</small></article>`;}).join('')}</section>`;}
export function weaponDamage(p,armor=0){const base={fists:8,ruler:12,dagger:14,sword:18,staff:20,spear:20}[p.weaponType||'sword']||18;return Math.max(1,Math.round(base*[.6,.8,1,1.25,1.5][skill(p,'combat').tier]+((p.stats?.might??50)-50)/5-armor));}
// [training, weapon, armor, strength]. NPCs use the same damage rule as the hero.
export const COMBAT_PROFILES={gate_guard:[3,'spear',8,60],gate_relief:[2,'sword',4,55],guard:[3,'ruler',4,60],old_constable:[3,'fists',0,45],chi:[3,'dagger',4,60],qing:[3,'staff',0,55],shen:[2,'sword',0,50],mei:[2,'dagger',0,45],gang_boss:[4,'sword',4,65],thief:[1,'dagger',0,40],traveler:[2,'sword',0,50]};
export function initCombatants(s){if(s.chapterVersion!==2)return;for(const [id,n]of Object.entries(s.people)){const [tier,weaponType,,might]=COMBAT_PROFILES[id]||[0,'fists',0,40];n.skills??={combat:{tier,xp:0}};n.weaponType??=weaponType;n.stats??={might};if(n.maxHp==null){n.maxHp=tier?100:60;n.hp=Math.min(n.hp,n.maxHp);}}}
export function wornArmor(s,id='player'){const items=s.ecosystem?.items||[],p=s.player;const item=id==='player'?(p.disguise==='borrowed'&&items.find(i=>i.id===p.wornOutfit&&i.location==='player')):items.find(i=>i.type==='clothing'&&i.ownerId===id&&i.location==='npc:'+id);return item?.hp>0?(item.armor??COMBAT_PROFILES[item.ownerId]?.[2]??0):0;}
export function npcHitDamage(s,id){return s.chapterVersion===2?weaponDamage(s.people[id],wornArmor(s)):['guard','gate_guard'].includes(id)?9:4;}
