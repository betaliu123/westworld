// World-space contracts shared by the model, renderer and interaction UI.
export const OBJECT_ACTIONS={g_crouch:'cargo-cover',g_steal:'merchant-pass',g_pocket:'merchant-pass',g_buy:'runner-clothes',g_lift:'runner-clothes',g_rewrite:'scribe-table'};
export const OBJECTS={
 'cargo-cover':{name:'货筐',point:[4.4,25.5],stand:[4.4,26.8],height:1.95,actions:['g_crouch']},
 'merchant-pass':{name:'商人腰间的路引',point:[4.4,24],stand:[5.9,24.5],height:1.25,actions:['g_steal','g_pocket']},
 'runner-clothes':{name:'晾着的差役服',point:[-11,24.5],stand:[-11,25.5],height:1.6,actions:['g_buy','g_lift']},
 'scribe-table':{name:'刻字台上的路引',point:[11,24.5],stand:[11,25.55],height:1.1,actions:['g_rewrite']}
};
export function physicalReady(player,id){const obj=OBJECTS[OBJECT_ACTIONS[id]];if(!obj)return true;return Math.hypot(player.x-obj.stand[0],player.z-obj.stand[1])<1.1&&(id!=='g_pocket'||player.crouched===true);}
