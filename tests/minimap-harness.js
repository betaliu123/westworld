import {acceptCrimeReport} from '../src/crime-investigation.js';
import {QINGHE_RIVERSIDE} from '../src/locations.js';

export function mountMinimapHarness({getSim,world,environment,dialogue,save}){
 window.__minimapQA={
  arrange(site='south'){
   dialogue.finish(true);environment.close();world.auto=null;world.keys.clear();world.clearReady();world.heroVel?.set(0,0,0);
   for(const id of ['drawer','panel'])document.getElementById(id).hidden=true;
   const s=getSim().s;let [x,z]=({south:[0,40],river:[QINGHE_RIVERSIDE.x,36],town:[0,-14]})[site];
   s.chapter.opened=true;s.time=35;Object.assign(s.player,{x,z,crouched:false,stealing:false,satiety:100,rested:100});
   world.hero.position.set(x,0,z);world.hero.rotation.y=0;world.yaw=0;world.pitch=.5;world.distance=6;
   world.quietUntil=world.t+20;save();
  },
  investigate(){
   const sim=getSim(),c=acceptCrimeReport(sim,{reporter:'gate_merchant',officer:'gate_guard',place:{x:sim.s.player.x+3,z:sim.s.player.z-4},type:'body'});
   c.state='search';c.searchAt=sim.s.npcClock||0;c.nextAsk=1e9;c.playerNoticed=true;return c.id;
  },
  dialogue(){dialogue.play([{id:'fu',text:'宋青禾怎么还没到？她常去西边溪畔，这队人都等了许久了。'}],()=>{},'');},
  save,
  snapshot(){const s=getSim().s;return {player:{x:world.hero.position.x,z:world.hero.position.z,facing:world.hero.rotation.y},savePlayer:{x:s.player.x,z:s.player.z},keys:[...world.keys],crouched:s.player.crouched,saveKeys:Object.keys(localStorage)};}
 };
}
