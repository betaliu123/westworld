// Drop adapter. A configured relay exposes only game AI APIs; voice stays offline.
(() => {
 const base=new URL('./',document.currentScript.src),fetchOriginal=window.fetch.bind(window);
 const offline=new Set(['/api/status','/api/director','/api/reply-intent','/api/voice']);
 const relayValue=document.currentScript.dataset?.aiRelay;
 let relay=null;
 try{if(relayValue){const candidate=new URL(relayValue);if(candidate.protocol==='https:'&&!candidate.username&&!candidate.password&&!candidate.search&&!candidate.hash)relay=candidate;}}catch{}
 window.fetch=(input,init)=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const url=new URL(raw,location.href);
  if(url.origin===location.origin&&offline.has(url.pathname)){
   if(relay&&url.pathname!=='/api/voice'){
    const target=new URL(relay.href.replace(/\/$/,'')+url.pathname);
    const request=input instanceof Request?new Request(target,input):target;
    return fetchOriginal(request,{...init,mode:'cors',credentials:'omit'});
   }
   const status=url.pathname==='/api/status';
   return Promise.resolve(new Response(JSON.stringify(status?{configured:false,static:true}:{error:'Static edition: local rules apply'}),{status:status?200:503,headers:{'Content-Type':'application/json'}}));
  }
  if(url.origin===location.origin&&url.pathname.startsWith('/assets/')){
   const target=new URL(url.pathname.slice(1)+url.search,base);
   return fetchOriginal(input instanceof Request?new Request(target,input):target,init);
  }
  return fetchOriginal(input,init);
 };
})();
