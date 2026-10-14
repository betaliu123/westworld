export const MATERIALS={wood:{name:'木材',physical:1,fire:2.5,burns:true},paper:{name:'纸布',physical:1.4,fire:4,burns:true},stone:{name:'砖石',physical:.55,fire:.08,burns:false},metal:{name:'金属',physical:.4,fire:.15,burns:false},food:{name:'食物',physical:2,fire:3,burns:true}};
export function surfacePoint(o,p){return {x:Math.max(o.x-(o.w||0)/2,Math.min(o.x+(o.w||0)/2,p.x)),z:Math.max(o.z-(o.d||0)/2,Math.min(o.z+(o.d||0)/2,p.z))};}
export function objectDistance(o,p){const q=surfacePoint(o,p);return Math.hypot(q.x-p.x,q.z-p.z);}
export function damageAmount(material,type,power){return power*(MATERIALS[material]||MATERIALS.wood)[type==='fire'?'fire':'physical'];}
