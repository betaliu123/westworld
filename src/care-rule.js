export const CARE_RULE=Object.freeze({action:'care',memory:'receivedCare',target:'befriend',bonus:45});
export function remembersCare(s,id){
 return !!s.people[id]?.[CARE_RULE.memory] || !!s.history?.some(r=>r.actionId===CARE_RULE.action && r.success && r.dialogue?.[0]?.id===id);
}
export function careBonus(s,id,action){return action===CARE_RULE.target && !s.people[id]?.impressions?.assault && remembersCare(s,id)?CARE_RULE.bonus:0;}
