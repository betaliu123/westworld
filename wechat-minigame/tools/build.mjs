import {build} from 'esbuild';
import {readFile,writeFile,mkdir,readdir,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {TITLE_OUTLINES} from '../runtime/title-outlines.js';
const root=process.cwd();
if(createHash('sha256').update(await readFile('resources/fonts/zhimangxing.woff2')).digest('hex')!==TITLE_OUTLINES.sha256)throw Error('Title font changed: run python tools/build-title-outlines.py before building');
await mkdir('dist',{recursive:true});await mkdir('packages/resources',{recursive:true});
const map={};let total=0;
async function gzipSmallest(data,out){const variants=[gzipSync(data,{level:9}),gzipSync(data,{level:9,memLevel:9,strategy:1})];try{const cached=await readFile(out);if(gunzipSync(cached).equals(data))variants.push(cached);}catch{}return variants.sort((a,b)=>a.length-b.length)[0];}
async function add(dir,prefix){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name),key=prefix+'/'+e.name;if(e.isDirectory())await add(file,key);else if(!e.name.endsWith('.css')&&!e.name.endsWith('.woff2')){const data=await readFile(file);const gz=/\.(json|glb|ttf)$/.test(file);const out='packages/resources/'+key+(gz?'.gz':'');await mkdir(path.dirname(out),{recursive:true});const bytes=gz?await gzipSmallest(data,out):data;await writeFile(out,bytes);map[key]={path:out,gzip:gz};total+=bytes.length;}}}
await mkdir('packages/resources',{recursive:true});
await add('engine/src/models','src/models');await add('engine/src/art','src/art');
// Assets are vendored at migration time; builds use only this repository.
await add('resources','assets');
await writeFile('runtime/asset-map.json',JSON.stringify(map));
await writeFile('packages/resources/game.js','// Resource-only subpackage.\n');
const html=await readFile('engine/index.html','utf8');await writeFile('runtime/page.js','export default '+JSON.stringify(html.replace(/<script[\s\S]*?<\/script>/g,''))+';');
await build({entryPoints:['runtime/entry.js'],bundle:true,format:'iife',platform:'browser',inject:['runtime/base64.js'],target:'es2017',outfile:'dist/game.js',minify:true,legalComments:'eof',plugins:[{name:'asset-url',setup(b){b.onLoad({filter:/\.js$/},async args=>{if(!args.path.replaceAll('\\','/').includes('/engine/'))return;let s=await readFile(args.path,'utf8');s=s.replaceAll('import.meta.url',JSON.stringify('https://game.local/'+path.relative(path.join(root,'engine'),args.path).replaceAll('\\','/')));s='const globalThis=GameGlobal.__jianghuPlatform.env; const {performance,requestAnimationFrame,cancelAnimationFrame,innerWidth,innerHeight,devicePixelRatio,document,window,self,navigator,location,localStorage,sessionStorage,fetch,URL,URLSearchParams,Request,Headers,Blob,TextDecoder,TextEncoder,MutationObserver,DOMParser,HTMLElement,HTMLCanvasElement,HTMLImageElement,Event,CustomEvent,CSS,getComputedStyle,matchMedia}=GameGlobal.__jianghuPlatform.env;\n'+s;return {contents:s,loader:'js'};});}}]});
const main=(await stat('dist/game.js')).size;await writeFile('dist/build-report.json',JSON.stringify({mainBytes:main,resourceBytes:total,files:Object.keys(map).length},null,2));
if(main>4*1024*1024)throw Error('Main bundle exceeds 4 MB');
console.log(JSON.stringify({mainMB:(main/1048576).toFixed(2),resourcesMB:(total/1048576).toFixed(2),files:Object.keys(map).length}));
