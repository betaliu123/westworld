import {ABILITY_BALANCE_VERSION} from './ability-check.js';

function keyFor(version,{gatePreview=false,playtest=''}={}){
 const base=gatePreview?'jianghu-gate-preview':'jianghu-echoes';
 // Keep even an entirely stripped test name separate from the player's save.
 const suffix=playtest?'-playtest-'+String(playtest).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40):'';
 return `${base}-v${version}${suffix}`;
}
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export function saveKey(options={}){return keyFor(3,options);}

export function loadCurrentSave(storage,key){
 try{
  const value=JSON.parse(storage.getItem(key));
  return record(value)&&value.version===2&&value.chapterVersion===2&&value.balanceVersion===ABILITY_BALANCE_VERSION&&record(value.player)&&record(value.people)?value:null;
 }catch{return null;}
}

// Presence only: old facts are never parsed, migrated, changed or removed.
export function obsoleteSavePresent(storage,options={}){
 try{
  if([1,2].some(version=>storage.getItem(keyFor(version,options))!==null))return true;
  const key=saveKey(options);
  return storage.getItem(key)!==null&&loadCurrentSave(storage,key)===null;
 }catch{return false;}
}
