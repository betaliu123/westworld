// APIs used by the original controller on older WeChat JavaScriptCore versions.
if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(i){i=Math.trunc(i)||0;return this[i<0?this.length+i:i];},configurable:true,writable:true});
if(!Array.prototype.findLast)Object.defineProperty(Array.prototype,'findLast',{value:function(fn,ctx){for(let i=this.length-1;i>=0;i--)if(fn.call(ctx,this[i],i,this))return this[i];},configurable:true,writable:true});
if(!Object.fromEntries)Object.fromEntries=entries=>{const out={};for(const [k,v]of entries)Object.defineProperty(out,k,{value:v,enumerable:true,writable:true,configurable:true});return out;};
if(!String.prototype.replaceAll)Object.defineProperty(String.prototype,'replaceAll',{value:function(from,to){return from instanceof RegExp?this.replace(from,to):this.split(from).join(to);},configurable:true,writable:true});
if(!Object.hasOwn)Object.hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
