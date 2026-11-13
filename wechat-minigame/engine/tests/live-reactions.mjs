import {Simulation,newGame} from '../src/simulation.js';
import {writeFile} from 'node:fs/promises';
const cases=[['bet',0,30,'你曾帮我劝退起哄的人。'],['bet',.99,-20,'你之前当众嘲笑我的选择。'],['music',0,10,'你曾请街坊喝茶。'],['steal',0,0,'']];
const report=[];
for(const [action,roll,relation,memory]of cases){
 const sim=new Simulation(newGame(),()=>roll);sim.s.people.su.relation=relation;if(memory)sim.s.people.su.memories.push(memory);
 const r=sim.resolve(1,action),start=Date.now();
 const response=await fetch('http://127.0.0.1:8091/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r.reactionContext),signal:AbortSignal.timeout(25000)});
 const output=await response.json(),accepted=response.ok&&sim.applyReaction(r.reactionId,output);
 report.push({fixture:true,action,success:r.success,accepted,ms:Date.now()-start,money:sim.s.player.money,next:sim.s.pending.type,dialogue:r.dialogue,reason:sim.s.pending.directorReason,error:response.ok?undefined:output});
 console.log(JSON.stringify(report.at(-1)));
 if(!accepted)process.exitCode=1;
}
await writeFile(new URL('../reaction-smoke-results.json',import.meta.url),JSON.stringify(report,null,2));
