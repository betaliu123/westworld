import {LEDGER_ROUTES} from '../src/ledger-case.js';
import {QINGHE_LINES} from '../src/qinghe-journey-lines.js';
// Offline, bounded v2 recording list. Resolve isolated game states so dialogue
// edits reach the recorder without maintaining a second transcript or save file.
import {pathToFileURL} from 'node:url';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {VOICE_LINES,VOICE_TRIAL} from '../src/voice-lines.js';
import {chapterOptions,chapterResolve,tickChapter} from '../src/chapter.js';
import {chapterSpeech,SPEECH_KEYS} from '../src/chapter-speech.js';
import {answerEcho} from '../src/aftermath-encounters.js';
import {disguiseReplies,equipAppearance} from '../src/appearance.js';
import {eventsFor} from '../src/event-deck.js';
import {resolveConvoyTalk,CONVOY_ENTRY_LINE} from '../src/convoy.js';
import {BEGGAR_NEWS} from '../src/apprenticeship.js';

function fixture(){
 const sim=new Simulation(newArrival(),()=>0),eco=new Ecosystem(sim,[]);
 sim.s.player.money=100;chapterOptions(sim,'beggar');
 return {sim,eco,s:sim.s};
}

export function chapterVoiceCatalog(){
 const rows=new Map();
 function add(actor,text,source){
  if(!text||/^[（(]/.test(text))return;
  if(['hero','player'].includes(actor)){
   for(const gender of ['female','male'])add('player_'+gender,text,source);
   return;
  }
  const key=actor+'\0'+text;
  if(rows.has(key)){const sources=rows.get(key).sources;if(!sources.includes(source))sources.push(source);return;}
  rows.set(key,{actor,text,sources:[source]});
 }
 function dialogue(result,source){
  if(result?.error)throw Error(source+': '+result.error);
  for(const line of result?.dialogue||[])if(!line.thought&&!line.narration)add(line.id,line.text,source);
 }
 function act(g,id,key){
  if(SPEECH_KEYS.has(key)){const b=chapterSpeech(g.s,id,key);add(id,b.text,'src/chapter-speech.js#'+key);Object.assign(g.s.facts,b.facts);g.s.chapter.done[key]=true;return;}
  if(key==='help_mother')g.s.facts.teaFeeKnown=true;
  if(key==='poison_buy')g.s.facts.poisonOfferKnown=true;
  if(key==='qinghe_consent'){g.s.facts.qingheAlternativeDiscussed=true;delete g.s.facts.qingheHesitationKnown;} // Legacy saved agreement, not the new departure decision.
  if(key==='royal_vouch')g.s.facts.royalOfferKnown=true;
  if(key==='royal_task')g.s.chapter.done.royal_task_offer=true;
  if(key==='shen_space')g.s.chapter.done.shen_concern=true;
  if(key==='ledger_get')g.s.chapter.done.ledger_offer=true;
  dialogue(chapterResolve(g.sim,g.eco,id,'ch_'+key),'src/chapter.js#'+key);
 }
 const speechActors={gate_guard:'gate_rules gate_no_papers gate_guarantor',gate_relief:'gate_rules gate_no_papers gate_guarantor',gate_merchant:'merchant_name merchant_guard',relay:'runner_name clothes_price',tea_host:'tea_worry tea_fee tea_daughter tea_coat tea_porter',scribe:'scribe_secret poison_price',traveler:'royal_intro royal_name royal_offer royal_terms entry_story royal_task_offer',qinghe:'qinghe_wish qinghe_boundary list_show qinghe_alternative qinghe_pause',shen:'shen_concern',su:'su_wish su_boundary',fu:'fu_manifest',prisoner:'ledger_story ledger_where ledger_offer ledger_who',tea:'herb_offer grind_offer'};
 for(const [key,text]of Object.entries(QINGHE_LINES))add(key.endsWith('_player')?'player':['handoff_fu','forced_handoff_fu','return_fu'].includes(key)?'fu':key.startsWith('mother_')||key==='goodbye_mother'?'tea_host':'qinghe',text,'src/qinghe-journey-lines.js#'+key);
 for(const [id,keys]of Object.entries(speechActors))for(const key of keys.split(' ')){const g=fixture();act(g,id,key);}
 for(const where of ['player','ground']){const g=fixture(),ledger=g.eco.items('npc:prisoner').find(i=>i.type==='ledger');g.eco.transfer(ledger,where,where==='player'?'entrusted':'dropped');act(g,'prisoner','ledger_where');}
 const owed=fixture();owed.s.people.tea.rescueDebts=[{subject:'player',paid:false,cause:'voice-fixture'}];act(owed,'tea','grind_offer');
 for(const news of BEGGAR_NEWS)add('beggar',news.line,'src/apprenticeship.js#BEGGAR_NEWS:'+news.id);
 for(const [id,key,facts]of [['traveler','royal_offer',{royalKindnessSource:'care'}],['traveler','entry_story',{entryRoute:'royal'}],['tea_host','tea_daughter',{qingheWishShared:true}]]){const g=fixture();Object.assign(g.s.facts,facts);act(g,id,key);}
 add('traveler','这位是与我同行的人，来历由我作保。关上若要问，就由我来说明。','src/main.js#royalGuaranteeReady');
 for(const id of ['gate_guard','gate_relief'])add(id,'既然你亲自到关前作保，这份担保我记下了。请过关吧。','src/main.js#royalGuaranteeReady');
 for(const route of Object.values(LEDGER_ROUTES))for(const id of route.recipients){add(id,route.offer,'src/ledger-case.js#offer');add(id,route.received,'src/ledger-case.js#received');}
 for(const variant of ['held','worn']){const g=fixture();g.s.player.inventory.push('旧差役服');if(variant==='worn')g.s.player.disguise='runner';act(g,'tea_host','tea_coat');}
 // Put the protagonist first so a deliberately small later batch includes both voices.
 for(const key of ['convoyStrength','convoyCharm','convoyPayment'])add('player',VOICE_LINES[key],'src/voice-lines.js#'+key);
 add('porter',VOICE_LINES.convoyStrengthReply,'src/voice-lines.js#convoyStrengthReply');
 for(const [template,answer]of [['thanks_letter','accept'],['grudge','apologize'],['grudge','argue'],['rumor_spread','argue']]){
  for(const id of ['traveler','tea_host','gate_guard','su','qing','beggar']){
   const g=fixture();
   g.s.deck={echoes:[{id:'voice',who:id,subject:'player',due:1,template,cause:'voice-fixture'}]};
   dialogue(answerEcho(g.sim,'voice',answer),'src/aftermath-encounters.js#'+template+':'+answer);
  }
 }
 const disguise=fixture();
 for(const hp of [100,20])for(const sickUntil of [0,10]){
  Object.assign(disguise.s.player,{hp,sickUntil});
  for(const r of disguiseReplies(disguise.s,'gate_guard'))add('player',r.text,'src/appearance.js#disguiseReplies');
 }
 for(const row of VOICE_TRIAL)add(row.actor,row.text,'src/voice-lines.js#VOICE_TRIAL');
 const openingState=fixture();
 openingState.sim.listeners.push((type,lines)=>{if(type==='speech')for(const line of lines)add(line.id,line.text,'src/chapter.js#tickChapter');});
 tickChapter(openingState.sim,4);
 // No old ribbon/proposal openings, ending narration, logs or menu labels.
 for(const [id,key]of [['fu','fu_manifest'],['beggar','nest_welcome'],['gate_guard','gate_rules'],['gate_relief','gate_rules'],['gate_merchant','merchant_name'],['relay','runner_name'],['tea_host','help_mother'],['qinghe','qinghe_wish']])act(fixture(),id,key);
 const scribe=fixture();scribe.s.facts.scribeIdentity=true;act(scribe,'scribe','scribe_secret');act(scribe,'scribe','poison_buy');
 const qinghe=fixture();act(qinghe,'qinghe','qinghe_wish');
 qinghe.eco.create('押运名册','document','player',{storyId:'convoy-list'});
 act(qinghe,'qinghe','list_show');act(qinghe,'qinghe','qinghe_consent');
 const royal=fixture();royal.s.facts.royalSawKindness=true;act(royal,'traveler','royal_vouch');royal.s.facts.enteredCity=true;
 act(royal,'traveler','entry_story');act(royal,'traveler','entry_truth');act(royal,'traveler','royal_task');
 for(const route of ['river','breach']){const g=fixture();g.s.facts.enteredCity=true;g.s.facts.entryRoute=route;act(g,'traveler','entry_story');act(g,'traveler','entry_truth');}
 for(const rng of [0,.99]){
  const g=fixture();g.s.facts.enteredCity=true;g.sim.rng=()=>rng;
  act(g,'traveler','entry_story');act(g,'traveler','entry_lie');
 }
 for(const id of ['prisoner','shen','su','qing','chi']){
  const g=fixture();g.s.facts.enteredCity=true;
  const keys={prisoner:['ledger_story','ledger_get'],shen:['shen_space'],su:['su_wish'],qing:['convoy_dispute','convoy_peace'],chi:['convoy_dispute','convoy_peace']}[id];
  for(const key of keys)act(g,id,key);
 }
 const thief=fixture();thief.s.facts.publicWarrant=true;act(thief,'thief','yan_secret');act(thief,'thief','yan_release');
 for(const [action,rng]of [['work',0],['bribe',0],['charm',0],['charm',.99],['strength',0],['strength',.99]]){
  const g=fixture();g.s.player.x=5;g.s.player.z=31;g.sim.rng=()=>rng;
  if(action==='charm'){
   const coat=g.eco.items('npc:qinghe').find(i=>i.type==='clothing');
   g.eco.transfer(coat,'player','found');equipAppearance(g.sim,coat.id,'body');
  }
  if(action!=='work')resolveConvoyTalk(g.sim,g.eco,'ch_convoy_work');
  const physical=action==='strength'?{roll:rng?100:1,success:!rng,check:{chance:50}}:null;
  dialogue(resolveConvoyTalk(g.sim,g.eco,'ch_convoy_'+action,physical),'src/convoy.js#'+action+':'+rng);
 }
 add('porter',CONVOY_ENTRY_LINE,'src/convoy.js#CONVOY_ENTRY_LINE');
 for(const event of eventsFor(newArrival()))for(const [actor,text]of Object.entries(event.lines||{}))add(actor,text,'src/event-deck.js#'+event.id);
 return [...rows.values()];
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(chapterVoiceCatalog()));
