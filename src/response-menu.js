import {responsePage} from './contextual-responses.js';

// Browsing a topic stays in the exploration view and calls no resolver.
export function chooseResponses(dialogue,{getOptions,...config}){
 const route=[];
 function show(){
  let entries=getOptions();
  for(const id of route){const item=entries.find(e=>e.action.id===id);if(!item?.action.children){route.length=0;entries=getOptions();break;}entries=item.action.children;entries=responsePage(entries);}
  dialogue.choose({...config,options:responsePage(entries),onBack:route.length?()=>{route.pop();show();}:null,onSelect:a=>{
   if(a.children){route.push(a.id);show();}else config.onSelect(a);
  }});
 }
 show();
}
