import * as T from '../vendor/three.module.js';
import {COURT_CHEST} from './identity-opportunities.js';
const PAPER=0xece3cf,INK=0x4f4b42,OCHRE=0x9c6d3c;
export function buildCourtChest(world,{box}){
 const chest=new T.Group();chest.position.set(12.2,0,-24.1);world.scene.add(chest);
 box(chest,1.25,.12,.72,OCHRE,0,.14,0);
 for(const x of [-.58,.58])box(chest,.09,.52,.72,OCHRE,x,.4,0);
 for(const z of [-.32,.32])box(chest,1.25,.52,.08,OCHRE,0,.4,z);
 const lid=new T.Group();lid.position.set(0,.67,-.36);chest.add(lid);box(lid,1.3,.1,.76,OCHRE,0,0,.36);
 for(const x of [-.45,.45])box(lid,.05,.12,.77,INK,x,0,.36);
 box(chest,.12,.18,.04,INK,0,.53,.39);
 const robe=box(chest,.55,.17,.49,INK,-.27,.32,0),purse=box(chest,.25,.22,.22,OCHRE,.24,.34,.13);
 const medicine=box(chest,.16,.16,.17,PAPER,.2,.31,-.16),paste=box(chest,.14,.13,.16,PAPER,.43,.3,-.16);
 world.registerObject(chest,COURT_CHEST,'六扇门物资箱','wood',140,{kind:'chest',owner:'inspector',x:12.2,z:-24.1,w:1.3,d:.8,y:.45});
 world.obstacles.push({id:COURT_CHEST,x:12.2,z:-24.1,w:1.3,d:.8,sightHeight:.7});
 world.courtChest={chest,lid,slots:{robe,purse,medicine,paste}};
}
export function updateCourtChest(world,s,dt){
 const view=world.courtChest,o=s.ecosystem?.objects[COURT_CHEST];if(!view||!o)return;
 view.chest.visible=o.hp>0;view.lid.rotation.x+=((o.open?-1.7:0)-view.lid.rotation.x)*Math.min(1,dt*10);
 const items=s.ecosystem.items.filter(i=>i.location==='object:'+COURT_CHEST&&i.hp>0);
 for(const [slot,mesh]of Object.entries(view.slots))mesh.visible=items.some(i=>i.chestSlot===slot);
}
